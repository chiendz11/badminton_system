# 2. Kỹ nghệ Yêu cầu, Phân tích Tải & Phân quyền (Requirements Engineering & Security)

> Tài liệu đặc tả đầy đủ: **Danh mục Use Case (`UC`) → Yêu cầu chức năng (`FR`) & Tiêu chí nghiệm thu `Given/When/Then` (`AC`) → Yêu cầu phi chức năng đo được (`NFR`) → 9 Yêu cầu bảo mật bắt buộc (`SEC1..SEC9`) → Phân tích tải (`Workload`) → Ma trận phân quyền (`RBAC/ABAC`) → Chuỗi truy vết khép kín**.

---

## 2.1. Danh mục Use Case Tổng thể (`UC-01..UC-08`)

| Mã UC | Tên Use Case | Tác nhân chính | Nhóm chức năng | Ưu tiên | Vấn đề / Quy tắc liên quan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **UC-01** | Tìm kiếm trung tâm, xem lịch trống & đặt sân trực tiếp | `anonymous`, `user` | Đặt sân lõi | **P0** | `PB-01`, `PB-02`, `BR-01..12` |
| **UC-02** | Xem lịch cá nhân, hủy giữ chỗ `HELD` & khóa hủy `CONFIRMED` (`403`) | `user`, `center_manager`, `super_admin` | Quản lý đơn & Pass | **P0** | `PB-03`, `BR-13`, `BR-14` |
| **UC-03** | Tạo lịch cố định nhiều ngày (Recurring Series 1–60 ngày atomic) | `center_manager`, `super_admin` | Vận hành trung tâm | **P1** | `PB-02`, `BR-15` |
| **UC-04** | Tìm kiếm & đặt sân hội thoại qua Trợ lý AI (LangGraph + Consent) | `user` (Authenticated) | Trợ lý AI | **P1** | `PB-04`, `BR-01,02,17..21` |
| **UC-05** | Center Manager tự cấu hình cơ sở (`DRAFT -> Active`), bảng giá & bảo trì sân | `center_manager` | Self-serve Setup | **P0** | `PB-05`, `PB-06`, `BR-05,08,16` |
| **UC-06** | Super Admin onboarding đối tác, hợp đồng SaaS & điều chuyển `managerId` | `super_admin` | Quản trị SaaS | **P0** | `PB-05`, `PB-06`, `BR-16` |
| **UC-07** | Đề xuất, phê duyệt và đăng tải Sự kiện / Giải đấu CLB toàn sàn | `center_manager`, `super_admin` | Truyền thông (`content-service`) | **P2** | `PB-06` |
| **UC-08** | Đăng ký/Xác thực Email (`Mailpit`), Session Cookie `Secure`, Kiểm duyệt & Thông báo | Tất cả Actor | Định danh & Tuân thủ | **P0/P1** | `PB-05`, `PB-06`, `GAP-01` |

---

## 2.2. Yêu cầu Chức năng (`FR`) & Tiêu chí Nghiệm thu (`AC` Given/When/Then)

### Nhóm Khách hàng (`FR-U01..FR-U10`) & Đặt sân Lõi (`booking-core`)

