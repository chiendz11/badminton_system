# Identity Service (`services/identity`) — Đặc tả & Hướng dẫn Triển khai Đồng bộ

| Thuộc tính | Giá trị |
| :--- | :--- |
| **DRI / Owner** | Người 4 — Identity · Commerce · Content |
| **Thư mục runtime chính thức** | [`services/identity/`](../../services/identity/README.md) *(Lưu ý: `services/identity-service/` là thư mục skeleton thiết kế W5, không deploy)* |
| **Package / CI Component** | `@badminton/identity` (`identity_service` trong `.github/ci/components.yml`) |
| **Port / DB** | Port runtime `8084` (`3002` trên OpenAPI proposal) · **PostgreSQL 16 + Prisma (`identity` DB)** |
| **Contract & ADR** | [contracts/identity/openapi.json](../../contracts/identity/openapi.json) · [ADR-006](../week-5/adr/ADR-006.md) |
| **Trạng thái hiện tại** | **Implemented & Live** phần Self-serve Auth + Mailpit + Cookie Refresh; còn phần **Admin User/Manager APIs (`proposed`)** |

---

## 1. Phạm vi & Trách nhiệm Dữ liệu

`services/identity` là **Nguồn sự thật duy nhất (SSOT)** về tài khoản, mật khẩu, xác thực email, vai trò (`user`, `center_manager`, `super_admin`), phiên đăng nhập (`Session`) và chuỗi xoay vòng `RefreshToken`.

- **Không ai được sửa DB `identity` trực tiếp ngoài `services/identity`.**
- Các service khác (`api-gateway`, `booking-core`, `ai-service`, `content-service`, `commerce-service`, `social-service`, `notification-service`) chỉ xác minh JWT (`iss=badminton-identity`, `aud=badminton-system`, `HS256`) hoặc gọi `/internal/identity/...`.
- **Mô hình Prisma hiện có ([schema.prisma](../../services/identity/prisma/schema.prisma)):**
  - `User` (`id` UUID, `email` unique, `passwordHash`, `role` enum `user|center_manager|super_admin`, `isActive`, `isVerified`)
  - `Profile` (`userId` PK/FK, `name`, `phone`)
  - `EmailVerificationToken` (`tokenHash` SHA-256 `Char(64)`, `expiresAt`, `consumedAt`)
  - `Session` (`id`, `userId`, `expiresAt`, `revokedAt`)
  - `RefreshToken` (`tokenHash` SHA-256 `Char(64)`, `sessionId`, `expiresAt`, `consumedAt`)

---

## 2. API Endpoints & Trạng thái

### Đã hoàn thiện & đang chạy (`implemented`)
| Endpoint native | Qua Gateway | Bảo mật & Quy tắc bắt buộc |
| :--- | :--- | :--- |
| `POST /api/auth/register` | `POST /api/auth/register` | Validate email, `username` (`3..80`), mật khẩu `12..72B` đủ hoa/thường/số/ký tự đặc biệt, không khoảng trắng. Rate limit 10 req/15p. Gửi link `WEB_APP_URL/verify-email?token=...` qua Mailpit SMTP. |
| `POST /api/auth/verify-email` | `POST /api/auth/verify-email` | So SHA-256 `tokenHash`, đánh dấu `consumedAt` & `User.isVerified = true` trong 1 TX. |
| `POST /api/auth/resend-verification` | `POST /api/auth/resend-verification` | Có rate-limit + cooldown, không lộ email đã tồn tại hay chưa. |
| `POST /api/auth/login` | `POST /api/auth/login` | Từ chối nếu `!isVerified` hoặc `!isActive`. Trả `accessToken` JWT (15p) + set cookie `refresh_token` (`HttpOnly; SameSite=Lax; Path=/api/auth`, `Secure` theo `COOKIE_SECURE`). |
| `POST /api/auth/refresh` | `POST /api/auth/refresh` | Xoay vòng refresh token 1-lần; phát hiện reuse → thu hồi toàn bộ `Session`. |
| `POST /api/auth/logout` | `POST /api/auth/logout` | Thu hồi session & xóa cookie `refresh_token` (idempotent). |
| `GET /api/auth/me` | `GET /api/auth/me` | Yêu cầu Bearer JWT hợp lệ. |
| `GET /health`, `GET /health/ready` | Internal only | `/health/ready` kiểm tra DB (`503` an toàn, không lộ DB URL). |

