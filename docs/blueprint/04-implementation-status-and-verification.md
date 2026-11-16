# 4. Hiện trạng Mã nguồn, Hợp đồng, Kiểm thử & Vận hành Demo

> Tài liệu đối chiếu 100% với trạng thái thực tế của `badminton-system`, `badminton-infras` và `badminton-gitops` sau **PR #32** (`commit 4f0e5a8`), phân biệt rạch ròi giữa thành phần **đang chạy thật (Implemented & Live)** và thành phần **đang ở mức thiết kế/skeleton (Target)**.

---

## 4.1. Công nghệ Đang dùng & Lý do Lựa chọn

| Thành phần | Công nghệ / Phiên bản | Lý do kiến trúc |
| :--- | :--- | :--- |
| **Core Backend & Identity** | Node.js 22 LTS, TypeScript, NestJS (`booking-core`, `content-service`), Express (`api-gateway`, `identity`), Prisma ORM | Chia sẻ contracts/shared libs (`@badminton/auth-contracts`, `@badminton/booking-contracts`, `@badminton/observability`), type-safe từ DTO tới PostgreSQL. |
| **AI & Conversational Planning** | Python 3.12, FastAPI, Pydantic v2, **LangGraph**, `AsyncPostgresSaver`, `uv` lockfile | Hệ sinh thái AI/LangGraph mạnh cho stateful graph (`workflow.py`), schema validation nghiêm ngặt và bộ Golden Eval tách riêng. |
| **Web & Admin Frontend** | React 18, TypeScript/JS, Vite, Tailwind CSS, Apollo Client (GraphQL catalogue) | Tách riêng `apps/web` (khách hàng) và `apps/admin` (RBAC hợp nhất `center_manager` + `super_admin`), tối ưu single-flight cookie refresh. |
| **Relational ACID Storage** | **PostgreSQL 16** + `btree_gist` (`booking` DB, `identity` DB, `ai` DB) | Bảo đảm GiST Exclusion Constraint `slot_no_overlap`, Advisory Locks, Idempotency unique index & LangGraph checkpoints. |
| **Document / Cache / Broker / Email** | MongoDB 8 (`content`), Redis 7, RabbitMQ, **Mailpit** (Local SMTP sandbox) | Polyglot persistence theo nhu cầu domain; Mailpit giả lập xác thực email trước khi bật SMTP thật trên AWS. |
| **Hạ tầng, GitOps & Secrets** | **Terraform** (AWS EKS + Local), **k3d**, **Argo CD**, **Argo CD Image Updater**, **External Secrets Operator**, **LocalStack**, **ingress-nginx**, **cert-manager** | 100% Declarative GitOps, không chứa secret trong Git, parity TLS + `Secure` Cookie giữa local `*.badminton.local` và AWS EKS. |
| **Observability & Quality Gates** | Prometheus, Grafana, Alertmanager, OpenTelemetry context (`X-Request-Id`), Vitest, Pytest, Trivy, Semgrep, `promtool`, `actionlint` | Quan sát từ code tới cluster; `23` kiểm tra tự động trong `ci.yml` trước mọi lần merge vào `main`. |

---

## 4.2. Bản đồ Mã nguồn Thực tế (`Implemented` vs `Target/Skeleton`)

> Quy ước minh bạch: Chỉ các service gắn nhãn **Implemented (Live)** mới build Docker image, push GHCR và chạy Pod thực tế trên `k3d-badminton-local`.

