# badminton_system — Booking Core và AI

Nhánh `feat/booking-core` xây Booking Core và lấy lại giao diện khách hàng/quản lý từ repo gốc trên nền CI của `ci/bootstrap`. `main` vẫn là default branch. Nghiệp vụ được chuyển từ [Badminton_manager_microservices](https://github.com/chiendz11/Badminton_manager_microservices/tree/484d381e873f513ed4faa4413407502112f4885d), theo transaction boundary mới. Chi tiết nguồn và thay đổi ở [docs/BOOKING_CORE.md](docs/BOOKING_CORE.md).

## Cấu trúc workspace

```text
apps/web/               # giao diện khách hàng
apps/admin/             # giao diện quản lý
services/api-gateway/   # adapter REST/GraphQL của UI gốc
services/booking-core/  # NestJS bounded context
services/ai-service/    # FastAPI + LangGraph, DB hội thoại riêng
packages/               # contracts, observability dùng chung
contracts/              # schema HTTP/event
monitoring/             # Prometheus config và alert
```

Web/Admin tách `app`, `features/{pages,ui,api}`, `shared`; Booking Core tách module nghiệp vụ và infrastructure. Xem [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) cho trách nhiệm và quy tắc dependency.

## Chức năng

- Trung tâm, sân, giờ mở cửa, bảng giá ngày thường/cuối tuần và khung giờ cao điểm; phân quyền quản lý theo trung tâm.
- Lịch trống theo giờ Việt Nam; chọn nhiều sân/giờ, giữ chỗ có thời hạn, xác nhận trực tiếp, lịch sử và hủy booking trước khi bắt đầu.
- Quản lý tạo lịch cố định theo khoảng ngày/thứ trong tuần; kiểm tra lịch trống trên mọi ngày; tạo cả chuỗi trong một transaction.
- PostgreSQL advisory lock và exclusion constraint ngăn hai booking chiếm cùng sân/giờ; idempotency tránh tạo trùng khi retry; giá được chốt lúc giữ chỗ.
- Frontend/Admin giữ JSX, CSS, ảnh và API client từ repo gốc: trang chủ, trung tâm, booking, hồ sơ/bạn bè, thông báo, tin tức, dịch vụ, kho, báo cáo, đánh giá, quản lý người dùng. Loại bỏ pass sân, payment/checkout và login/password/OAuth/refresh-token.
- Trợ lý đặt sân tiếng Việt nhiều lượt tại `/booking-assistant`: giữ ngữ cảnh, lập/tìm lại kế hoạch, chọn sân rồi xác nhận cuối. Slot 60 phút; 2 tiếng cần 2 slot liên tiếp cùng sân. Xem [docs/AI_SERVICE.md](docs/AI_SERVICE.md) về công nghệ, lý thuyết và provider thật/offline.
- Unit/integration/consumer-provider contract tests; JSON logs có request ID, Prometheus metrics, health/readiness và alert mẫu.

Phạm vi này không có pass sân hoặc payment. UI gốc → API Gateway → Booking Core đã nối cho catalogue trung tâm, lịch trống, đặt/xác nhận/hủy, lịch sử/thống kê và lịch cố định. Gateway giữ REST/GraphQL của client gốc, xác minh JWT rồi chuyển bearer token tới Core. Identity và backend của kho/news/rating/social/notification chưa triển khai; các màn hình đó vẫn được giữ theo yêu cầu.

## Chạy local bằng Docker

```bash
cd /data/Dev/newBTL/badminton-system
git switch feat/booking-core
docker compose up --build -d
```

Compose tạo database Booking Core và AI riêng, áp dụng migration đã commit và seed một trung tâm/4 sân demo. PostgreSQL bind localhost:5432; API localhost:3000; gateway localhost:8081; AI localhost:8000 (DB AI localhost:5433); giao diện khách hàng [localhost:8082](http://localhost:8082), Admin [localhost:8083](http://localhost:8083). Cổng 8082/8083 tránh xung đột với k3d đang dùng 8080. Đây là cấu hình phát triển với dữ liệu và secret mẫu. Compose chạy gateway mới và tự nối Nginx của hai app tới gateway, gateway tới Core. Không có màn hình hoặc nút đăng nhập demo. Xem [docs/LEGACY_UI.md](docs/LEGACY_UI.md) để cấu hình gateway và nhận session từ host.

```bash
docker compose logs -f api gateway ai
docker compose down
```

`down` giữ dữ liệu trong volume. Chỉ dùng `down -v` khi muốn xóa database local này.

Compose mặc định chạy AI offline (`AI_PROVIDER=fake`, `AI_OFFLINE=true`) và UI ghi rõ chế độ đó. Để dùng LLM thật, đặt `AI_PROVIDER=openai-compatible`, `AI_OFFLINE=false` và `LLM_API_KEY`/model/base URL trong `.env` root rồi recreate AI. Hướng dẫn chi tiết và Ollama ở [docs/AI_SERVICE.md](docs/AI_SERVICE.md).

Hợp đồng gateway và cấu hình ở [docs/API_GATEWAY.md](docs/API_GATEWAY.md). Hướng dẫn Node/pnpm, API và cấu hình triển khai ở [docs/BOOKING_CORE.md](docs/BOOKING_CORE.md). Hướng dẫn metrics/logs ở [docs/MONITORING.md](docs/MONITORING.md).

## Kiểm tra

Node 22, pnpm 10.25.0, Python 3.12 / uv 0.8.22 cho AI, Docker để integration tests tự tạo PostgreSQL riêng:

```bash
pnpm install --frozen-lockfile
pnpm --filter @badminton/booking-core prisma:generate
pnpm lint
pnpm typecheck
pnpm test:unit
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

[docs/VALIDATION.md](docs/VALIDATION.md) ghi kết quả kiểm tra local. [docs/CI.md](docs/CI.md) mô tả change detection và các gate. Branch feature không tự chạy Actions khi push; mở PR vào `main` hoặc chạy workflow thủ công để chạy CI trên GitHub.
