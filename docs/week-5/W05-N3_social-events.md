# W05-N3 — Socket contract, event catalog và ADR

| Thuộc tính | Giá trị |
| --- | --- |
| DRI | Người 3 — Social Realtime · Notification |
| Peer reviewer của task | Người 5 |
| Deliverable gốc, ô H9 | Socket contract + event catalog + ADR |
| Ưu tiên / giờ dự kiến | P0 / 8 giờ |
| Phụ thuộc | W4 chat rules; W5 boundary |
| Definition of Done gốc | JWT/room ACL, message store, notification retry thống nhất. |
| Nguồn kế hoạch | Sheet “Kế hoạch 10 tuần”, A9:O9 |
| Đầu ra của tuần | Tài liệu thiết kế kỹ thuật và contract |

Tài liệu trình bày thiết kế trong tuần 5: ranh giới thành phần, mô hình dữ liệu và contract làm đầu vào cho giai đoạn triển khai.

## Lựa chọn transport và store

| Lựa chọn | Lợi ích | Trade-off / đề xuất |
| --- | --- | --- |
| Socket.IO | Reconnect, room, ack phù hợp chat realtime | Có protocol/adapter riêng; dùng cho Social để thống nhất reconnect và room semantics |
| Raw WebSocket | Ít protocol overhead | Phải tự xây ack/reconnect/rooms, không chọn ban đầu |
| MongoDB | Dữ liệu conversation/message dạng document, index linh hoạt | Cần unique/durable write và transaction/outbox phù hợp; không dùng để lock booking |
| Redis adapter | Fan-out room giữa nhiều Social replicas | Pub/sub không durable; history luôn lấy Mongo |
| RabbitMQ | Durable async event, retry/DLQ | Không làm bus đồng bộ cho mỗi message hoặc lock transfer |

Phân tích lựa chọn transport được lưu ở [ADR-005](../adr/ADR-005.md); thiết kế platform/retry ở ADR-009. Redis phục vụ fan-out, RabbitMQ phục vụ event delivery; cả hai có trách nhiệm riêng trong thiết kế.

## REST namespace và Socket protocol

REST Social đặt `/api/social/...` để không đụng **`/api/conversations` đang thuộc AI**. External Socket.IO path `/socket.io`, namespace `/social` là proposal; Nginx route trực tiếp Social, HTTP Gateway vẫn verify REST. Path/namespace là phần contract, không coi namespace là bảo mật.

| Direction / event | Payload chính | Guard / semantics |
| --- | --- | --- |
| handshake auth | accessToken | Verify signature/issuer/audience/exp, allowed origin; không truyền token query |
| C→S joinConversation | conversationId | Verify membership + lifecycle, join room sau guard |
| C→S sendMessage | conversationId,clientMessageId,content | Server derive sender, active context, rate/size, persist trước ack |
| C→S markRead | conversationId,messageId | Message trong room, read cursor chỉ tiến |
| C→S leaveConversation | conversationId | Chỉ rời room của connection hiện tại |
| S→C messageAck | messageId,clientMessageId,conversationId | Persisted ack; duplicate trả cùng messageId |
| S→C newMessage | Message object | Chỉ room members; không chứng minh đã đọc |
| S→C readReceipt | conversationId,userId,messageId | Thành viên được phép thấy |
| S→C conversationUpdated | conversationId,writeAllowed | Khi SOLD/EXPIRED/CANCELLED hoặc membership đổi |
| S→C error | code,requestId | Không trả token/stack trace |

Schema nghiêm ngặt cho event payload ở [socket.schema.json](../../contracts/sockets/social-event.schema.json). Unknown event/payload field bị từ chối. Nội dung text 1–4000 ký tự là đề xuất, limit/rate phải cấu hình và review.

## Schema và index

Conversation: public UUID id, type PRIVATE/PASS_BOOKING, contextId=postId khi pass, sorted participant pair, writeAllowed/status, createdAt/updatedAt. Unique `(type,contextId,participantPair)` cho pass; PRIVATE unique pair riêng. Không unique contextId đơn lẻ vì một post có nhiều buyer.

Message: UUID id, conversationId,senderUserId,clientMessageId,content,createdAt; unique `(conversationId,senderUserId,clientMessageId)`, index `(conversationId,createdAt,id)` để cursor ổn định. Persist bằng write concern thích hợp; outbox same local transaction cho notification khi cần. Các index và transaction này là đầu vào cho schema/migration ở giai đoạn triển khai.

## Event catalog và delivery

| Event | Producer | Consumers | Payload bắt buộc |
| --- | --- | --- | --- |
| booking.confirmed.v1, booking.cancelled.v1 | Core outbox | Notification, projection | Giữ nguyên [schema hiện tại](../../contracts/events/booking-event.schema.json) |
| booking.pass-created.v1 | Core pass | Projection, Notification tùy policy | postId,bookingId,sellerUserId,expiresAt |
| booking.pass-interest-added.v1 | Core pass | Notification | postId,sellerUserId,buyerUserId |
| booking.pass-transferred.v1 | Core | Social, Notification | transferId,postId,bookingId,fromUserId,toUserId |
| booking.pass-closed.v1 | Core | Social, Notification | postId,status=CANCELLED/EXPIRED |
| identity.user-updated.v1 | Identity | Domain projections | userId,isActive,role,version |
| commerce.sale-created.v1 | Commerce | Reporting/Notification nếu bật | saleId,centerId,totalAmount,currency |
| social.message-created.v1 | Social | Notification | conversationId,messageId,senderUserId,recipientUserIds |

Mỗi event có immutable id; publisher outbox retry cùng id. At-least-once, không tuyên bố exactly-once. Inbox/dedupe theo event và consumer; event version trên identity/projection để chống out-of-order, transfer phải đối soát Core nếu thiếu sự kiện. Event envelope mới giữ tên trường id/type/aggregateId/createdAt/payload quen Core, thêm metadata cho loại mới; không đổi schema hai loại booking đang chạy.

ACK sau persist; retry có backoff, giới hạn cấu hình và DLQ với alert; replay giữ nguyên eventId. TTL, retention và ngưỡng retry là tham số cấu hình của consumer/platform. Social không được chỉ tin eventual close event để cấp write vô hạn: kiểm trạng thái Core lúc tạo room và khi gửi sau cache expiry, fail-closed nếu không xác minh được post active.

## Threat model và kịch bản kiểm thử

Giả senderId, room enumeration, token expired/revoked, oversized message, replay clientMessageId khác content, event duplicate/out-of-order, missing close event, Redis restart và disconnect sau DB commit đều cần negative/integration scenarios. Bộ kịch bản này được dùng để viết contract/integration tests khi triển khai Social và Notification.

## Đầu ra tài liệu và bàn giao

- Socket protocol, JWT/room ACL, conversation/message schema và indexes.
- Event catalog, delivery/retry/deduplication và threat scenarios.
- Đầu vào liên quan: [Socket contract](../../contracts/sockets/social-event.schema.json).
