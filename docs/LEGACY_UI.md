# UI gốc: phạm vi và cách nối gateway

Nguồn: [Badminton_manager_microservices, commit 484d381e](https://github.com/chiendz11/Badminton_manager_microservices/tree/484d381e873f513ed4faa4413407502112f4885d), lấy từ GitHub archive, không lấy các thay đổi chưa commit trong checkout ứng dụng cũ. [legacy-ui-provenance.json](legacy-ui-provenance.json) ghi mapping từng file nguồn → file trong workspace mới. JSX/CSS/ảnh gốc được đưa vào `apps/web` và `apps/admin`; không dùng UI thiết kế lại ở commit trước.

## Màn hình giữ lại

Phạm vi hiện tại chỉ có Booking Core và AI. JSX/CSS/layout của Booking Core được giữ từ repo nguồn; các section/feature/API client khác đã được xóa khỏi checkout này.

| Ứng dụng | Màn hình |
| --- | --- |
| Web | Trang chủ giới thiệu đặt sân; danh sách/chi tiết trung tâm; bảng đặt sân 05:00–24:00; lịch sử/hủy/ẩn và thống kê booking; trang AI `/booking-assistant` |
| Admin | Dashboard thẻ Booking Core; trạng thái sân; đơn booking; lịch cố định; quản lý trung tâm/sân/bảng giá và phân công manager theo directory host |

Xóa UI/API client Identity/profile CRUD, Commerce/kho/bán hàng/báo cáo, Content/news/rating, Social/bạn bè/chat, Notification, Storage upload, giải đấu và weather widget. Pass/payment/login vẫn được loại như trước. Rating trong card/modal sân được bỏ; không gọi Rating API. Form centre giữ dữ liệu/courts/pricing và bỏ file upload; khi sửa không gửi image fields để tránh xóa metadata cũ. Footer giữ thiết kế gốc, nút chat dẫn tới AI thật; ChatBox mock/social đã bị xóa.

`MyBookings.jsx`, `HistoryTab.jsx`, `StatusTab.jsx`, `PopularTimeChart.jsx` được tách từ UI profile gốc sang `features/booking`, chỉ giữ history/statistics. URL mới `/my-bookings`; `/profile` là alias redirect để link cũ không mở lại Identity UI. Card thống kê điểm thành viên, cột phương thức thanh toán và filter chờ thanh toán đã bỏ; history filter dùng confirmed/cancelled. Quote/discount của Booking Core vẫn giữ.

Booking giữ bảng giờ 05:00–24:00, chọn sân/giờ và modal gốc. Modal xác nhận gọi `POST /api/booking/pending/pendingBookingToDB`; gateway giữ chỗ rồi xác nhận trực tiếp tại Core và trả booking confirmed thật, refresh lịch và ở lại bảng. Không gọi payment. Client giữ Idempotency-Key khi retry chưa biết kết quả; giá cuối lấy từ Core. History giữ nút hủy cho booking confirmed chưa bắt đầu, nút xóa cho booking đã hủy/đã kết thúc; xóa chỉ ẩn khỏi lịch sử cá nhân. Các nút hủy/xóa lịch sử vẫn dùng PATCH/DELETE gốc. Booking fixed dùng API admin gốc.

## Gateway và session

Client giữ endpoint booking/centre, payload theo giờ, GraphQL variables và response envelope gốc. Các client API thuộc service khác đã xóa. `/api/user/.../booking-history`, `/api/user/me/statistics` và `/api/user/me/exists-pending-booking` là read models Booking Core qua gateway, không gọi User/Identity service.

Chạy Vite:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
# DEV_API_GATEWAY_URL mặc định http://localhost:8081 (gateway mới).
# VITE_API_GATEWAY_URL để trống nếu dùng proxy, hoặc đặt URL có CORS.
pnpm dev:gateway
pnpm dev:web
pnpm dev:admin
```

Docker Nginx proxy `/api/`, `/graphql` và SPA routes; bỏ socket proxy. `API_GATEWAY_URL` là runtime upstream, mặc định `http://gateway:8081` trong Compose; `http://host.docker.internal:8081` nếu gateway chạy trên host. `VITE_API_GATEWAY_URL`/`VITE_CLIENT_ID` là build config nếu cần; CORS/session phải được gateway cấu hình tương ứng. Ảnh/fonts remote từ UI gốc vẫn cần kết nối mạng.

Không tích hợp đăng nhập trong hai app này. Host/Identity integration có thể cung cấp trước khi entrypoint chạy:

```js
window.__BADMINTON_SESSION__ = {
  accessToken: tokenFromIdentity,
  profile: hostProfile,
};
```

Đây là interface JavaScript trong browser, không phải HTTP API mới. Không đặt token thật vào repo hoặc build env. Provider chuẩn hóa `_id`/`userId` của profile cho component gốc; Axios đọc token hiện tại khi gửi request. Không có profile thì các màn hình công khai vẫn render; API cần quyền có thể trả 401/403. Browser profile/role không cấp quyền trên server. Khi token hết hạn, host phụ trách session; app không tự refresh hoặc điều hướng sang màn hình login.

## Ranh giới với Booking Core mới

`services/api-gateway` chuyển REST/GraphQL gốc sang Core v1, đổi giờ sang phút và đổi response envelope; không dùng booking/center service cũ hoặc federation cũ. Booking Core sở hữu PostgreSQL, phân quyền và transaction; gateway không đọc/ghi DB. Chi tiết route và provenance ở [API_GATEWAY.md](API_GATEWAY.md).

Để chọn khách tạo lịch cố định và phân công manager mà không nhập Identity APIs vào gateway, host cấp directory trước entrypoint Admin:

```js
window.__BADMINTON_BOOKING_CUSTOMERS__ = customersFromHost;
window.__BADMINTON_CENTER_MANAGERS__ = managersFromHost;
```

Khách có `userId` (hoặc `_id`), `name`/`username`, `phone_number`, `email`; manager có `userId`, `name`, `role`, `isActive`. Không cung cấp directory thì dropdown trống; catalogue vẫn tải. Đây là dữ liệu để chọn/render, không cấp quyền server. Gateway không xác minh sự tồn tại của khách trong Identity; Core lưu external user ID/name do manager được phân quyền chọn. Discount loyalty khi đặt hộ cần bổ sung Identity lookup sau.

Gateway chỉ phục vụ Booking Core và AI; API các miền khác trả 404 và không còn client/màn hình gọi chúng. Ảnh tĩnh của source vẫn phục vụ giao diện; không có Storage backend/upload.

Unit/consumer tests có mock ở ranh giới riêng; gateway integration dùng Core và PostgreSQL thật. Browser kiểm tra phạm vi mới với Web/Admin production build qua Vite preview → gateway → Core/PostgreSQL thật: đặt sân, lịch sử/hủy, thống kê, sửa centre và màn hình AI. Kết quả Nginx/lịch cố định/ẩn history của lần trước được giữ riêng trong lịch sử validation. Xem [VALIDATION.md](VALIDATION.md).
