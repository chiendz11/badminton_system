# Tài liệu Kỹ thuật Các Dịch vụ (Services Documentation)

Thư mục này là **cẩm nang triển khai đồng bộ** cho cả 5 thành viên trong nhóm (**Badminton Manager V2**). Mọi service — cả dịch vụ đang chạy lẫn dịch vụ chuẩn bị phát triển từ skeleton — đều phải tuân thủ các đặc tả riêng dưới đây và bộ tiêu chuẩn chung ở Mục 4.

---

## 1. Bảng Điều phối Toàn bộ Microservices & Ứng dụng

| Service / App | Tài liệu chi tiết | DRI / Owner | Runtime & Database | Trạng thái trên `main` | OpenAPI / Contract |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **API Gateway** | [**api-gateway.md**](api-gateway.md) | Người 1 + Owners | Express 5 / TS (Stateless) | **Implemented (Live)** | [gateway](../../contracts/gateway/openapi.json) |
| **Booking Core** | [**booking-core.md**](booking-core.md) | Người 1 | NestJS + Prisma / Postgres `booking` | **Implemented (Live)** | [booking](../../contracts/booking/openapi.json) |
| **Identity Service** | [**identity-service.md**](identity-service.md) | Người 4 | Express + Prisma / Postgres `identity` | **Implemented (Live)** *(thiếu Admin APIs)* | [identity](../../contracts/identity/openapi.json) |
| **AI Assistant** | [**ai/README.md**](ai/README.md) | Người 5 | Python FastAPI + LangGraph / Postgres `ai` | **Implemented (Live)** | [ai](../../contracts/ai/openapi.json) |
| **Content Service** | [**content-service.md**](content-service.md) | Người 4 | NestJS + Mongoose / MongoDB | **Implemented (MVP Live)** *(cần nâng `UC-07/08`)* | [content](../../contracts/content/openapi.json) |
| **Commerce Service** | [**commerce-service.md**](commerce-service.md) | Người 4 | NestJS + Prisma / Postgres `commerce` | **Skeleton (`folder-only`)** | [commerce](../../contracts/commerce/openapi.json) |
| **Social Realtime** | [**social-service.md**](social-service.md) | Người 3 | NestJS + Socket.IO + MongoDB + Redis | **Skeleton (`folder-only`)** | [social](../../contracts/social/openapi.json) · [sockets](../../contracts/sockets/social-event.schema.json) |
| **Notification Service** | [**notification-service.md**](notification-service.md) | Người 3 | NestJS + RabbitMQ + MongoDB + Mailpit | **Skeleton (`folder-only`)** | [notification](../../contracts/notification/openapi.json) · [events](../../contracts/events/domain-event.schema.json) |
| **Storage Service** | [**storage-service.md**](storage-service.md) | Người 4 + Người 5 | NestJS + MongoDB + Cloudinary | **Skeleton (`folder-only`)** | [storage](../../contracts/storage/openapi.json) |
| **Web & Admin UI** | [**legacy-ui.md**](legacy-ui.md) | Người 2 (`web`) · Người 4 (`admin`) | React 18 + Vite + Tailwind (NGINX) | **Implemented (Live)** *(Booking, Auth, AI)* | [provenance](legacy-ui-provenance.json) |

---

## 2. Phân hệ Trợ lý Thông minh (AI Service Subsystem)