- **FR-U01..U06 — Tra cứu, Báo giá Core SSOT, Giữ chỗ `HELD`, Self-Cancel & Idempotency:**
  - **AC-01 (Công khai không lộ PII):**
    - *Given* khách chưa đăng nhập (`anonymous`) truy cập danh mục trung tâm và lịch trống ngày `D`.
    - *When* gọi `GET /api/centers`, `POST /graphql`, `GET /api/booking/availability`.
    - *Then* trả thông tin trung tâm/sân/giá và trạng thái slot (`AVAILABLE/RESERVED/BOOKED`) nhưng **không lộ** `userId`, email hay SĐT người đã đặt.
  - **AC-02 (Báo giá tin cậy & Giữ chỗ 60 phút):**
    - *Given* khách (`user`) chọn 2 slot liên tiếp `19:00–21:00` tại sân còn trống.
    - *When* gửi yêu cầu giữ chỗ & xác nhận kèm `Idempotency-Key`.
    - *Then* Core tự tính `basePrice`, `discountAmount`, `totalPrice` bằng VND nguyên, tạo đúng `2` bản ghi `SlotAllocation`, `1` `Reservation(CONFIRMED)`, `1` `Booking(CONFIRMED)` và `1` `OutboxEvent`.
  - **AC-03 (Chống Race Condition — `BR-10`):**
    - *Given* `20` request đồng thời cùng mili-giây nhắm tới cùng `(courtId, startsAt, endsAt)`.
    - *When* các transaction cùng đi tới PostgreSQL `BookingCore`.
    - *Then* **đúng `1` request thành công (`201 Created`)**, `19` request còn lại bị constraint `slot_no_overlap` từ chối với **`409 Conflict`**.
  - **AC-04 (Hết hạn giữ chỗ `HELD` — `BR-09`):**
    - *Given* giữ chỗ `HELD` đã quá `expiresAt` (mặc định `300s`, cấu hình `30–900s`, bị cắt tại giờ bắt đầu slot).
    - *When* user thử confirm hoặc tiến trình dọn dẹp chạy.
    - *Then* confirm bị từ chối, status chuyển `EXPIRED`, `SlotAllocation` được giải phóng cho người khác đặt lại.
  - **AC-05 (Idempotency — `BR-11, BR-12`):**
    - *Given* user đã tạo giữ chỗ thành công với khóa `K` và payload fingerprint `F1`.
    - *When* user gửi lại đúng `(K, F1)` trả về kết quả cũ; khi gửi `(K, F2)` với nội dung khác `F2 != F1` bị từ chối **`409`/`422`**.
  - **AC-06 (Khóa hủy `CONFIRMED` & Self-Cancel `HELD` — `BR-13, BR-14`):**
    - *Given* user có giữ chỗ `HELD` và booking `CONFIRMED`.
    - *When* gọi `DELETE /api/v1/reservations/:id` trên `HELD` → trả `200/204` và giải phóng slot ngay; khi **bất kỳ vai trò nào** (`user`, `center_manager`, `super_admin`) gọi hủy booking `CONFIRMED` → nhận **`HTTP 403 Forbidden`** kèm hướng dẫn chuyển sang Chợ Pass Sân.

### Nhóm Quản lý Trung tâm & Siêu quản trị (`FR-M01..M09`, `FR-A01..A09`)

- **AC-08 (Cô lập cơ sở `managerId`):**
  - *Given* `center_manager` sở hữu cơ sở `A`, không sở hữu cơ sở `B`.
  - *When* gọi `PATCH /centers/B` hoặc tạo chuỗi lịch cố định tại `B`.
  - *Then* Booking Core thực thi `assertCenterManager` trả **`HTTP 403 Forbidden`**; thử tự thay đổi `managerId` bị từ chối `403`.
- **AC-09 (Chuỗi lịch cố định atomic 1–60 ngày — `BR-15`):**
  - *Given* `center_manager` gửi yêu cầu tạo chuỗi `10` ngày, trong đó ngày thứ `7` bị trùng slot.
  - *When* `BookingSeries` thực thi trong cùng Prisma `$transaction`.
  - *Then* toàn bộ `10` ngày bị **rollback sạch** (0 booking được tạo), trả mã lỗi xung đột chỉ rõ ngày trùng.
- **AC-10 (Bảo toàn Price Snapshot & Blocking đóng sân tương lai — `BR-08, BR-16`):**
  - *Given* đang có giữ chỗ/booking tương lai còn hiệu lực tại Sân 1.
  - *When* quản lý cập nhật bảng giá → giữ nguyên giá đã chốt của đơn cũ; khi quản lý đặt `Court.isActive = false` → Core từ chối **`HTTP 409 Conflict`**.
- **AC-19, AC-20 (Onboarding 2 bước & Vòng đời SaaS):**
  - *Given* `super_admin` tạo vỏ cơ sở `DRAFT` (`isActive=false`) và gán `managerId`.
  - *When* `center_manager` cập nhật đủ profile/sân/giá và bật mở bán `isActive=true` → web hiển thị ngay; khi `super_admin` tạm dừng cơ sở hết hạn hợp đồng (`isActive=false`) → mọi giữ chỗ mới bị chặn.

### Nhóm Trợ lý AI (`FR-U10` / `UC-04`)

- **AC-11, AC-12 (Ràng buộc slot 60p & không tự nới điều kiện — `BR-01,02,17..19`):**
  - *Given* khách yêu cầu *"Tối mai 19:30 chơi 90 phút, tổng dưới 300k"*.
  - *When* LangGraph node `parse` & `clarify` xử lý.
  - *Then* AI **không tự làm tròn**, hỏi lại chọn khung giờ tròn (`19:00`/`20:00`) và bội số `60` phút; khi đặt "2 tiếng" bắt buộc `2` slot liên tiếp **cùng 1 sân**.
