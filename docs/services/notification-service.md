# Notification Service (`services/notification-service`) — Đặc tả & Hướng dẫn Triển khai Đồng bộ

| Thuộc tính | Giá trị |
| :--- | :--- |
| **DRI / Owner** | Người 3 — Social Realtime · Notification |
| **Thư mục mục tiêu** | [`services/notification-service/`](../../services/notification-service/README.md) *(Dùng kebab-case, KHÔNG dùng `services/notification_service`)* |
| **CI Component** | `@badminton/notification-service` (`notification_service` khi bật trong `.github/ci/components.yml`) |
| **Port / DB** | Port `3006` · **MongoDB 8 (`badminton_notification`)** + **RabbitMQ** + **Mailpit SMTP (`mailpit:1025`)** |
| **Contract & Specs** | [contracts/notification/openapi.json](../../contracts/notification/openapi.json) · [contracts/events/domain-event.schema.json](../../contracts/events/domain-event.schema.json) · [W04-N3](../week-4/W04-N3_social-notification.md) · [W05-N3](../week-5/W05-N3_social-events.md) |
| **Trạng thái hiện tại** | **Contract Optimized / Code Skeleton (`folder-only`)** trên `main` |

---

## 1. Phạm vi & Nguyên tắc Thiết kế

`notification-service` là trung tâm nhận sự kiện bất đồng bộ từ toàn hệ thống, sinh thông báo trong ứng dụng (**in-app** bắt buộc) và gửi email khẩn cấp qua **SMTP/`Mailpit`**.

> **Nguyên tắc vàng:**
> - **Không quyết định nghiệp vụ gốc:** Lỗi ở Notification **không bao giờ** làm rollback giao dịch đặt sân, chuyển nhượng Pass hay bán hàng.
> - **At-least-once + Idempotent Consumer:** RabbitMQ có thể giao trùng tin nhắn → bắt buộc dedupe bằng unique key **`(eventId, recipientUserId, channel)`**.
> - **Outbox Relay từ Producer:** Khi tích hợp với `booking-core`, cần bổ sung worker đọc bảng `OutboxEvent` (PostgreSQL) đẩy sang RabbitMQ, giữ nguyên `event.id` qua mọi lần retry.

---

## 2. Danh mục Đầy đủ Sự kiện Toàn hệ thống cần Xử lý

### A. Sự kiện từ RabbitMQ (Domain Events v1)
| Event Type | Producer | Người nhận | Ghi chú xử lý |
| :--- | :--- | :--- | :--- |
| `booking.confirmed.v1` | `booking-core` | Chủ booking (`userId`) | Xác nhận đặt sân thành công (`booking.cancelled.v1` đã deprecated). |
| `booking.series-confirmed.v1` | `booking-core` | Chủ lịch cố định | Gom chuỗi 1–60 ngày thành **1 thông báo tổng hợp** (chống spam). |
| `booking.reminder.v1` | `booking-core` | Chủ booking (`T-24h` / `T-2h`) | Nhắc trước giờ chơi (kèm link tới Chợ Pass Sân nếu bận). |
| `booking.center-assigned.v1` | `booking-core` | `center_manager` | Báo khi `super_admin` bàn giao cơ sở mới (`DRAFT`) hoặc tạm dừng cơ sở. |
| `booking.pass-created.v1` | `booking-core` | `sellerUserId` *(tùy policy)* | Xác nhận bài pass đã lên sàn. |
| `booking.pass-interest-added.v1` | `booking-core` | `sellerUserId` | Báo có người chơi (`buyerUserId`) quan tâm bài nhượng. |
| `booking.pass-transferred.v1` | `booking-core` | `fromUserId` & `toUserId` | Báo hoàn tất chuyển nhượng vé giữa người bán và người mua. |
| `booking.pass-closed.v1` | `booking-core` | `sellerUserId` | Báo bài pass đã đóng (`CANCELLED` hoặc `EXPIRED`). |
| `social.message-created.v1` | `social-service` | `recipientUserIds` | Báo tin nhắn mới (tôn trọng mute/online state nếu có). |
| `content.news-submitted.v1` | `content-service` | **`super_admin`** | Báo có đề xuất Sự kiện/Giải đấu CLB mới chờ duyệt (`UC-07`). |
| `content.news-publication-changed.v1` | `content-service` | `authorUserId` (`center_manager`) | Báo kết quả duyệt (`PUBLISHED` / `REJECTED` / `ARCHIVED`). |
| `content.review-reported.v1` | `content-service` | **`super_admin`** | Báo có khiếu nại đánh giá xấu cần kiểm duyệt (`UC-08`). |
| `contract.status-changed.v1` | `commerce-service` | `managerId` (`center_manager`) | Nhắc hết hạn / gia hạn / tạm dừng HĐ B2B SaaS. |
| `commerce.sale-created.v1` | `commerce-service` | Tùy chọn | Biên nhận POS nếu gắn tài khoản khách. |

