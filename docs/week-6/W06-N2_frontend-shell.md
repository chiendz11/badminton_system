# W06-N2 — React Frontend Shell & Marketplace Mocks

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W06-N2 |
| Tuần | 6 |
| Người phụ trách (DRI) | Người 2 — Pass Marketplace · Frontend |
| Người duyệt chéo (Peer Reviewer) | Người 1 — Tech Lead · Booking Core |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (100%)** |

## 1. Mục tiêu công việc

Xây dựng bộ khung giao diện ứng dụng Web người dùng (`apps/web`) và trang quản trị (`apps/admin`):
- Khởi tạo dự án React 18 hiện đại với Vite và Tailwind CSS.
- Thiết lập kiến trúc thư mục chuẩn mực: `components`, `pages`, `hooks`, `layouts`, `services`.
- Cấu hình hệ thống định tuyến (React Router DOM) phân luồng người dùng mượt mà.
- Xây dựng bố cục dùng chung (Main Layout, Navigation Bar, Header, Footer).
- Tạo các màn hình khung cơ sở và mock giao diện Chợ Pass sân.

## 2. Kết quả bàn giao cụ thể

1. **Khung ứng dụng Web (`apps/web`):** Chạy độc lập trên port 3000 (local dev).
2. **Các màn hình cơ sở:**
   - **Trang chủ (`Home`):** Banner giới thiệu hệ thống, danh sách cơ sở sân nổi bật, thanh tìm kiếm nhanh.
   - **Trang Đặt sân (`Booking`):** Khung chọn ngày, chọn sân con, ma trận khung giờ chơi 60 phút.
   - **Trang Lịch sử đặt vé (`My Bookings`):** Danh sách các vé đã đặt kèm nút hành động "Đăng bài pass".
   - **Chợ sang nhượng vé (`Pass Market`):** Khung danh sách bài đăng pass vé kèm bộ lọc theo giá, ngày, cơ sở và nút "Quan tâm".
3. **Khung trang quản trị (`apps/admin`):** Chạy trên port 5173, cung cấp layout dashboard dành cho Chủ sân/Admin.
4. **Kiểm thử giao diện:** Tốc độ tải trang dưới 1.5 giây, chuyển đổi qua lại giữa các menu tức thì, không có lỗi console, responsive tốt trên cả Desktop và Mobile.

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [x] Chạy lệnh `pnpm dev:web` và `pnpm dev:admin` mở trình duyệt hiển thị tốt, không trắng trang.
- [x] Điều hướng giữa các menu hoạt động mượt mà, chuyển trang không cần reload toàn bộ website.
- [x] Khung màn hình Chợ Pass và Đặt sân sẵn sàng các điểm gắn kết API để nhận dữ liệu thật từ Tuần 7.
- [x] Pipeline CI GitHub Actions (`web (frontend)` & `web (admin)`) chạy xanh 100% (Typecheck & Build).

## 4. Kế hoạch Tuần 7 tiếp theo

- Thực hiện task **W07-N2**: Nối màn hình Đặt sân trên Web vào API thật của Booking Core (`/availability` và `/reservations`) thay vì sử dụng mock data.
