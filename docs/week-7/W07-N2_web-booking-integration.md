# W07-N2 — Web Booking Integration & Auth Shell

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W07-N2 |
| Tuần | 7 |
| Người phụ trách (DRI) | Người 2 — Pass Marketplace · Frontend |
| Người duyệt chéo (Peer Reviewer) | Người 1 — Tech Lead · Booking Core |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (85%)** |

---

## 1. Mục tiêu công việc

- Thay thế toàn bộ mock data tĩnh trên ứng dụng `apps/web` bằng dữ liệu thực tế từ backend thông qua API Gateway.
- Xây dựng ma trận đặt sân trực quan, hỗ trợ chọn ngày, xem sân trống và hiển thị trạng thái slot thời gian thực.
- Tích hợp cửa sổ đăng nhập / đăng ký Identity MVP vào thanh điều hướng Header.
- Xây dựng màn hình xem danh sách lịch sử đặt chỗ cá nhân (`/history`).

---

## 2. Điểm kỹ thuật cốt lõi

### 2.1. Ma trận đặt sân theo thời gian thực (Interactive Booking Grid)
- Địa chỉ truy cập: `/booking?centerId=11111111-1111-4111-8111-111111111111`.
- Kết nối kép:
  1. **GraphQL Query (`/graphql`):** Truy vấn thông tin trung tâm, tổng số sân và danh sách sân con (`courtId`, `name`).
  2. **REST API (`/api/booking/pending/mapping`):** Truy vấn trạng thái chi tiết của 19 khung giờ (từ 05:00 đến 23:00) cho từng sân.
- Phân định trạng thái trực quan bằng mã màu chuẩn Tailwind CSS:
  - 🟢 **Trống:** Màu trắng / viền xanh lá, sẵn sàng click chọn.
  - 🟡 **Pending (Đang giữ chỗ):** Màu vàng, có đồng hồ đếm ngược 10 phút.
  - 🔴 **Đã đặt:** Màu đỏ, không thể chọn.
  - ⚫ **Locked / Quá giờ:** Màu xám, vô hiệu hóa tương tác.

### 2.2. Modal Đăng nhập Identity MVP
- Tích hợp component `LoginModal.jsx` với thiết kế 2 cột:
  - Cột trái: Nhận diện thương hiệu Badminton Manager, lời chào và biểu tượng thể thao.
  - Cột phải: Form nhập email, mật khẩu với icon ẩn/hiện mật khẩu, nút Submit có loading state.
- Lưu trữ phiên đăng nhập chuẩn qua `SessionContext`: Token được lưu trong `localStorage` (`badminton_user`) và tự động gắn vào Header `Authorization: Bearer <token>` của các request tiếp theo.

### 2.3. Màn hình Lịch sử Đặt sân (`/history`)
- Liệt kê các vé đã đặt thành công kèm mã đặt chỗ, thời gian thi đấu và số tiền đã thanh toán.
- Thiết kế sẵn nút hành động "Sang nhượng sân (Pass sân)", sẵn sàng kết nối sang Chợ Pass Sân ở Tuần 8.

---

## 3. Tiêu chí nghiệm thu & Kết quả thực tế

- [x] Không còn sử dụng mock data cục bộ; 100% dữ liệu lấy từ API Gateway.
- [x] Giao diện responsive trên cả máy tính bàn (Desktop 1440px) và thiết bị di động.
- [x] Đăng nhập thành công cập nhật tên người dùng lên Header ngay lập tức.
- [!] **Còn 15% khối lượng:** Hoàn thiện giao diện thanh toán tích hợp PayOS QR Code (dời sang Tuần 8 song hành cùng tính năng Escrow).

---

## 4. Kế hoạch Tuần 8 tiếp theo

- Xây dựng giao diện sàn giao dịch Chợ Pass Sân (`/pass-market`) cho phép người mua lọc vé theo ngày, giá và vị trí cụm sân.
- Tích hợp khung chat 1-1 nổi trên giao diện khi người mua bấm "Thương lượng với người pass".
