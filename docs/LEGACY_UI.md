# UI gốc: phạm vi và cách nối gateway

Nguồn: [Badminton_manager_microservices, commit 484d381e](https://github.com/chiendz11/Badminton_manager_microservices/tree/484d381e873f513ed4faa4413407502112f4885d), lấy từ GitHub archive, không lấy các thay đổi chưa commit trong checkout ứng dụng cũ. [legacy-ui-provenance.json](legacy-ui-provenance.json) ghi mapping từng file nguồn → file trong workspace mới. JSX/CSS/ảnh gốc được đưa vào `apps/web` và `apps/admin`; không dùng UI thiết kế lại ở commit trước.

## Màn hình giữ lại

| Ứng dụng | Màn hình                                                                                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web      | Trang chủ, danh sách/chi tiết trung tâm + đánh giá, booking, tin tức, chính sách, liên hệ, giải đấu, dịch vụ/danh mục sản phẩm, hồ sơ và thống kê/lịch sử, hồ sơ mở rộng, bạn bè/tin nhắn/tìm bạn, thông báo                |
| Admin    | Dashboard, tài khoản/hồ sơ, đơn booking + chi tiết, trạng thái sân, quản lý trung tâm/sân/bảng giá/ảnh, lịch cố định, kho/nhập kho, lịch sử bán hàng, báo cáo, người dùng, quản lý trung tâm của manager, tin tức, đánh giá |

Bỏ route/component/API pass sân; payment/PayOS/QR/checkout; login/register/OAuth/refresh/logout/reset/change-password. Manager còn danh sách, sửa hồ sơ, khóa/mở khóa và xem phân công; tạo tài khoản kèm mật khẩu thuộc Identity nên không giữ card tạo manager mới. Shop giữ lịch sử bán hàng, không có modal thu tiền. Dịch vụ giữ catalogue và giỏ chọn sản phẩm, không có checkout. Giá/đơn giá/báo cáo/lịch sử vẫn hiển thị dữ liệu nghiệp vụ gốc. Widget ChatBox ở footer còn dữ liệu bạn bè/tin nhắn mẫu của nguồn gốc; các tab social trong profile dùng API riêng. Các trung tâm mẫu và nội dung quảng bá trong một số màn hình cũng được giữ, không coi đó là dữ liệu production.

Booking giữ bảng giờ 05:00–24:00, chọn sân/giờ và modal gốc. Modal xác nhận gọi `POST /api/booking/pending/pendingBookingToDB`, hiển thị mã **giữ chỗ**, refresh lịch và ở lại bảng. Không gọi payment, không giả lập xác nhận booking đã hoàn tất. Các nút hủy/xóa lịch sử vẫn dùng PATCH/DELETE gốc. Booking fixed dùng API admin gốc.

## Gateway và session

Client giữ endpoint, payload theo giờ, GraphQL query/variables và response envelope gốc. Không tự đổi API booking, center, inventory, news, rating, social, notification, users sang endpoint khác.

Chạy Vite:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
# Sửa DEV_API_GATEWAY_URL thành gateway thật (dùng cho proxy local).
# VITE_API_GATEWAY_URL để trống nếu dùng proxy, hoặc đặt URL có CORS.
pnpm dev:web
pnpm dev:admin
```

Docker Nginx proxy `/api/`, `/graphql`, `/socket.io/` và SPA routes. `API_GATEWAY_URL` là runtime upstream, ví dụ `http://host.docker.internal:8080` nếu gateway chạy trên host; Compose thêm host-gateway. `VITE_API_GATEWAY_URL`/`VITE_CLIENT_ID` là build config nếu cần; CORS/session phải được gateway cấu hình tương ứng. `VITE_SOCKET_URL` và `VITE_SOCIAL_SOCKET_URL` cấu hình socket. Weather widget chỉ gọi OpenWeather khi có `VITE_OPENWEATHER_API_KEY`; đã bỏ key hardcode từ nguồn cũ. Ảnh/fonts remote từ UI gốc vẫn cần kết nối mạng.

Không tích hợp đăng nhập trong hai app này. Host/Identity integration có thể cung cấp trước khi entrypoint chạy:

```js
window.__BADMINTON_SESSION__ = {
  accessToken: tokenFromIdentity,
  profile: profileFromUserService,
};
```

Đây là interface JavaScript trong browser, không phải HTTP API mới. Không đặt token thật vào repo hoặc build env. Provider chuẩn hóa `_id`/`userId` của profile cho component gốc; Axios đọc token hiện tại khi gửi request. Không có profile thì các màn hình công khai vẫn render; API cần quyền có thể trả 401/403. Browser profile/role không cấp quyền trên server. Khi token hết hạn, host phụ trách session; app không tự refresh hoặc điều hướng sang màn hình login.

## Ranh giới với Booking Core mới

`services/booking-core` vẫn có hợp đồng v1, PostgreSQL và bảo vệ invariant đã triển khai trước đó. API này **chưa tương thích trực tiếp** với gateway REST/GraphQL của UI gốc. Không trỏ gateway URL vào cổng 3000 của Booking Core rồi coi đó là đã nối xong; đường dẫn, envelope, ID và đơn vị slot khác nhau. Muốn dùng UI gốc với Booking Core cần gateway adapter có hợp đồng gốc, xác minh actor và chuyển ID/đơn vị giờ. Chưa triển khai adapter hay backend kho/news/rating/social/notification trong lần khôi phục này.

Consumer tests kiểm tra client gốc bằng Axios adapter giả lập; browser smoke dùng responses giả lập. Chúng xác minh UI và request của client, không chứng minh tất cả legacy services đang chạy hoặc toàn hệ thống đã deploy. Integration test Postgres kiểm tra Booking Core độc lập. Xem [VALIDATION.md](VALIDATION.md).
