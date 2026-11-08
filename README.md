# badminton_system — Booking Core và AI

Dự án hiện đại hóa hệ thống quản lý sân cầu lông **Badminton Manager V2** theo kiến trúc Microservices & AI Assistance, kế thừa và tái cấu trúc từ repository gốc [Badminton_manager_microservices](https://github.com/chiendz11/Badminton_manager_microservices/tree/484d381e873f513ed4faa4413407502112f4885d).

> 📚 **Tài liệu & Kế hoạch Thực hiện**:
> - [**Bản đồ Tài liệu Tổng thể (docs/README.md)**](docs/README.md): Cổng điều hướng toàn bộ hồ sơ kỹ thuật, nghiệp vụ và vận hành.
> - [**Kế hoạch Thực hiện 10 Tuần (docs/planning/README.md)**](docs/planning/README.md): Phân công 50 tasks chi tiết cho 5 kỹ sư kèm file Excel/CSV.
> - [**Tài liệu Nghiệp vụ Master BRD (docs/week-4/BRD.md)**](docs/week-4/BRD.md) & [**Kiến trúc Chuẩn Hệ thống V2 (docs/week-5/ARCHITECTURE.md)**](docs/week-5/ARCHITECTURE.md).

---

## Cấu trúc workspace

```text
apps/web/               # Giao diện người dùng Web (React 18 + Vite + TailwindCSS)
apps/admin/             # Giao diện quản lý sân & hệ thống (React + Vite)
services/api-gateway/   # Cổng API Gateway tập trung, điều phối routing & kiểm tra JWT
services/booking-core/  # Dịch vụ cốt lõi Đặt sân (NestJS + Prisma + PostgreSQL)
services/ai-service/    # Trợ lý AI thông minh (FastAPI + LangGraph + DB hội thoại riêng)
services/content-service/# Dịch vụ Quản lý Tin tức & Đánh giá (NestJS + MongoDB)
services/social-service/# Khung dịch vụ Chat & Kết nối thời gian thực (Node.js + Socket.IO)
packages/               # Thư viện dùng chung (Contracts, Observability, Utilities)
contracts/              # Hợp đồng giao tiếp chuẩn OpenAPI 3.0 & JSON Schema
monitoring/             # Cấu hình Prometheus, Alertmanager và Grafana dashboards
docs/                   # Toàn bộ kho tài liệu nghiệp vụ, kiến trúc, tuần 4-6, DevOps
```

Repo app quản lý code, metrics/logs, migration từng service và toàn bộ cấu hình monitoring ứng dụng trong [monitoring/](monitoring/README.md). Compose dùng trực tiếp rule/dashboard; GitOps tham chiếu Helm chart cùng nguồn bằng app commit đã review. [badminton-gitops](https://github.com/chiendz11/badminton-gitops) cài stack monitoring và cấu hình triển khai; [badminton-infras](https://github.com/chiendz11/badminton-infras) quản lý AWS. Xem [quy ước monitoring](docs/devops/monitoring.md).

Bật bộ metrics/dashboard/cảnh báo local bằng `docker compose --profile monitoring up -d --build` (Compose >=2.23.1). Grafana ở http://localhost:3001, Prometheus ở http://localhost:9090, Alertmanager ở http://localhost:9093. Profile chỉ thu metrics của các backend có runtime; logs tập trung và các exporter chưa được bổ sung.

Web/Admin tách `app`, `features/{pages,ui,api}`, `shared`; Booking Core tách module nghiệp vụ và infrastructure. Xem [cấu trúc codebase](docs/week-5/architecture/CODEBASE_ARCHITECTURE.md) cho trách nhiệm và quy tắc dependency.

Bản thiết kế toàn hệ thống V2 và artifact cho 5 người ở tuần 4–5 nằm trong [docs/reports/DELIVERY_W04_W05.md](docs/reports/DELIVERY_W04_W05.md), kèm [system contract](docs/week-5/SYSTEM_CONTRACTS.md), [kiến trúc đích](docs/week-5/ARCHITECTURE.md) và [đối chiếu hiện trạng](docs/week-5/architecture/SYSTEM_ARCHITECTURE.md).

[Báo cáo môn học tuần 4–6 và kế hoạch tuần 4–13](docs/reports/README.md) dùng chung số tuần 4–13 với Excel và artifact. Các báo cáo là dự thảo để nhóm xác nhận trước khi đăng Discussions.

---

## Chức năng

- Trung tâm, sân, giờ mở cửa, bảng giá ngày thường/cuối tuần và khung giờ cao điểm; phân quyền quản lý theo trung tâm.
- Lịch trống theo giờ Việt Nam; chọn nhiều sân/giờ, giữ chỗ có thời hạn, xác nhận trực tiếp, lịch sử và hủy booking trước khi bắt đầu.
- Quản lý tạo lịch cố định theo khoảng ngày/thứ trong tuần; kiểm tra lịch trống trên mọi ngày; tạo cả chuỗi trong một transaction.
- PostgreSQL advisory lock và exclusion constraint ngăn hai booking chiếm cùng sân/giờ; idempotency tránh tạo trùng khi retry; giá được chốt lúc giữ chỗ.
- Frontend/Admin giữ JSX, CSS và bố cục booking/centre/history/statistics từ repo gốc; chỉ giữ UI Booking Core và trang AI. Xóa màn hình/API client kho, bán hàng, news, rating, social, notification, profile/users CRUD và Storage upload; không có pass/payment/login.
- Trợ lý đặt sân tiếng Việt nhiều lượt tại `/booking-assistant`: giữ ngữ cảnh, lập/tìm lại kế hoạch, chọn sân rồi xác nhận cuối. Slot 60 phút; 2 tiếng cần 2 slot liên tiếp cùng sân. Xem [docs/services/ai/README.md](docs/services/ai/README.md) về công nghệ, lý thuyết và provider thật/offline. Nâng cấp [Recommendation V1](docs/services/ai/UPGRADE.md) bổ sung diagnostics, đề xuất đổi một điều kiện, chấp nhận/từ chối và kiểm tra lại Core trước bước chọn/xác nhận.
- Chatbot còn hỗ trợ lịch/lịch sử cá nhân, thống kê theo khoảng ngày, hủy booking có xác nhận riêng, so sánh trung tâm và FAQ có nguồn. Xem [hướng dẫn và các file triển khai](docs/services/ai/FEATURES.md); số liệu giá trị booking không đồng nghĩa đã thanh toán.
- Unit/integration/consumer-provider contract tests; JSON logs có request ID, Prometheus metrics, health/readiness và alert mẫu.

Phạm vi này không có pass sân hoặc payment. UI gốc → API Gateway → Booking Core đã nối cho catalogue trung tâm, lịch trống, đặt/xác nhận/hủy, lịch sử/thống kê và lịch cố định. Gateway giữ REST/GraphQL của client gốc, xác minh JWT rồi chuyển bearer token tới Core. UI và API client ngoài Booking Core/AI đã được bỏ theo phạm vi mới. Session JWT và directory khách/manager do host cấp; không triển khai Identity service. Gateway vẫn là cổng nối hai service.

---

## Chạy local bằng Docker

```bash
docker compose up --build -d
```

Compose tạo database Booking Core và AI riêng, áp dụng migration đã commit và seed một trung tâm/4 sân demo. PostgreSQL bind localhost:5432; API localhost:3000; gateway localhost:8081; AI localhost:8000 (DB AI localhost:5433); giao diện khách hàng [localhost:8082](http://localhost:8082), Admin [localhost:8083](http://localhost:8083). Cổng 8082/8083 tránh xung đột với k3d đang dùng 8080. Đây là cấu hình phát triển với dữ liệu và secret mẫu. Compose chạy gateway mới và tự nối Nginx của hai app tới gateway, gateway tới Core. Không có màn hình hoặc nút đăng nhập demo. Xem [docs/services/legacy-ui.md](docs/services/legacy-ui.md) để cấu hình gateway và nhận session từ host.

```bash
docker compose logs -f api gateway ai
docker compose down
```

`down` giữ dữ liệu trong volume. Chỉ dùng `down -v` khi muốn xóa database local này.

Nếu không có `.env` root, Compose chạy AI offline (`AI_PROVIDER=fake`, `AI_OFFLINE=true`) và UI ghi rõ chế độ đó. Để dùng Groq, copy `.env.example` thành `.env`, điền `LLM_API_KEY` riêng và recreate AI. Mẫu dùng protocol `openai-compatible`, endpoint `https://api.groq.com/openai/v1` và model `openai/gpt-oss-120b`; cấu hình local hiện tại đã chọn Groq. File `.env` không được commit. Hướng dẫn chi tiết, provider khác và Ollama ở [docs/services/ai/README.md](docs/services/ai/README.md).

Hợp đồng gateway và cấu hình ở [docs/services/api-gateway.md](docs/services/api-gateway.md). Hướng dẫn Node/pnpm, API và cấu hình triển khai ở [docs/services/booking-core.md](docs/services/booking-core.md). Hướng dẫn metrics/logs ở [docs/devops/monitoring.md](docs/devops/monitoring.md).

---

## Kiểm tra

Node 22, pnpm 10.25.0, Python 3.12 / uv 0.8.22 cho AI, Docker để integration tests tự tạo PostgreSQL riêng:

```bash
pnpm install --frozen-lockfile
pnpm --filter @badminton/booking-core prisma:generate
pnpm lint
pnpm typecheck
pnpm test:contract
pnpm test:integration
pnpm build
```

AI có lockfile và các lệnh kiểm tra riêng:

```bash
cd services/ai-service
uv sync --locked --all-groups
uv run ruff check app tests evaluation alembic
uv run mypy app
uv run pytest tests -q
AI_PROVIDER=fake AI_OFFLINE=true uv run python -m evaluation.evaluate
```

Integration tests không dùng database ứng dụng cũ. Nếu cung cấp `DATABASE_URL`, test chỉ chấp nhận tên DB `ci` hoặc tên kết thúc bằng `_test`, và sẽ xóa fixture trong DB đó. Mặc định Testcontainers tạo/dọn database tạm.

[docs/devops/validation.md](docs/devops/validation.md) ghi kết quả kiểm tra local. [docs/devops/ci-cd.md](docs/devops/ci-cd.md) mô tả change detection và các gate. Branch feature không tự chạy Actions khi push; mở PR vào `main` hoặc chạy workflow thủ công để chạy CI trên GitHub.
