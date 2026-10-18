# Identity v2 — đăng nhập và người dùng hiện tại

Giải nén tại thư mục gốc badminton_system, ghép/ghi đè các file starter v1 trong services/identity. Nếu bạn đã sửa code riêng, so sánh trước khi ghi đè. Giữ nguyên .env nếu đã tạo.

Mở PowerShell tại gốc repo:

```powershell
docker compose -f services/identity/compose.dev.yml up --build -d
docker compose -f services/identity/compose.dev.yml ps -a
```

`identity-migrate` Exited (0) là bình thường. Truy cập http://localhost:8084/health/ready, mong đợi database connected.

## Tạo tài khoản thử

Chỉ dùng local, tài khoản role user. Nhập mật khẩu thử riêng, không dùng mật khẩu tài khoản thật. Tối thiểu 12 ký tự và tối đa 72 byte UTF-8.

```powershell
$env:IDENTITY_SEED_PASSWORD = Read-Host 'Nhap mat khau thu (12+ ky tu)'
docker compose -f services/identity/compose.dev.yml exec -e IDENTITY_SEED_PASSWORD identity node dist/seed-dev.js
```

Lệnh không sửa mật khẩu/role nếu tài khoản đã tồn tại. Mật khẩu lưu bằng bcrypt cost 12. Không tạo admin tự động.

## Đăng nhập và gọi me

```powershell
$body = @{ email = 'dung@example.com'; password = $env:IDENTITY_SEED_PASSWORD } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri 'http://localhost:8084/api/auth/login' -ContentType 'application/json' -Body $body
$session.profile
Invoke-RestMethod -Uri 'http://localhost:8084/api/auth/me' -Headers @{ Authorization = "Bearer $($session.accessToken)" }
Remove-Item Env:IDENTITY_SEED_PASSWORD
```

Kết quả gồm userId, email, role=user, name=Bach Dung. Đừng chia sẻ accessToken. Token hết hạn sau 15 phút thì đăng nhập lại.

## Contract cho thành viên làm gateway/frontend

- POST /api/auth/login body {email,password}; 200 {accessToken,tokenType:'Bearer',expiresIn:900,profile:{userId,email,role,name}}.
- GET /api/auth/me header Authorization: Bearer TOKEN; 200 {profile:{userId,email,role,name}}.
- 400 input không hợp lệ; 401 sai credentials/token/tài khoản khóa; 429 quá 20 lần đăng nhập/IP/15 phút; 500 lỗi nội bộ (không trả lỗi DB chi tiết).
- JWT HS256: sub=userId, role, name, iat, exp, iss=badminton-identity, aud=badminton-system. JWT_SECRET/issuer/audience phải trùng gateway. Không nhận role từ request đăng nhập.
- /me kiểm tra trạng thái tài khoản trong DB. Gateway hiện chỉ xác minh chữ ký nên token đã cấp có thể còn dùng ở các service khác tới lúc hết hạn; chưa có thu hồi token tập trung.
- Email được trim và lowercase khi đăng nhập; dữ liệu nhập sau này cũng phải chuẩn hóa tương tự.
- Password null (tài khoản OAuth tương lai) không được đăng nhập bằng mật khẩu.
- isVerified chưa được áp dụng vì chưa có flow xác minh email; cần chốt chính sách trước production.

## Phạm vi và phối hợp

Đây là backend Identity chạy riêng, chưa tự thêm form đăng nhập vào web8082, chưa route gateway8081, không thay compose chính và chưa sửa lockfile pnpm gốc. Khi tích hợp workspace, chạy pnpm install bằng phiên bản dự án để cập nhật lockfile với người quản lý repo.

Cần thống nhất với Chiến: route /api/auth/*, URL service, secret dùng chung, mapping userId UUID với booking và database riêng. Frontend cần gọi login rồi lưu session vào state; không chỉ gán window.__BADMINTON_SESSION__ sau khi React đã khởi tạo. Chưa bật CORS: hiện test PowerShell; browser sẽ đi cùng origin qua gateway sau tích hợp.

Giới hạn đăng nhập đang lưu trong RAM, phù hợp local một instance. Khi đi qua reverse proxy phải cấu hình trust proxy theo topology thực tế; khi nhiều replica cần rate-limit store dùng chung (ví dụ Redis). Chưa có register, refresh/logout/revoke, email verification, reset password hoặc OAuth. Không dùng cấu hình secret demo để triển khai thật.

## Kiểm tra và dừng

```powershell
docker compose -f services/identity/compose.dev.yml logs --tail=80 identity identity-migrate identity-db
docker compose -f services/identity/compose.dev.yml down
```

Không thêm -v nếu muốn giữ tài khoản/DB thử.

Đã kiểm tra build TypeScript, typecheck, unit tests bằng store giả. Chưa chạy Docker/PostgreSQL thật trong môi trường tạo bản này; các bước phía trên là kiểm tra tích hợp trên máy bạn.