### B. Thông báo Chủ động từ Admin / Quản lý Sân (REST → Internal Event)
- **`notification.broadcast.v1`** (`POST /notifications/broadcast` — chỉ `super_admin`): phát toàn sàn theo `targetAudience` (`ALL` | `MANAGERS` | `PLAYERS`) và `priority`.
- **`notification.urgent.v1`** (`POST /notifications/urgent` — `center_manager` đúng cơ sở hoặc `super_admin`): cảnh báo sự cố khẩn tại sân (mất điện, dột mưa, đổi sân) tới toàn bộ khách có lịch hôm đó.

---

## 3. REST APIs & Tối ưu Kiến trúc ([contracts/notification/openapi.json](../../contracts/notification/openapi.json))

| Endpoint Native (`/api/v1/...`) | Gateway Path | Đặc tả & Tối ưu |
| :--- | :--- | :--- |
| `GET /notifications?unread=&cursor=&limit=` | `/api/notifications` | Chỉ trả thông báo của chính caller (`recipientUserId = actor.userId`, không admin bypass). Hỗ trợ các trường tối ưu `title`, `priority`, `deepLink` (`type`, `targetId`, `urlPath`), `readAt`. |
| `GET /notifications/unread-count` | `/api/notifications/unread-count` | Trả `{ unreadCount, urgentUnreadCount }` gọn nhẹ cho badge chuông trên Web/Admin. |
| `PUT /notifications/{notificationId}/read` | `/api/notifications/{notificationId}/read` | Chỉ owner được sửa (`isRead = true`, set `readAt`), idempotent (`204`). |
| `PUT /notifications/read-all` | `/api/notifications/read-all` | Đánh dấu đọc tất cả cho `actor.userId`, idempotent (`204`). |
| `POST /notifications/broadcast` | `/api/notifications/broadcast` | `super_admin` + `Idempotency-Key`. Trả `202 QUEUED` ngay, đưa `BroadcastCampaign` vào queue worker chia batch theo page thay vì insert đồng bộ hàng nghìn user vào MongoDB trong 1 request. |
| `POST /notifications/urgent` | `/api/notifications/urgent` | `center_manager` (phải kiểm tra ownership `centerId` ở `booking-core`) + `Idempotency-Key`. Kích hoạt cả **in-app (`URGENT`)** lẫn **Email fallback qua `Mailpit`/SMTP** (`MAILPIT_SMTP_HOST=mailpit:1025`). |
| `GET /health/live`, `GET /health/ready`, `GET /metrics` | Internal only | `/health/ready` kiểm tra cả MongoDB + RabbitMQ channel; `/metrics` đo backlog, DLQ count, rate lỗi delivery. |

---

## 4. Mô hình Retry & Dead-Letter Queue (DLQ)

1. Bắt buộc `noAck: false` trên RabbitMQ consumer.
2. **ACK** chỉ khi đã ghi bền vững `InboxEvent` + `Notification` vào MongoDB.
3. Lỗi tạm thời (timeout SMTP/DB) → **retry có exponential backoff** (tối đa `N` lần cấu hình) ghi vết vào `DeliveryAttempt`.
4. Vượt ngưỡng retry hoặc payload hỏng (không khớp `domain-event.schema.json`) → **`channel.nack(msg, false, false)`** đẩy sang **DLQ (`notification.dlq`)**, tăng Prometheus counter để Alertmanager cảnh báo.
