## Báo cáo tuần 5

### 1. Những phần ĐÃ làm được:

- Xây dựng tài liệu kiến trúc tổng thể, sơ đồ thành phần và mô hình dữ liệu khái quát của hệ thống.
- Xác định trách nhiệm và quyền sở hữu dữ liệu của Booking Core, Identity, Commerce, Social, Content, Notification, Storage và AI; làm rõ vai trò điều phối của API Gateway.
- Thiết kế contract tích hợp gồm REST API/OpenAPI, Socket và sự kiện; mô tả request/response, phân quyền, xử lý lỗi và cơ chế chống tạo giao dịch trùng khi gửi lại yêu cầu.
- Xây dựng wireframe và luồng giao diện đặt sân, đăng nhượng, quan tâm, chat và chuyển quyền; xác định các trạng thái loading, lỗi và retry của Web/Admin.
- Soạn 9 tài liệu quyết định kiến trúc, đặc tả API/tool của AI, kế hoạch đánh giá chất lượng và thiết kế môi trường triển khai.
- Chuẩn hóa cách đánh số tuần 4–13 giữa kế hoạch Excel, mã công việc và tài liệu; cập nhật bộ artifact tuần 5 và quy ước monitoring để các thành viên phát triển thống nhất.

### 2. Kế hoạch tuần tiếp theo:

- Phát triển skeleton cho các service theo kiến trúc và contract đã xây dựng; ưu tiên các thành phần phục vụ luồng nghiệp vụ chính.
- Chuẩn bị cấu hình, schema/migration, dữ liệu mẫu và health checks cho từng service khi có runtime.
- Xây dựng frontend shell, API client và mock fixtures theo contract; thể hiện đầy đủ các trạng thái giao diện.
- Tích hợp các thành phần đã có runtime vào Compose và CI; kiểm tra khả năng khởi động local, health, lint/test/build và kết nối frontend–backend.

Tài liệu kèm: [artifact tuần 5](../week-5/README.md), [kiến trúc](../architecture/SYSTEM_ARCHITECTURE.md), [system contracts](../SYSTEM_CONTRACTS.md), [hồ sơ ADR](../adr/README.md).