| Thành phần trong Repo | Đường dẫn | Runtime / DB | Trạng thái hiện tại | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :---: | :--- |
| **`apps/web`** | [apps/web](../../apps/web) | React / Vite SPA (NGINX non-root) | **Implemented (Live)** | Danh mục sân, đặt sân, AI Drawer, Auth modal, trang Verify Email (`/verify-email`), single-flight refresh. Còn `GAP-02`, `GAP-03`. |
| **`apps/admin`** | [apps/admin](../../apps/admin) | React / Vite SPA (NGINX non-root) | **Implemented (Live)** | Admin hợp nhất phân quyền RBAC (`center_manager` + `super_admin`), lịch cố định, setup sân & giá. |
| **`api-gateway`** | [services/api-gateway](../../services/api-gateway) | Node Express / TS | **Implemented (Live)** | BFF Edge: Helmet, strict CORS, `TRUST_PROXY`, `X-Request-Id`, JWT Verify, GraphQL `/graphql`, Auth/Booking/AI/Content proxy. |
| **`booking-core`** | [services/booking-core](../../services/booking-core) | NestJS + Prisma / Postgres `booking` | **Implemented (Live)** | SSOT trung tâm/sân/giá, GiST anti-double-booking, Hold TTL, Strict No-Cancel `403`, `BookingSeries`, `OutboxEvent`. Pass/PayOS chưa bật runtime. |
| **`identity`** | [services/identity](../../services/identity) | Node Express + Prisma / Postgres `identity` | **Implemented (Live)** | Đăng ký, Email Verification qua `Mailpit`, JWT Access Token, Refresh Token rotation + `HttpOnly; Secure; SameSite=Lax` cookie, `identity-service-migrations` PreSync Job. |
| **`ai-service`** | [services/ai-service](../../services/ai-service) | Python FastAPI + LangGraph / Postgres `ai` | **Implemented (Live)** | 11-node LangGraph conversation planner, Core HTTP client, PostgreSQL checkpointer, rate limiter, Golden eval. |
| **`content-service`** | [services/content-service](../../services/content-service) | NestJS / MongoDB 8 | **Implemented (Live)** | Quản lý tin tức/sự kiện, đánh giá sân & kiểm duyệt văn bản. |
| **`commerce-service`** | [services/commerce-service](../../services/commerce-service) | Prisma / Node spec | **Skeleton (Target)** | Đã có Prisma schema, OpenAPI contract (`contracts/commerce`), unit baseline; **chưa bật container CI/cluster**. |
| **`social-service`** | [services/social-service](../../services/social-service) | NestJS + Mongo + Socket.IO | **Skeleton (Target W8)** | Đã có OpenAPI, `sockets/social-event.schema.json` và `ADR-005`; **đang bù JWT Socket Guard & Mongo persist ở Tuần 8**. |
| **`notification-service`** | [services/notification-service](../../services/notification-service) | Consumer event spec | **Skeleton (Target W8+)** | Đã có `contracts/notification` và `domain-event.schema.json`; **chưa nối RabbitMQ publisher/consumer runtime**. |
| **`storage-service`** | [services/storage-service](../../services/storage-service) | File/Cloudinary spec | **Skeleton (Target)** | Đã có `contracts/storage`; hiện dùng static assets/URL. |
| **`identity-service`** *(legacy skeleton)* | [services/identity-service](../../services/identity-service) | Thư mục thiết kế W5 | **Archived Skeleton** | Chỉ giữ tham chiếu thiết kế W5; runtime Identity chính thức nằm ở **`services/identity`** (`.github/ci/components.yml`). |

---

## 4.3. Hợp đồng Hệ thống (`contracts/` — 13 Nhóm Kiểm thử Tự động)

Toàn bộ API, Event và Socket của hệ thống được chuẩn hóa máy-đọc tại [`contracts/`](../../contracts/README.md) và kiểm tra chéo tự động bởi `.github/scripts/validate_contracts.py`, `check_node_contract.mjs`, `check_python_contract.py`:
- **9 OpenAPI 3.1 Specs:** `booking`, `gateway`, `ai`, `identity`, `commerce`, `content`, `social`, `notification` (đã tối ưu thêm `/notifications/unread-count`, `priority`, `deepLink`, `readAt` và nối đủ Gateway paths), `storage` (gắn cờ `x-implementation-status`: `implemented` vs `proposed`).
- **Events & Sockets:** `events/booking-event.schema.json` (`booking.confirmed.v1`), `events/domain-event.schema.json` (16 event types v1 gồm Pass, Identity, Commerce, Social, Notification Broadcast/Urgent, SaaS Contract, **Content** `news-submitted` / `news-publication-changed` / `review-reported`, **Booking** `center-assigned` / `series-confirmed` / `reminder`), `sockets/social-event.schema.json` (9 Socket.IO events).
- **AI Tools & Shared Errors:** `ai-tools/`, `shared/error.schema.json`.

---

## 4.4. Kết quả Kiểm chứng Tự động & Chất lượng (Verified Baselines)