### Cần làm thêm để hoàn chỉnh (`proposed` trong OpenAPI & BRD V2.0)
| Endpoint cần thêm | Quyền & Yêu cầu nghiệp vụ |
| :--- | :--- |
| `PATCH /api/v1/me` (`/api/identity/me`) | User tự cập nhật `name`, `phone` trong `Profile`. **Cấm tuyệt đối** nhận `role`, `isActive`, `isVerified` trong body (whitelist DTO). |
| `GET /api/v1/users` | Chỉ **`super_admin`**: lọc danh sách theo `role` (`center_manager`, `user`), `isActive`, tìm theo email/tên (phục vụ Admin chọn gán `managerId` ở `UC-06`). |
| `PATCH /api/v1/users/{userId}/status` | Chỉ **`super_admin`**: khóa/mở khóa tài khoản vi phạm/bot (`isActive: false`, `AD-11`). Khi khóa bắt buộc **revoke tất cả `Session` chưa hết hạn** của user đó và phát `identity.user-updated.v1`. |
| `PUT /api/v1/users/{userId}/role` | Chỉ **`super_admin`**: đổi vai trò kèm audit lý do, chặn tự nâng quyền hoặc hạ quyền chính mình (`self privilege escalation`). |
| `PUT /api/v1/center-assignments` | Chỉ **`super_admin`**: xác minh user tồn tại + đúng role `center_manager`, ghi nhận phân công trung tâm. |
| `GET /internal/identity/users/{userId}` | **Internal only** (không expose qua public ingress): bảo vệ bằng `INTERNAL_SERVICE_TOKEN` hoặc service credential cho Gateway/Core/Social/AI tra cứu. |

---

## 3. Biến Môi trường & Bảo mật Bắt buộc

| Biến môi trường | Yêu cầu đồng bộ với Hạ tầng (`k3d` / EKS) |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL URI tới DB `identity` (có `connect_timeout=3&pool_timeout=3`). |
| `JWT_SECRET` | **>= 32 ký tự**, khi `NODE_ENV=production` **bắt buộc không chứa** `local-development` hoặc `change-me` (lấy từ ESO / `identity-service-secrets`). |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Cố định mặc định `badminton-identity` / `badminton-system` khớp toàn bộ verifier. |
| `COOKIE_SECURE` & `TRUST_PROXY` | Khi sau TLS Ingress (`*.badminton.local` / ALB): **`COOKIE_SECURE=true`**, **`TRUST_PROXY=1`** để Express đọc `X-Forwarded-Proto` & `X-Forwarded-For`. |
| `MAILPIT_URL` & `EMAIL_VERIFICATION_PAGE_URL` | Local trỏ tới `http://mailpit:8025` (hoặc SMTP) và `https://web.badminton.local/verify-email` (không nhúng credential trong URL). |
| `METRICS_TOKEN` | Bắt buộc dùng constant-time check (`timingSafeEqual`) khi bổ sung `/metrics`. |

---

## 4. Quy chuẩn Test, Build & Triển khai (CI Gate)

- **Scripts `package.json` bắt buộc:** `lint`, `typecheck`, `test:unit`, `test:contract`, `test:integration`, `build`, `prisma:validate`, `prisma:generate`, `prisma:migrate:deploy`.
- **Migration Docker:** Stage `migrate` trong `services/identity/Dockerfile` chạy thành image riêng `ghcr.io/chiendz11/badminton-identity-service-migrations` làm **Argo CD `PreSync` Job** (`identity-service-migrate`). Mọi thay đổi Prisma schema phải kèm migration file trong `services/identity/prisma/migrations/`.
- **Negative tests cần giữ xanh:** Sai/thiếu token (`401`), account chưa verify/bị khóa bị từ chối login/refresh, reuse refresh token thu hồi cả session, `super_admin` không thể bị tự gán qua `PATCH /me`.
