# Identity — hướng dẫn chạy local

## Khởi động Identity, Gateway và Web

Chạy lệnh ở thư mục gốc `badminton_system`. Compose riêng khởi động PostgreSQL, áp dụng migration, rồi chạy Identity và Mailpit.

```powershell
docker compose -f services/identity/compose.dev.yml up --build -d
docker compose -f services/identity/compose.dev.yml ps -a
```

`identity-migrate` kết thúc với mã `0` là bình thường. Kiểm tra [Identity](http://localhost:8084/health/ready) và mở [Mailpit](http://localhost:8025/).

Để chạy Web với Compose riêng của Identity, cài dependency bằng pnpm 10.25.0 với `pnpm install --frozen-lockfile`. Mở hai cửa sổ PowerShell tại gốc repo. Cửa sổ thứ nhất chạy Gateway.

```powershell
$env:JWT_SECRET = 'local-development-only-change-me-32-chars'
$env:IDENTITY_SERVICE_URL = 'http://127.0.0.1:8084'
$env:CORS_ORIGINS = 'http://localhost:8082,http://127.0.0.1:8082,http://localhost:5174,http://127.0.0.1:5174'
pnpm dev:gateway
```

Cửa sổ thứ hai chạy Web trên cổng `8082`, khớp với link xác minh mặc định trong thư.

```powershell
$env:DEV_API_GATEWAY_URL = 'http://127.0.0.1:8081'
pnpm --filter @badminton/frontend exec vite --host 127.0.0.1 --port 8082 --strictPort
```

Để chạy cả hệ thống, dùng `docker compose up --build -d` từ gốc repo. Compose này cũng chạy Gateway trên `8081`, Web trên `8082` và Admin trên `8083`. Hai cấu hình Compose dùng chung các cổng Identity và Mailpit. Chọn một cấu hình mỗi lần chạy.

## Đăng ký và xác minh email

1. Mở [trang Đăng ký](http://localhost:8082/register) và dùng một email thử, chẳng hạn địa chỉ có đuôi `@example.test`. Email và mật khẩu không chứa khoảng trắng. Mật khẩu có ít nhất 12 ký tự, tối đa 72 byte UTF-8, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
2. Mở thư tương ứng trong [Mailpit](http://localhost:8025/), bấm link rồi chọn **Xác minh email**. Link có hiệu lực 24 giờ và dùng một lần.
3. Chọn **Đăng nhập** và dùng thông tin vừa đăng ký.

Khi thư chưa đến hoặc link hết hiệu lực, chọn **Gửi lại thư xác minh** trên màn hình sau đăng ký hoặc trang báo link không hợp lệ. Có thể cấp link mới sau 60 giây kể từ lần cấp gần nhất. Khi cấp link mới, Identity vô hiệu hóa link cũ.

Nếu chỉ chạy Identity, có thể thử đăng ký và gửi lại trực tiếp qua PowerShell.

```powershell
$email = "test-$([guid]::NewGuid().ToString('N'))@example.test"
$registration = @{
  email = $email
  username = 'Khach Thu Nghiem'
  password = 'Local-only-example1!'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8084/api/auth/register' -ContentType 'application/json' -Body $registration

# Chờ đủ 60 giây kể từ lần cấp link gần nhất.
$resend = @{ email = $email } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8084/api/auth/resend-verification' -ContentType 'application/json' -Body $resend
```

Khi thử riêng backend, lấy phần sau `#token=` trong link rồi gửi `{ "token": "…" }` đến `POST http://localhost:8084/api/auth/verify-email`. API trả `204` khi xác minh thành công.

## Tài khoản mẫu và Admin

Lệnh seed tạo các tài khoản mẫu `customer@badminton.local` (`user`), `manager@badminton.local` (`center_manager`), `admin@badminton.local` (`super_admin`) và `dung@example.com` (`user`). Các tài khoản đã tồn tại giữ mật khẩu và role đang có.

```powershell
$env:IDENTITY_SEED_PASSWORD = Read-Host 'Nhap mat khau thu (12+ ky tu, toi da 72 byte UTF-8)'
docker compose -f services/identity/compose.dev.yml exec -e IDENTITY_SEED_PASSWORD identity node dist/seed-dev.js
Remove-Item Env:IDENTITY_SEED_PASSWORD
```

Với Compose toàn hệ thống, mở [Admin](http://localhost:8083/login). Khi dùng Compose riêng của Identity và Gateway chạy trên máy, chạy `pnpm dev:admin` ở cửa sổ khác rồi mở [Admin Vite](http://localhost:5174/login). Portal chấp nhận role `super_admin` và `center_manager`.

## Thử API phiên qua Gateway

Đăng nhập tạo phiên có hạn 7 ngày và đặt cookie `refresh_token` HttpOnly. Identity lưu hash của refresh token. Access token có hạn tối đa 15 phút. Các lệnh PowerShell dưới đây dùng cùng cookie jar từ lúc đăng nhập đến lúc thu hồi phiên.

```powershell
$gateway = 'http://localhost:8081/api/auth'
$testPassword = Read-Host 'Mat khau tai khoan thu'
$credentials = @{ email = 'customer@badminton.local'; password = $testPassword } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$gateway/login" -ContentType 'application/json' -Body $credentials -SessionVariable identityCookies

$refreshed = Invoke-RestMethod -Method Post -Uri "$gateway/refresh" -WebSession $identityCookies
Invoke-RestMethod -Uri "$gateway/me" -Headers @{ Authorization = "Bearer $($refreshed.accessToken)" }

Invoke-RestMethod -Method Post -Uri "$gateway/logout" -WebSession $identityCookies
```

`/refresh` dùng cookie để cấp access token mới và thay refresh token. Dùng lại refresh token cũ thu hồi phiên tương ứng. `/logout` thu hồi phiên và xóa cookie, trả `204` kể cả khi gọi lại. Access token đã cấp hết hiệu lực theo thời hạn của nó.

Web và Admin gọi Gateway khi đăng nhập, khôi phục/gia hạn phiên qua refresh cookie và gọi API thu hồi phiên khi chọn **Đăng xuất**.

## Xem log và dừng

```powershell
docker compose -f services/identity/compose.dev.yml logs --tail=80 identity identity-migrate identity-db mailpit
docker compose -f services/identity/compose.dev.yml down
```

Lệnh `down` trên giữ volume PostgreSQL local.

## Hồ sơ và quản trị tài khoản

Web có trang `/profile` để xem và sửa `name`, `phone`. Admin có trang `/users` dành cho `super_admin`, gồm tìm kiếm/lọc, khóa/mở khóa, đổi vai trò kèm lý do và phân công `center_manager` theo UUID trung tâm. Identity lưu phân công trong bảng `CenterAssignment`, mỗi trung tâm có một phân công hiện tại. Khi khóa hoặc hạ vai trò quản lý, các phân công đang hoạt động của tài khoản được vô hiệu hóa.

API mới dùng prefix `/api/v1` tại Identity và `/api/identity` qua Gateway. API `/internal/identity/users/{userId}` chỉ gọi trực tiếp trong mạng riêng với `x-internal-token: <INTERNAL_SERVICE_TOKEN>` hoặc Bearer cùng secret. Gateway không forward đường dẫn nội bộ này. Booking Core tiếp tục sở hữu trường managerId của trung tâm, phân công lưu tại Identity phục vụ xác minh và quản trị tài khoản.

Compose local có RabbitMQ riêng `identity-rabbitmq`. Khi đổi trạng thái hoặc role, Identity ghi audit và `identity.user-updated.v1` vào outbox trong cùng transaction. Worker gửi sự kiện persistent lên topic exchange `badminton.events` với publisher confirms, thử lại sau lỗi. Consumer cần loại trùng theo `id` vì sự kiện có thể được gửi lại sau crash. Không có binding notification thì exchange chưa có consumer để nhận, notification-service phải bind queue vào routing key này.

Khi chạy ngoài Compose, cấu hình `RABBITMQ_URL`, tùy chọn `RABBITMQ_EXCHANGE` (mặc định `badminton.events`). Khi URL chưa cấu hình, outbox vẫn lưu sự kiện và đợi worker được bật. Dùng secret riêng cho `INTERNAL_SERVICE_TOKEN` và `METRICS_TOKEN`. `/health/live` trả liveness, `/health/ready` kiểm tra DB, `/metrics` yêu cầu `Authorization: Bearer <METRICS_TOKEN>` và trả Prometheus metrics. Các secret local trong Compose chỉ dùng trên máy phát triển.