| Cổng kiểm tra | Phạm vi & Công cụ | Ngưỡng bắt buộc | Bằng chứng thực tế |
| :--- | :--- | :--- | :--- |
| **CI Matrix (`ci.yml`)** | Change detection (`detect_changes.py`) across 22 components (contracts, libs, services, web, admin, workflows) | **Tất cả required jobs PASS** trước khi merge `main` | **23/23 Checks Green** trên PR #32 trước khi merge vào `main` (`4f0e5a8`). |
| **Publish & Promote (`publish-and-deploy.yml`)** | Build & push `9` GHCR images (`booking-core`, `booking-core-migrations`, `identity-service`, `identity-service-migrations`, `api-gateway`, `ai-service`, `content-service`, `web`, `admin`) | Push immutable tag `sha-<commit>` & promote GitOps | Run `#43745441810` trên commit `4f0e5a8` **PASS 100%** (9/9 images + GitOps promote). |
| **ACID Concurrency (`booking-core`)** | Vitest integration tests giả lập contention 20 luồng giữ cùng 1 slot + retry `Idempotency-Key` + `403` cancel + atomic `BookingSeries` | `0` overlap; `100%` test pass | **19/19 Concurrency ACID Tests PASS**. |
| **AI Golden Eval (`ai-service`)** | Pytest + Golden suite (`check_golden_report.py`) | `schema_validity = 1.0`, `constraint_f1 >= 0.90`, `critical_field_accuracy >= 0.95` | **PASS** trong Python CI pipeline. |
| **Monitoring & Infra Manifests** | `monitoring/check.py` (Compose + Helm + `promtool`), `ci_manifest.py`, `kubectl kustomize` | Không lệch nguồn rule/dashboard, Kustomize build sạch | Kiểm tra tự động trên PR & Push. |
| **Supply Chain & Static Security** | Trivy container scan, Semgrep SAST, non-root containers | **0 Critical/High CVEs** | Đạt gate bảo mật container trong `ci.yml`. |

---

## 4.5. Vận hành & Demo Cụm Kubernetes Local (`k3d-badminton-local`)

### Quy trình Khởi tạo Toàn hệ thống (từ máy trống)

Thực thi tại repo `badminton-infras`:
1. Cấu hình `/etc/hosts` trỏ `127.0.0.1` về `web.badminton.local badminton.local admin.badminton.local api.badminton.local mailpit.badminton.local`.
2. Khởi tạo cụm `k3d-badminton-local` (mở port `80:30080` và `443:30444`), cài `External Secrets Operator`, `LocalStack`, `Secrets`, `Argo CD` và đồng bộ 6 Argo Applications (`cert-manager`, `ingress-nginx`, `certs`, `platform`, `observability`, `apps`).
3. Argo CD tự động chạy `PreSync` migration Jobs (`booking-core-migrate`, `identity-service-migrate`) trước khi triển khai các Pod ứng dụng.

### Danh mục Kênh Truy cập HTTPS Local Parity

| Dịch vụ / Giao diện | URL HTTPS (Qua TLS Ingress) | Mục đích Demo & Kiểm chứng |
| :--- | :--- | :--- |
| **Web Khách hàng** | `https://web.badminton.local` (hoặc `https://badminton.local`) | Xem sân, chọn slot matrix, giữ chỗ 10p, đăng ký/xác thực email, chat AI Drawer |
| **Admin Portal (RBAC)** | `https://admin.badminton.local` | Đăng nhập `super_admin` / `center_manager`, onboarding, giá, lịch cố định |
| **API Gateway (Edge)** | `https://api.badminton.local` (`/health/ready`, `/api/...`, `/graphql`) | Endpoint API chung, kiểm chứng JWT, CORS, `HttpOnly; Secure` Refresh Cookie |
| **Mailpit Sandbox UI** | `https://mailpit.badminton.local` | Kiểm tra email xác thực đăng ký gửi từ `identity-service` qua SMTP |

> **Tài khoản Demo đã seed sẵn (Môi trường dev/local, mật khẩu mặc định `Password123!`):**
> - Khách hàng (`user`): `customer@badminton.local`
> - Quản lý sân (`center_manager`): `manager@badminton.local`
> - Quản trị sàn (`super_admin`): `admin@badminton.local`

---

## 4.6. Lộ trình Tiếp theo (Tuần 8 → Tuần 10)

1. **P0 Frontend (`GAP-02`):** Đảm bảo Web client gắn `Idempotency-Key` ổn định trong cùng 1 ý định đặt ngày khi retry lỗi mạng.
2. **P0 Realtime & Pass (`W8`):** Hoàn thiện Socket JWT Guard + Mongo persistence ở `social-service` (`ADR-005`) và state machine Chợ Pass Sân (`PASS_PENDING -> PASS_CLAIMED`) trong `booking-core` (`ADR-004`).
3. **P1 UX Parity (`GAP-03`) & Notification (`W8–W9`):** Đồng bộ horizon đặt trước giữa Web/Admin/Core (`D-03`); nối RabbitMQ publisher từ `OutboxEvent` sang `notification-service`.
4. **P1 Hardening & Cloud Readiness (`W10`):** Chạy bài test tải `k6` đo `p95` thực tế trên UAT (`NFR-P1, P2`), mở rộng Golden tiếng Việt cho LLM thật (`GAP-04`) và diễn tập Backup/Restore RPO/RTO (`NFR-A3`).
