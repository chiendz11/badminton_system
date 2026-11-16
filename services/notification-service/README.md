# notification-service — skeleton V2

Trạng thái: **folder-only**, chưa có ứng dụng, package, endpoint, database hoặc container chạy được.

DRI: Người 3. Nhận domain events, tạo in-app notification và quản lý delivery/retry; không quyết định booking hay payment.

## Cây module dự kiến

```text
notification-service/
  src/consumers/
  src/notification/
  src/delivery/
  src/adapters/
  src/retry/
  src/common/
  tests/unit/
  tests/integration/
```

## Boundary, sự kiện toàn hệ thống và tối ưu kiến trúc

MongoDB riêng; `Notification`, `BroadcastCampaign` (tối ưu broadcast toàn sàn không chặn request), `DeliveryAttempt`, `Inbox`. Unique `(eventId, recipientUserId, channel)`, ACK RabbitMQ sau khi persist, retry exponential backoff + DLQ.

### Sự kiện cần tiêu thụ xuyên suốt hệ thống
- **Booking & Onboarding (`booking-core` Outbox):** `booking.confirmed.v1`, `booking.series-confirmed.v1` (gom chuỗi lịch cố định 1–60 ngày thành 1 thông báo), `booking.reminder.v1` (`T-24h` / `T-2h` trước giờ chơi để kịp đăng Chợ Pass vì đơn confirmed khóa hủy 403), `booking.center-assigned.v1` (báo `center_manager` khi `super_admin` bàn giao/tạm dừng cơ sở).
- **Chợ Pass & Chat (`booking-core` + `social-service`):** `booking.pass-created.v1`, `booking.pass-interest-added.v1`, `booking.pass-transferred.v1`, `booking.pass-closed.v1`, `social.message-created.v1`.
- **Content & Kiểm duyệt (`content-service`):** `content.news-submitted.v1` (báo `super_admin` duyệt sự kiện CLB mới), `content.news-publication-changed.v1` (báo `center_manager` kết quả duyệt/từ chối), `content.review-reported.v1` (báo `super_admin` có khiếu nại đánh giá xấu).
- **Quản trị & SaaS (`commerce-service` + Notification API):** `contract.status-changed.v1`, `notification.broadcast.v1` (`POST /notifications/broadcast` cho `super_admin`), `notification.urgent.v1` (`POST /notifications/urgent` cho `center_manager` đúng cơ sở kèm `Idempotency-Key` + fallback email qua SMTP/`Mailpit`).

### Tối ưu trải nghiệm & Vận hành
- **Badge & Deep-Link:** `Notification` hỗ trợ `title`, `priority` (`NORMAL|HIGH|URGENT`), `deepLink`, `readAt` và endpoint nhẹ `GET /notifications/unread-count`.
- **Email Urgent Fallback:** Các thông báo `URGENT` (sự cố sân trong ngày, nhắc hạn HĐ SaaS `1` ngày) gửi kèm email qua SMTP (`mailpit:1025` ở local/test) ngoài kênh in-app.
- **Broadcast Fan-out an toàn:** `POST /notifications/broadcast` trả `202` ngay, worker chia batch ghi bất đồng bộ theo `targetAudience` (`ALL`/`MANAGERS`/`PLAYERS`) tránh timeout API Admin.

API, event và quyền nằm trong [system contract](../../docs/week-5/SYSTEM_CONTRACTS.md), quyết định ở [ADR](../../docs/week-5/adr/README.md) (ADR-009). Dùng tên kebab-case để khớp repo hiện tại; tương ứng tên underscore trong tài liệu kiến trúc.

## Trước khi biến thành service chạy được

- Review contract và mô hình dữ liệu; chỉ thêm dependency/package khi bắt đầu triển khai.
- Thêm config validation, health/live, health/ready, auth/authorization, logging và metrics phù hợp.
- Viết unit/integration test thực cho invariant của domain; không coi thư mục tests trống là test coverage.
- Sau khi có ứng dụng và checks riêng, thêm Compose và component CI. Hiện chưa thay đổi hai cấu hình này.
- Không commit dữ liệu người dùng, `.env`, khóa nhà cung cấp hoặc model weights.

## Legacy để tham khảo khi triển khai

- [`BM/services/notification_service/src/Service/notification.service.ts`](https://github.com/chiendz11/Badminton_manager_microservices/blob/484d381e873f513ed4faa4413407502112f4885d/BM/services/notification_service/src/Service/notification.service.ts)
- [`BM/services/notification_service/src/Schema/notification.schema.ts`](https://github.com/chiendz11/Badminton_manager_microservices/blob/484d381e873f513ed4faa4413407502112f4885d/BM/services/notification_service/src/Schema/notification.schema.ts)

Skeleton không sao chép code legacy. [Mapping đầy đủ](../../docs/week-5/architecture/SKELETON_MAPPING.md).
