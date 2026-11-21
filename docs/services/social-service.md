# Social Service (`services/social-service`) — Đặc tả & Hướng dẫn Triển khai Đồng bộ

| Thuộc tính | Giá trị |
| :--- | :--- |
| **DRI / Owner** | Người 3 — Social Realtime · Notification |
| **Thư mục mục tiêu** | [`services/social-service/`](../../services/social-service/README.md) |
| **CI Component** | `@badminton/social-service` (`social_service` khi bật trong `.github/ci/components.yml`) |
| **Port / DB** | Port `3004` · **MongoDB 8** (lịch sử bền vững) + **Redis 7** (Socket.IO fan-out adapter) |
| **Contract & ADR** | [contracts/social/openapi.json](../../contracts/social/openapi.json) · [contracts/sockets/social-event.schema.json](../../contracts/sockets/social-event.schema.json) · [ADR-005](../week-5/adr/ADR-005.md) · [W04-N3](../week-4/W04-N3_social-notification.md) |
| **Trạng thái hiện tại** | **Skeleton (`folder-only`)** trên `main` (ưu tiên bù tiến độ Tuần 8) |

---

## 1. Phạm vi & Nguyên tắc Bảo mật Cốt lõi (`ADR-005`)

`social-service` quản lý kết bạn (`Friendship`) và trò chuyện realtime 1-1 (`PRIVATE` và **`PASS_BOOKING`** — đàm phán mua/nhượng slot trên Chợ Pass Sân). **Chủ quyền đổi chủ Booking vẫn thuộc `booking-core`**, Social không tự sửa quyền booking.

**Ba lỗi nghiêm trọng ở bản legacy bắt buộc phải tránh:**
1. **Không bao giờ nhận `senderId` / `userId` từ body hay Socket payload client:** Mọi danh tính `senderUserId` phải trích từ JWT Bearer token đã verify.
2. **Không cho đoán `roomId` (`conversationId`) để join/đọc lén:** Cả REST lẫn Socket.IO `joinConversation` / `sendMessage` phải kiểm tra `actor` thuộc `participantPair` (trả `403`, không lộ tên hay unread của phòng người khác).
3. **Không truyền token trên URL query string khi bắt tay Socket.IO:** Dùng `socket.handshake.auth.accessToken` + kiểm tra `Origin` allowlist.

---

## 2. Mô hình Dữ liệu MongoDB & Vòng đời `PASS_BOOKING`

| Collection | Trường & Unique Index bắt buộc | Quy tắc |
| :--- | :--- | :--- |
| `Friendship` | `id` (UUID), `requesterId`, `targetId`, `status` (`PENDING\|ACCEPTED`), unique sorted pair. | Không tự kết bạn với chính mình; chỉ `targetId` được `accept` (idempotent). |
| `Conversation` | `id` (UUID), `type` (`PRIVATE\|PASS_BOOKING`), `contextId` (`postId` khi pass, `null` khi private), `participants` (2 userId sắp xếp thứ tự), `writeAllowed` (`boolean`), `postStatus`. Unique `(type, contextId, participants)` cho `PASS_BOOKING` (**không** unique chỉ theo `contextId` vì 1 bài pass có thể có nhiều buyer hỏi mua). | Tạo `PASS_BOOKING`: gọi HTTP `booking-core` kiểm tra bài pass đang `ACTIVE`, lấy `sellerUserId` từ Core (không lấy từ client), derive buyer = caller, chống seller tự chat với chính mình. |
| `Message` | `id` (UUID), `conversationId`, `senderUserId`, `clientMessageId`, `content` (`1..4000` ký tự plain text, escape chống XSS khi render), `createdAt`. **Unique `(conversationId, senderUserId, clientMessageId)`**, index `(conversationId, createdAt, id)` cho cursor pagination. | **Persist vào MongoDB trước rồi mới ACK/emit.** Replay cùng `clientMessageId` trả về cùng `messageId` (`CH-04`), khác nội dung trả `409`. |
| `ReadCursor` | `(conversationId, userId)` → `lastReadMessageId` | Monotonic forward-only (chỉ tiến tới tin mới hơn trong cùng phòng). |

---

## 3. REST APIs & Socket.IO Protocol (`contracts/social` & `contracts/sockets`)

### REST APIs (`/api/v1/...` → qua Gateway `/api/social/...` để không trùng `/api/conversations` của AI)
- `GET /friendships`, `POST /friendships`, `PUT /friendships/{friendshipId}/accept`
- `GET /conversations`, `POST /conversations`
- `GET /conversations/{conversationId}/messages`, `POST /conversations/{conversationId}/messages`
- `PUT /conversations/{conversationId}/read`
- `GET /health/live`, `GET /health/ready` (kiểm tra Mongo + Redis/RabbitMQ nếu bật), `GET /metrics`

### Socket.IO Protocol (path `/socket.io`, namespace **`/social`**)
| Hướng | Tên Event | Quy tắc thực thi |
| :--- | :--- | :--- |
| **Handshake** | `auth.accessToken` | Verify JWT (`iss/aud/exp`) + `Origin` header. Hết hạn/thu hồi phải từ chối reconnect. |
| **Client → Server** | `joinConversation` | Kiểm membership + trạng thái phòng; fail-closed nếu không xác minh được quyền. |
| **Client → Server** | `sendMessage` | Kiểm membership + `writeAllowed` (nếu cache hết hạn, verify lại Core xem bài pass còn `ACTIVE`); persist Mongo → ghi `Outbox` / phát `social.message-created.v1` → `messageAck`. |
| **Client → Server** | `markRead`, `leaveConversation` | Kiểm `messageId` thuộc đúng `conversationId`; cập nhật `lastReadMessageId` monotonic. |
| **Server → Client** | `messageAck`, `newMessage`, `readReceipt`, `conversationUpdated`, `error` | `error` chỉ trả `{ code, message, requestId }`, tuyệt đối không lộ token hay stacktrace. |

---

## 4. Đồng bộ Sự kiện RabbitMQ & Giao thông Ingress

- **Consume từ `booking-core`:**
  - `booking.pass-transferred.v1` và `booking.pass-closed.v1` (`CANCELLED` / `EXPIRED`): chuyển các conversation của `postId` tương ứng sang **`writeAllowed: false` (read-only)** và emit `conversationUpdated` cho các socket đang mở (lưu ý: `fail-closed` khi cache quá hạn — tức mất event cũng không cho gửi tin mới vào bài pass đã đóng).
- **Produce sang `notification-service`:**
  - `social.message-created.v1` chứa `conversationId`, `messageId`, `senderUserId`, `recipientUserIds`.
- **Nginx / Ingress Gateway:** Đường `/socket.io` (upgrade WebSocket) phải cho phép đi trực tiếp tới `social-service` với timeout WebSocket phù hợp trong `badminton-gitops` (`nginx-ingress` annotations), còn REST `/api/social/*` đi qua `services/api-gateway`.
- **Redis Pub/Sub Adapter:** Chỉ dùng để fan-out event realtime giữa nhiều Pod `social-service` — khi rớt mạng/reconnect, client luôn lấy lại lịch sử bằng REST cursor từ MongoDB.
