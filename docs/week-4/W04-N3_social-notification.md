# W04-N3 — Chat business rules và notification scenarios

| Thuộc tính | Giá trị |
| --- | --- |
| DRI theo kế hoạch | Người 3 — Social Realtime · Notification |
| Peer reviewer của task | Người 4 |
| Deliverable gốc, ô H4 | Chat business rules + message/notification scenarios |
| Ưu tiên / giờ dự kiến | P0 / 8 giờ |
| Phụ thuộc | Workshop chung |
| Definition of Done gốc | Quy tắc phòng chat & notifications có ngoại lệ rõ. |
| Nguồn kế hoạch | Sheet “Kế hoạch 10 tuần”, A4:O4 |
| Đầu ra của tuần | Tài liệu phân tích nghiệp vụ |

Tài liệu trình bày kết quả phân tích trong tuần 4: phạm vi, quy tắc nghiệp vụ và tiêu chí nghiệm thu làm đầu vào cho thiết kế tuần 5.

## Domain và quyền hội thoại

Social quản lý friendship và hội thoại. Thiết kế phân biệt chat riêng giữa bạn bè với PASS_BOOKING — hội thoại giữa người bán và người quan tâm một bài nhượng. Logic đổi chủ booking thuộc Booking Core; Social chỉ quản lý trao đổi và quyền hội thoại.

| Loại | Điều kiện tạo | Ai xem/gửi | Khi trạng thái thay đổi |
| --- | --- | --- | --- |
| PRIVATE | Hai người đã kết bạn theo rule hiện hành | Hai thành viên server xác nhận | Chặn/ngắt friendship cần chính sách riêng |
| GROUP | Ngoài phạm vi chat tối thiểu của MVP | Thành viên đã được duyệt | Không tự cho join từ roomId |
| PASS_BOOKING | Buyer vào từ ACTIVE post; seller lấy từ Core | Một seller và một buyer; unique context/post/pair | Post hết hạn/sold/cancelled → đề xuất read-only |

Actor lấy từ JWT đã verify, không lấy senderId/userId do client tự gửi. Người bán không đọc chat giữa người bán khác và buyer; người quan tâm khác không tự trở thành thành viên phòng.

## Business scenarios và ngoại lệ

| ID | Tình huống | Kết quả yêu cầu |
| --- | --- | --- |
| CH-01 | Buyer bấm chat bài ACTIVE không kết bạn | Tạo/reuse PASS_BOOKING conversation, server kiểm Core và membership |
| CH-02 | Client đoán roomId của người khác | 403 ở REST/join/send; không leak tên, lịch sử hoặc unread |
| CH-03 | JWT hết hạn hoặc bị revoke | Từ chối handshake/action mới; client phải refresh/reconnect |
| CH-04 | Gửi lại cùng clientMessageId sau timeout | Trả message đã lưu; không tạo message/unread/notification mới |
| CH-05 | Disconnect rồi reconnect | Fetch history bằng cursor từ DB; Redis không bù lịch sử |
| CH-06 | Transfer/hết hạn xảy ra trong khi chat | Social nhận event và đối soát; fail-closed gửi mới khi không xác minh được ACTIVE |
| CH-07 | Tin nhắn HTML/script hoặc quá dài | Lưu text đã validate, escape render, giới hạn kích thước và rate |
| CH-08 | Hai request tạo room đồng thời | Unique context + pair, trả cùng room; không hai luồng lịch sử |

Trong thiết kế, trạng thái read-only sau SOLD áp dụng cho cả người nhận booking và người mua không được chọn. Việc đọc lịch sử, xóa/ẩn tin và thời gian lưu tuân theo policy quyền riêng tư; trạng thái bài nhượng không cho phép người ngoài trở thành thành viên hội thoại.

## Unread và delivery semantics

Persist message rồi mới emit. `lastReadMessageId` theo thành viên, chỉ dịch tiến đến message trong đúng conversation; unread tính từ persisted cursor. “Socket ACK” chỉ chứng minh message đã nhận/lưu, không chứng minh người nhận đã đọc. Read-receipt phải là hành động riêng có quyền.

Notification là hậu quả của sự kiện, không phải điều kiện để booking/transfer thành công. Nguồn sự thật là Core/Social; thông báo không được đổi booking state.

| Nguồn sự kiện | Người nhận | Nội dung tối thiểu |
| --- | --- | --- |
| booking.confirmed.v1 / cancelled.v1 | Booking owner | bookingId + loại kết quả, không token |
| booking.pass-interest-added.v1 | Seller | postId + buyerId tham chiếu |
| booking.pass-transferred.v1 | Seller cũ, receiver | bookingId/postId, không gửi toàn bộ hồ sơ |
| social.message-created.v1 | Thành viên còn lại, tùy mute/online | conversationId/messageId; hạn chế log/nội dung nhạy cảm |

Dedupe unique `(eventId, recipientId, channel)`; retry không nhân thông báo. ACK RabbitMQ sau persist, bounded retry có backoff, DLQ sau ngưỡng cấu hình. Lỗi consumer phải đi vào cơ chế retry hoặc DLQ thay vì bị bỏ qua.

## Acceptance criteria

- Token sai/expired, guessed room, giả senderId đều bị từ chối; có bảng threat cases ở tuần 5.
- Broker duplicate hoặc reconnect không làm tăng message/notification count.
- Notification lỗi không rollback transfer; có event/outbox và công cụ retry để sửa hậu quả.
- API read/read-all chỉ sửa notification thuộc caller; eventId và requestId truy vết được nhưng không gắn PII làm metric label.
- Phạm vi thông báo tối thiểu là in-app; email/push là kênh mở rộng. Retention, block user và đồng bộ unread nhiều thiết bị tuân theo policy của Social/Notification.

## Đầu ra tài liệu và bàn giao

- Quy tắc conversation/membership, 8 chat scenarios và unread/delivery semantics.
- Event-to-notification mapping, deduplication, retry và acceptance criteria.
- Đầu vào liên quan: [Socket/event contract tuần 5](../week-5/W05-N3_social-events.md).