Chi tiết thuật toán và mã nguồn của `services/ai-service` xem tại [**docs/services/ai/**](ai/README.md):
- [**AI Service Overview (ai/README.md)**](ai/README.md)
- [**Constraint-Aware Recommendation (ai/UPGRADE.md)**](ai/UPGRADE.md)
- [**AI Assistance Features (ai/FEATURES.md)**](ai/FEATURES.md)
- [**LangGraph Workflow & Tools (ai/LANGGRAPH_WORKFLOW_AND_TOOLS.md)**](ai/LANGGRAPH_WORKFLOW_AND_TOOLS.md)
- [**Codebase Walkthrough (ai/CODE_WALKTHROUGH.md)**](ai/CODE_WALKTHROUGH.md)
- [**Architecture Design V1 (ai/designs/AI_SERVICE_UPGRADE_DESIGN_V1.md)**](ai/designs/AI_SERVICE_UPGRADE_DESIGN_V1.md)

---

## 3. Chỉ mục Hợp đồng API, Events & Sockets

- [**API Contract Index (api/README.md)**](api/README.md) · [**Catalog contracts/**](../../contracts/README.md)
- [**System Integration Contract (SYSTEM_CONTRACTS.md)**](../week-5/SYSTEM_CONTRACTS.md) · [**Bộ ADR Kiến trúc**](../week-5/adr/README.md) · [**Blueprint 10 Góc nhìn**](../blueprint/README.md)

---

## 4. Tiêu chuẩn Chung Bắt buộc (Definition of Done cho mọi Service Node/TS)

Để mọi service viết mới không bị xung đột khi ghép vào `main`, `api-gateway`, CI GitHub Actions và cụm `k3d-badminton-local` / EKS, các thành viên **bắt buộc** giữ thống nhất **6 quy tắc** sau:

1. **Vị trí & Quy ước Tên Monorepo:**
   - Đặt code trong đúng thư mục kebab-case `services/<ten-service>/` thuộc [pnpm-workspace.yaml](../../pnpm-workspace.yaml). Không tạo service ở root monorepo và không tạo `pnpm-lock.yaml` riêng bên trong từng service.
2. **Bảo mật & Phân quyền Fail-Closed (`@badminton/auth-contracts`):**
   - Mọi backend service tự verify Bearer JWT (`HS256`, `iss=badminton-identity`, `aud=badminton-system`, check `exp`). Tuyệt đối không tin header `x-user-id`, `x-role` hay fallback `'test-user'` nếu thiếu token.
   - Các mutation ghi quan trọng bắt buộc hỗ trợ `Idempotency-Key` và lan truyền `X-Request-Id`.
3. **Sở hữu Dữ liệu Độc lập (Database-per-Service):**
   - Dữ liệu giao dịch cần ACID chặt (`booking`, `identity`, `commerce`, `ai`) dùng **PostgreSQL 16 + Prisma**; dữ liệu tài liệu/nhật ký (`content`, `social`, `notification`, `storage` metadata) dùng **MongoDB 8**. Không truy vấn SQL/Mongo chéo sang DB của service khác.
4. **Probes, Metrics & Structured Logs:**
   - Chuẩn hóa **`GET /health/live`** (process sống), **`GET /health/ready`** (kiểm tra kết nối DB/Broker thật, lỗi trả `503` không lộ connection string) và **`GET /metrics`** (khóa bằng `Bearer METRICS_TOKEN` constant-time).
   - Log JSON 1 dòng kèm `requestId`, không log JWT, mật khẩu hoặc PII nhạy cảm.
5. **Scripts bắt buộc trong `package.json` (CI Gate [check_node_contract.mjs](../../.github/scripts/check_node_contract.mjs)):**
   - Mọi Node service phải có các script chạy đơn lượt, không tự sửa file và không bỏ qua test: `lint`, `typecheck`, `test:unit`, `test:contract`, `test:integration`, `build`.
   - Nếu `prisma: true` trong [.github/ci/components.yml](../../.github/ci/components.yml): phải có thêm `prisma:validate`, `prisma:generate`, `prisma:migrate:deploy` và stage `migrate` trong `Dockerfile`.
6. **Quy trình Merge & Triển khai 3-Repo:**
   - Khi service chạy + pass test cục bộ: tạo `Dockerfile` non-root → bật component trong `.github/ci/components.yml` & `publish-and-deploy.yml` → cập nhật proxy trong `services/api-gateway` → mở PR lên `main` (`badminton_system`).
   - Sau khi `main` xanh và đẩy image lên GHCR: thêm secrets/DB tương ứng ở `badminton-infras` và Deployment / NetworkPolicy / Ingress / `PreSync` Job ở `badminton-gitops`.
