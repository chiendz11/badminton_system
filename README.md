# badminton_system — Booking Core

Nhánh `feat/booking-core` xây Booking Core và hai giao diện khách hàng/quản lý trên nền CI của `ci/bootstrap`. `main` vẫn là default branch. Nghiệp vụ được chuyển từ [Badminton_manager_microservices](https://github.com/chiendz11/Badminton_manager_microservices/tree/484d381e873f513ed4faa4413407502112f4885d), theo transaction boundary mới. Chi tiết nguồn và thay đổi ở [docs/BOOKING_CORE.md](docs/BOOKING_CORE.md).

## Chức năng

- Trung tâm, sân, giờ mở cửa, bảng giá ngày thường/cuối tuần và khung giờ cao điểm; phân quyền quản lý theo trung tâm.
- Lịch trống theo giờ Việt Nam; chọn nhiều sân/giờ, giữ chỗ có thời hạn, xác nhận trực tiếp, lịch sử và hủy booking trước khi bắt đầu.
- Quản lý tạo lịch cố định theo khoảng ngày/thứ trong tuần; kiểm tra lịch trống trên mọi ngày; tạo cả chuỗi trong một transaction.
- PostgreSQL advisory lock và exclusion constraint ngăn hai booking chiếm cùng sân/giờ; idempotency tránh tạo trùng khi retry; giá được chốt lúc giữ chỗ.
- Frontend React cho khách hàng; Admin React cho quản lý sân và admin hệ thống.
- Unit/integration/consumer-provider contract tests; JSON logs có request ID, Prometheus metrics, health/readiness và alert mẫu.

Phạm vi này không có pass sân hoặc payment. Xác nhận booking không gọi thanh toán. Identity, gateway và các bounded context khác chưa triển khai; chỉ bật CI cho những component thực sự có source.

## Chạy local bằng Docker

```bash
cd /data/Dev/newBTL/badminton-system
git switch feat/booking-core
docker compose up --build -d
```

Compose tạo database riêng, áp dụng migration đã commit và seed một trung tâm/4 sân demo. PostgreSQL bind localhost:5432; API localhost:3000; giao diện khách hàng [localhost:8082](http://localhost:8082), Admin [localhost:8083](http://localhost:8083). Cổng 8082/8083 tránh xung đột với k3d đang dùng 8080. Dùng nút **Dùng tài khoản demo**, **Demo quản lý** hoặc **Demo admin** trên giao diện; demo-manager quản lý trung tâm seed. Đây là cấu hình phát triển với dữ liệu và secret mẫu.

```bash
docker compose logs -f api
docker compose down
```

`down` giữ dữ liệu trong volume. Chỉ dùng `down -v` khi muốn xóa database local này.

Hướng dẫn Node/pnpm, API và cấu hình triển khai ở [docs/BOOKING_CORE.md](docs/BOOKING_CORE.md). Hướng dẫn metrics/logs ở [docs/MONITORING.md](docs/MONITORING.md).

## Kiểm tra

Node 22, pnpm 10.25.0, Docker để integration tests tự tạo PostgreSQL riêng:

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

Integration tests không dùng database ứng dụng cũ. Nếu cung cấp `DATABASE_URL`, test chỉ chấp nhận tên DB `ci` hoặc tên kết thúc bằng `_test`, và sẽ xóa fixture trong DB đó. Mặc định Testcontainers tạo/dọn database tạm.

[docs/VALIDATION.md](docs/VALIDATION.md) ghi kết quả kiểm tra local. [docs/CI.md](docs/CI.md) mô tả change detection và các gate. Branch feature không tự chạy Actions khi push; mở PR vào `main` hoặc chạy workflow thủ công để chạy CI trên GitHub.
