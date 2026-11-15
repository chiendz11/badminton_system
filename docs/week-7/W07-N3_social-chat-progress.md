# W07-N3 — Social 1-1 Chat Progress & Recovery Plan

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W07-N3 |
| Tuần | 7 |
| Người phụ trách (DRI) | Người 3 — Social Realtime · Notification |
| Người duyệt chéo (Peer Reviewer) | Người 4 — Identity · Commerce · Content |
| Ưu tiên | P0 |
| Trạng thái | **CHẬM TIẾN ĐỘ (20% - ĐÃ LẬP KẾ HOẠCH BÙ P0)** |

---

## 1. Mục tiêu công việc

- Xây dựng dịch vụ nhắn tin riêng tư 1-1 (`services/social-service`) phục vụ việc trao đổi, đàm phán pass sân giữa người nhượng và người mua.
- Tích hợp xác thực phiên WebSocket qua JWT handshake (Socket Guard).
- Lưu trữ lịch sử tin nhắn vào MongoDB và xuất bản sự kiện thông báo qua RabbitMQ.

---

## 2. Hiện trạng thực tế & Nguyên nhân chậm tiến độ

### 2.1. Khối lượng đã hoàn thành (20%)
- Khởi tạo máy chủ Socket.IO trên cổng độc lập, tiếp nhận kết nối handshake cơ bản.
- Thiết kế sơ bộ Schema MongoDB: `Conversation` (gắn liền với `bookingId` hoặc `passId`) và `Message` (người gửi, nội dung, thời gian).

### 2.2. Khối lượng chưa hoàn tất (80%)
- Chưa hoàn thành module xác thực token JWT khi thiết lập kết nối WebSocket (`socket.handshake.auth.token`).
- Chưa kết nối lưu trữ lịch sử tin nhắn thực tế vào MongoDB 8 trong môi trường container.
- Chưa có bộ kiểm thử tự động (Unit Test / Integration Test) đạt chuẩn yêu cầu của CI.

### 2.3. Nguyên nhân chính
- Người 3 gặp khó khăn trong việc đồng bộ chuẩn xác thực JWT bí mật chung giữa `identity-service` và `social-service`.
- Cần thời gian tìm hiểu cơ chế phân quyền thành viên phòng chat (chỉ người bán và người mua mới được truy cập nội dung trao đổi).

---

## 3. Kế hoạch Bù tiến độ Khẩn cấp (Recovery Plan P0)

Nhóm đã họp kỹ thuật và thống nhất giải pháp hỗ trợ chéo:
1. **Phân công hỗ trợ kỹ thuật:**
   - **Người 1 (Tech Lead):** Trực tiếp hướng dẫn Người 3 tích hợp thư viện kiểm tra JWT chung (`@badminton/identity-contract` hoặc secret HMAC-SHA256).
   - **Người 4:** Hỗ trợ cấu hình MongoDB Mongoose Repository và viết bộ test tự động mẫu bằng Vitest.
2. **Lộ trình hoàn thành bù (48 giờ đầu Tuần 8):**
   - *Ngày 1 (Thứ 2):* Hoàn thành JWT Socket Guard và API tạo phòng chat theo `passId`.
   - *Ngày 2 (Thứ 3):* Hoàn thiện kịch bản lưu tin nhắn MongoDB và mở Pull Request mới trên GitHub để chạy kiểm thử CI/CD.

---

## 4. Cam kết đầu ra cho Tuần 8

- Đảm bảo tính năng chat 1-1 hoạt động trơn tru trên cả Web và Admin trước khi mở cổng giao dịch Chợ Pass Sân.
- Đạt 100% tỷ lệ pass các checks CI/CD trên GitHub Actions.