- **AC-13, AC-14, AC-15 (Explicit Consent, Revalidation & Recovery — `BR-20,21`):**
  - *Given* AI đề xuất tối đa `5` phương án; khách mới dừng ở bước chọn phương án (`select`) hoặc điều kiện/giá vừa đổi.
  - *When* chưa có xác nhận cuối (`confirm`) hợp lệ với `constraints_version` hiện hành.
  - *Then* AI không được gọi Core giữ/đặt; khi tải lại trang có thể khôi phục hội thoại từ checkpoint PostgreSQL (`AsyncPostgresSaver`).

### Nhóm Identity, Email Verification & TLS Session (`services/identity` — Post-PR #32)

- **AC-22 (Đăng ký & Xác thực Email qua Mailpit):**
  - *Given* người dùng mới đăng ký tài khoản qua `POST /api/auth/register`.
  - *When* `services/identity` tạo `User(isVerified=false)` và `EmailVerificationToken` (lưu SHA-256 `tokenHash`, không lưu raw token).
  - *Then* gửi email chứa link `WEB_APP_URL/verify-email?token=...` qua SMTP tới `Mailpit` (`https://mailpit.badminton.local`); sau khi verify thành công `isVerified=true` mới cho đăng nhập.
- **AC-23 (Single-Flight Refresh & Cookie `Secure; HttpOnly` qua TLS Ingress):**
  - *Given* trình duyệt truy cập đồng loạt Web/Admin trên `https://web.badminton.local` / `https://admin.badminton.local` gọi API Gateway `https://api.badminton.local`.
  - *When* người dùng đăng nhập qua `POST /api/auth/login` hoặc refresh token hết hạn.
  - *Then* cookie `refreshToken` mang cờ `HttpOnly; SameSite=Lax; Secure` (khi `COOKIE_SECURE=true` sau TLS Ingress có `TRUST_PROXY=1`); mọi request refresh song song trên frontend gộp vào đúng 1 Promise single-flight, chống false-positive reuse revocation.

---

## 2.3. Yêu cầu Phi chức năng Đo được (`NFR` — 8 Nhóm + `SEC1..SEC9`)

### Bảng NFR Tổng hợp (Performance, Concurrency, Availability, AI, Observability, DevOps, Cost)

