# W06-N3 — Social Service Skeleton, Mongo & Socket.IO PoC

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W06-N3 |
| Tuần | 6 |
| Người phụ trách (DRI) | Người 3 — Social Realtime · Notification |
| Người duyệt chéo (Peer Reviewer) | Người 4 — Identity · Commerce · Content |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (100%)** |

## 1. Mục tiêu công việc

Thiết lập nền móng cho dịch vụ giao tiếp thời gian thực `services/social-service` dựa trên NestJS:
- Cấu hình kết nối cơ sở dữ liệu MongoDB phục vụ lưu trữ phòng chat và tin nhắn.
- Khởi tạo máy chủ WebSockets bằng Socket.IO server.
- Xây dựng mô hình dữ liệu phòng chat (Conversation) và tin nhắn (Message).
- Khởi tạo khung người tiêu thụ sự kiện (Consumer) từ hàng đợi RabbitMQ để gửi thông báo.

## 2. Kết quả bàn giao cụ thể

1. **Thư mục dịch vụ:** `services/social-service` hoạt động trên port 3002.
2. **Lược đồ MongoDB (Mongoose Schema):**
   - `ConversationSchema`: Quản lý phòng chat, hỗ trợ loại phòng `PASS_BOOKING` gắn liền với mã bài đăng `passPostId` và danh sách thành viên `memberIds`.
   - `MessageSchema`: Lưu trữ nội dung tin nhắn, thời gian gửi, trạng thái đã đọc (`readBy`).
3. **WebSocket Gateway PoC:**
   - Tiếp nhận kết nối WebSockets từ client.
   - Xử lý sự kiện bắt tay (handshake) và kiểm tra kết nối ping/pong mượt mà.
4. **Khung thông báo RabbitMQ:**
   - Kết nối tới RabbitMQ exchange, sẵn sàng tiếp nhận các sự kiện miền như `PASS_TRANSFERRED`, `PASS_INTERESTED`.

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [x] Service khởi động kết nối MongoDB 8 thành công, không gặp tình trạng crash loop.
- [x] Client WebSockets bắt tay (handshake) thành công qua Socket.IO.
- [x] Sẵn sàng kiến trúc phòng chat riêng tư có bảo vệ mã token JWT cho Tuần 7.
- [x] Vượt qua kiểm định chất lượng mã nguồn CI trên GitHub Actions.

## 4. Kế hoạch Tuần 7 tiếp theo

- Thực hiện task **W07-N3**: Lập trình phòng chat riêng tư có xác thực JWT token (server tự lấy `userId` từ token), kiểm tra quyền thành viên phòng chat (`memberIds.includes(userId)`), chặn đứng việc đọc trộm tin nhắn.