| Mã NFR | Nhóm | Chỉ số / Ngưỡng mục tiêu | Cách đo & Trạng thái kiểm chứng |
| :--- | :--- | :--- | :--- |
| **NFR-P1** | Hiệu năng | Tìm lịch trống `/availability`: p95 thấp với index `(centerId, date, status)` & `(courtId, startsAt)` | Schema index đã cài; cần bài đo tải k6 UAT chính thức (`GAP-06`) |
| **NFR-P2** | Hiệu năng & ACID | Đặt chỗ/Confirm dưới contention: `0%` double booking ở `20+` req đồng thời; lỗi `5xx < 0.1%` | **Đã đo:** 19/19 Vitest concurrency tests pass (`Booking Core`) |
| **NFR-P3** | AI Timeout | Gọi Core từ AI có `core_timeout_seconds` hữu hạn, circuit/fallback lỗi rõ ràng bằng tiếng Việt | Đã cài đặt trong `core_client.py` + `workflow.py` (`GAP-04` cho p95 LLM thật) |
| **NFR-A1** | Cô lập lỗi (Graceful Degradation) | Khi `ai-service` lỗi/down, toàn bộ luồng đặt sân trực tiếp (`Web -> Gateway -> Core`) hoạt động 100% | Đã tách container/deployment & Pod độc lập |
| **NFR-A2** | Chịu lỗi & Idempotency | Retry cùng `Idempotency-Key` không tạo đơn trùng; Outbox lưu đồng thời với transaction booking | `Reservation`/`BookingSeries` unique index + bảng `OutboxEvent` |
| **NFR-A3** | Khôi phục & Migration an toàn | Database schema migration chạy dạng **Argo CD `PreSync` Job** (`booking-core-migrate`, `identity-service-migrate`) với lock timeout hữu hạn trước khi rollout Pod mới | **Đã triển khai & xác minh** trên `k3d-badminton-local` (Post-PR #32); Backup drill Cloud theo [runbooks](../devops/runbooks/README.md) |
| **NFR-AI1** | Chất lượng AI Schema & Ràng buộc | `schema_validity = 1.0`, `constraint_f1 >= 0.90`, `critical_field_accuracy >= 0.95` | **Tự động chặn trên CI:** `.github/ci/components.yml` + `check_golden_report.py` |
| **NFR-AI2** | An toàn AI (Anti-Hallucination write) | `0` hành động ghi booking khi thiếu consent hợp lệ hoặc sai `constraints_version`; không tự làm tròn slot 60p | **Đã kiểm thử** qua `workflow.py` + AI pytest suite |
| **NFR-O1** | Observability | 100% HTTP response gắn `X-Request-Id`; structured JSON logs (`stdout`); `/health/live`, `/health/ready`, `/metrics` chuẩn Prometheus | Đã triển khai ở Core, Gateway, Identity, AI; `monitoring/chart` + `prometheus-0` + `grafana-0` |
| **NFR-D1** | CI/CD Gate & Supply Chain | `23/23` CI checks xanh trước merge; `0 Critical/High` CVEs với Trivy & Semgrep; Helm/Promtool/Contract checks | **Tự động 100%** trên GitHub Actions (`ci.yml` + `publish-and-deploy.yml`) |
| **NFR-D2** | Portability & GitOps Parity | Cùng 1 bộ manifests/workflow kiến trúc chạy trên `AWS EKS (Terraform)` và `k3d-badminton-local` | **Đạt Parity** (TLS CA/ACM, Ingress NGINX/ALB, LocalStack ESO/AWS Secrets Manager, Mailpit/SMTP) |

### Chín Yêu cầu Bảo mật Bắt buộc (`SEC1..SEC9`)

| Mã | Nguyên tắc bảo mật | Cơ chế thực thi trong Badminton Manager V2 |
| :--- | :--- | :--- |
| **SEC1 — Xác thực & Session** | JWT chuẩn (`iss=badminton-identity`, `aud=badminton-system`) xác minh bởi Identity/Gateway/Core; Refresh Token rotation lưu `SHA-256` hash trong DB; Cookie `HttpOnly; SameSite=Lax; Secure` | `services/identity` (`Session`, `RefreshToken`, `EmailVerificationToken`), `apps/web` & `apps/admin` single-flight refresh |
| **SEC2 — Phân quyền mặc định từ chối** | Fail-closed RBAC (`user`, `center_manager`, `super_admin`) + ABAC sở hữu (`managerId` / `userId`); không tin role/identity từ browser | Gateway `authenticate.middleware.ts` + Booking Core Guards & `assertCenterManager` |
| **SEC3 — Mã hóa đường truyền & Secret tại rest** | **HTTPS TLS 1.2+** tại Edge (`cert-manager` CA trên `*.badminton.local` cho local / ACM trên AWS ALB cho prod); Gateway tin `X-Forwarded-Proto` qua `TRUST_PROXY=1`; bcrypt/scrypt password & SHA-256 token hash | `badminton-gitops/local/certs/` + `ingress.yaml` + Gateway `trust proxy` |
| **SEC4 — Quản lý Secrets** | Không lưu secret/PAT trong Git hay ConfigMap; Production dùng **AWS Secrets Manager + ESO**; Local dùng **LocalStack + ESO (`ClusterSecretStore aws-secrets-manager`)** | `badminton-infras/localdev/credentials.py` + `ExternalSecret` trong GitOps; Identity rejects default placeholder secret khi `NODE_ENV=production` |
| **SEC5 — Bảo vệ Abuse & Boundary** | Gateway rate limiting nhận diện IP thật qua `X-Forwarded-For` (`TRUST_PROXY`), body limit `256kb` (Gateway) / `16kb` (Identity) / `8192B` (AI), Helmet security headers, strict CORS allowlist | `services/api-gateway/src/app.ts`, `services/identity/src/app.ts`, `services/ai-service/app/main.py` |
| **SEC6 — Bảo mật Chuỗi cung ứng** | Image immutable tag `sha-<commit>`, non-root containers (`automountServiceAccountToken: false` trên Pod app), quét lỗ hổng Trivy + Semgrep SAST + Artifact Validation CI | `.github/workflows/ci.yml` + `publish-and-deploy.yml` |
| **SEC7 — Cô lập mạng (Network Isolation)** | Chính sách `Default-Deny Ingress` trong namespace `badminton`, chỉ mở luồng hợp lệ `ingress-nginx -> web/admin/api-gateway/mailpit`, `api-gateway -> backend`, `backend -> DB/Redis/RabbitMQ`, `ai -> booking-core` | `badminton-gitops/local/platform/network-policies.yaml` & `network-policies` |
| **SEC8 — An toàn AI & Dữ liệu hội thoại** | AI Service gọi Core bằng token ngữ cảnh của chính user (không có DB credential của `booking` DB), giới hạn `max_turns`/rate-limit, không ghi token/PII thô vào structured logs | `services/ai-service/app/core_client.py` + `rate_limiter.py` |
| **SEC9 — Cô lập dữ liệu Dev/Demo & Chống phá hoại DB** | Tài khoản demo (`customer/manager/admin@badminton.local`) chỉ seed ở môi trường dev/demo; `/metrics` khóa bằng `timingSafeEqual(Bearer METRICS_TOKEN)`, mọi 500 error không trả stacktrace hay DB URL | `services/identity/src/app.ts` (`/health/ready`), `api-gateway/src/app.ts` (`/metrics`) |

---

## 2.4. Phân tích Tải & Dung lượng (Workload Analysis)

| Thông số tải / Lưu trữ | Đặc tính thực tế của Badminton Manager | Hệ quả Kiến trúc trực tiếp |
| :--- | :--- | :--- |
| **Tỉ lệ Đọc : Ghi** | **Đọc rất cao (~15:1 – 20:1):** xem danh mục trung tâm (`GraphQL`), bảng grid 4+ sân × 19 slot, tìm sân trống AI | Index chuyên biệt `(centerId, date, status)` & `(courtId, startsAt)`; `api-gateway` và `booking-core` chạy `2` replicas; tách luồng đọc công khai khỏi lock ghi. |
| **Tranh chấp ghi (Hot Slot Contention)** | Tập trung vào khung **17:00–21:00 (Giờ Vàng)** và đầu ngày mở slot; nhiều người bấm cùng 1 sân tại cùng 1 giây | Bắt buộc dùng **Local ACID Transaction + PostgreSQL GiST `slot_no_overlap` + Idempotency Key** thay vì optimistic check ở ứng dụng. |
| **Tải I/O Hội thoại AI** | LLM provider latency (`1s – 8s`) cao gấp 20–100x HTTP nội bộ; cần lưu checkpoint từng turn | Tách `ai-service` (Python/FastAPI) + DB `ai` (`AsyncPostgresSaver`) riêng khỏi `booking-core`; đặt timeout nghiêm ngặt để AI chậm không kéo sập đặt sân trực tiếp. |
| **Lưu trữ Đa hình thái (Polyglot)** | Dữ liệu giao dịch quan hệ (Booking, GiST Allocation, Identity Session) vs Tài liệu linh hoạt (Tin tức, Đánh giá, Chat Pass) vs Bộ đệm/Hàng đợi | `PostgreSQL 16` cho Booking/Identity/AI; `MongoDB` cho Content/Social; `Redis` cho cache/rate-limit/Socket fan-out; `RabbitMQ` cho domain events. |

---

## 2.5. Ma trận Phân quyền (RBAC + ABAC Access Control Matrix)

> Quy tắc nền tảng: **Mặc định từ chối (Default Deny)**. Frontend ẩn/hiện menu chỉ mang tính điều hướng UX; toàn bộ kiểm soát truy cập được thực thi tại Backend (`api-gateway` + `booking-core` + `identity` + `content-service`).

| Hành động / Tài nguyên | `anonymous` | `user` | `center_manager` (kèm ABAC `managerId`) | `super_admin` |
| :--- | :---: | :---: | :---: | :---: |
| Xem danh mục trung tâm, sân, bảng giá, lịch trống công khai | **Có** (ẩn PII khách) | **Có** | **Có** | **Có** |
| Đăng ký, Xác thực email, Đăng nhập, Refresh Token | **Có** | Tự quản lý session | Tự quản lý session | Toàn quyền + Khóa TK vi phạm |
| Giữ chỗ `HELD`, xác nhận đặt ngày & tự hủy `HELD` (`DELETE /reservations/:id`) | **Từ chối (401)** | **Own (`userId`)** | **Không** (chỉ đặt qua lịch cố định/tài khoản riêng) | **403** |
| Hủy Booking đã **`CONFIRMED`** (`POST /bookings/:id/cancel`) | **401** | **Cấm (`403` → Chợ Pass)** | **Cấm (`403` — Không hoàn tiền)** | **Cấm (`403` — Không hoàn tiền)** |
| Xem & Ẩn lịch sử đặt sân cá nhân (`hiddenAt`) | **401** | **Own (`userId`)** | Own | Own |
| Dùng Trợ lý AI tìm & đặt sân theo consent | **401** | **Own (`userId`)** | Own | Own |
| Tạo vỏ trung tâm (`POST /centers`), Gán/đổi `managerId`, Quản lý Hợp đồng SaaS | **401** | **403** | **403** | **Toàn quyền** |
| Tự hoàn thiện profile cơ sở, cấu hình giá, bật/tắt sân, kích hoạt `isActive` | **401** | **403** | **Chỉ cơ sở có `managerId == sub`** | Giám sát / Tạm dừng cơ sở quá hạn |
| Tạo lịch cố định nhiều ngày (`BookingSeries` 1–60 ngày) & Xem Grid Check-in | **401** | **403** | **Chỉ cơ sở có `managerId == sub`** | Tạo/Xem toàn sàn |
| Đề xuất Sự kiện/Giải đấu & Báo cáo đánh giá xấu | **401** | Đánh giá/Báo cáo | **Cơ sở phụ trách (gửi Pending)** | Phê duyệt / Đăng toàn sàn / Ẩn đánh giá |
| Endpoint vận hành `/metrics` | **401** | **401** | **401** | Chỉ Prometheus với `Bearer METRICS_TOKEN` |

---

## 2.6. Chuỗi Truy vết Khép kín (Closed-Loop Traceability Matrix)

| Vấn đề (`PB`) | Mục tiêu (`OBJ`) | Quy tắc (`BR`) | Use Case & AC | Quyết định (`ADR`) | Thành phần Code / Contract | Kiểm chứng Tự động (`CI / Live Test`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PB-01** Trùng slot & Retry | **OBJ-01, 02** | `BR-01, 09..12` | `UC-01`: `AC-02..05` | `ADR-002`, `ADR-003` | `booking-core` (`reservations`, `SlotAllocation` GiST), `contracts/booking` | `booking-core` 19/19 concurrency ACID Vitest tests; OpenAPI validator |
| **PB-02** Lệch giá & Chuỗi ngày | **OBJ-01, 03** | `BR-05..08, 15` | `UC-01, 03`: `AC-02, 09, 10` | `ADR-002`, `ADR-003` | `booking-core` (`pricing`, `bookings-command`), `BookingSeries` | Unit + Integration tests (`pricing`, `fixed-series rollback`) |
| **PB-03** Khóa hủy & Chợ Pass | **OBJ-02** | `BR-13, 14` | `UC-02`: `AC-06, 07` | `ADR-004` + Policy D-02 | `booking-core` (`POST cancel -> 403`), `contracts/events` | Contract & integration test `403 Forbidden` + `knowledge.json` |
| **PB-04** Tìm sân AI | **OBJ-04** | `BR-01,02, 17..21` | `UC-04`: `AC-11..16` | `ADR-008` | `services/ai-service` (`workflow.py`, `core_client.py`), `contracts/ai-tools` | Pytest + Golden eval (`schema=1.0`, `F1>=0.9`, `critical>=0.95`) |
| **PB-05** Auth, Session & Cô lập | **OBJ-03, 05** | `BR-16`, `SEC1..9` | `UC-05, 06, 08`: `AC-08, 19, 22, 23` | `ADR-006`, `ADR-009`, Post-PR#32 | `services/identity`, `api-gateway`, `badminton-gitops` TLS/NetPol | Identity Vitest + Gateway proxy/cookie tests + Trivy/Semgrep CI |
| **PB-06** Onboarding & Truyền thông | **OBJ-03, 05** | `BR-16`, `D-07` | `UC-05, 06, 07`: `AC-19..21` | `ADR-001`, `ADR-009` | `booking-core` (`centers`), `content-service`, `apps/admin`, `monitoring/chart` | Node CI tests + `monitoring/check.py` + `k3d-badminton-local` GitOps sync |
