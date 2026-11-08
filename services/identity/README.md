# Cập nhật v2

Bản này đã có login + me + seed local. Xem [QUICKSTART.md](QUICKSTART.md) để chạy. Các ghi chú v1 về chưa có login bên dưới mô tả mốc cũ.

# Identity — bản khởi tạo

Service độc lập quản lý danh tính người dùng. Bản đầu tiên gồm Express/TypeScript, PostgreSQL/Prisma, schema User/Profile, migration và health endpoints. Chưa có API login, cấp JWT, refresh, OAuth hoặc giao diện đăng nhập. JWT config hiện chỉ được kiểm tra để chuẩn bị tích hợp; không thay đổi Gateway/Core.

## Cài vào dự án

Giải nén và chép nguyên thư mục `services/identity` vào thư mục gốc `badminton_system` đang có. Không thay thế thư mục `services` bằng cách xóa thư mục cũ. Giữ nhánh `bachdung/identity-public_entry` của bạn.

Không cần sửa `compose.yml` gốc để thử bản này. Workspace có `services/*` nên sẽ nhận package mới. Dockerfile dùng lock npm riêng để thử độc lập, không cần thay lockfile pnpm chung ngay. Khi tích hợp workspace, cập nhật pnpm-lock.yaml bằng pnpm 10.25.0 rồi commit cùng package mới.

## Chạy bằng Docker (khuyến nghị)

Mở terminal tại gốc repo, nơi có `compose.yml`, rồi chạy:

```powershell
docker compose -f services/identity/compose.dev.yml up --build -d
docker compose -f services/identity/compose.dev.yml ps -a
```

Compose này là project `badminton-identity-dev`, chạy song song với project Booking/AI. `identity-migrate` kết thúc với `Exited (0)` là bình thường; `identity-db` và `identity` cần chạy healthy.

Mở:

- http://localhost:8084/health — tiến trình HTTP đang hoạt động.
- http://localhost:8084/health/ready — trả 200 khi truy vấn database thành công, 503 nếu database chưa sẵn sàng. Đây là probe kết nối DB, không phải kiểm tra toàn bộ schema.

Kết quả readiness mong đợi:

```json
{"status":"ready","service":"identity","database":"connected"}
```

Cổng mới: Identity 8084; PostgreSQL 5434. Không dùng DB booking 5432 hoặc DB AI 5433. Nếu hai cổng mới đã bị ứng dụng khác dùng, đổi cổng host bên trái dấu `:` trong compose này. Khi đổi cổng Identity host, cập nhật URL trên trình duyệt.

Xem lỗi:

```powershell
docker compose -f services/identity/compose.dev.yml logs --tail=80 identity identity-migrate identity-db
```

Dừng và giữ dữ liệu:

```powershell
docker compose -f services/identity/compose.dev.yml down
```

Không thêm `-v` nếu muốn giữ DB Identity. Credential trong compose chỉ là giá trị demo cho local, không dùng cho production. Không cần chép `.env.example` để chạy cấu hình Docker này.

## Chạy trực tiếp khi phát triển

Node 22 và npm; PostgreSQL local có sẵn hoặc chạy riêng DB qua Compose:

```powershell
docker compose -f services/identity/compose.dev.yml up -d identity-db
cd services/identity
Copy-Item .env.example .env
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

Không chạy bản Docker Identity và `npm run dev` cùng cổng 8084 đồng thời.

Kiểm tra sau khi cài dependency và generate Prisma:

```powershell
npm run typecheck
npm run test:unit
npm run build
```

`npm run lint` dùng ESLint ở workspace gốc, cần cài dependency gốc bằng pnpm trước. Không chạy npm install ở gốc repo pnpm.

## Cấu trúc

- `src/config/environment.ts`: validate port, DB URL và cấu hình JWT; không in secret.
- `src/app.ts`: app factory và health/readiness, có thể kiểm thử độc lập DB.
- `src/main.ts`: Prisma, HTTP server và graceful shutdown.
- `prisma/schema.prisma`: User (credential, role, trạng thái) và Profile (tên, điện thoại).
- `prisma/migrations`: migration đầu tiên, tạo bảng trong DB Identity riêng.
- `test/health.spec.ts`: readiness lúc DB mất kết nối, không lộ lỗi nội bộ và cấu hình sai.

User.id là UUID dự kiến. Role giữ `user`, `center_manager`, `super_admin` theo auth-contracts. Chưa chuyển ID/dữ liệu thật từ repo cũ và chưa seed tài khoản; cần chốt mapping trước.

JWT dùng JWT_SECRET (tối thiểu 32 ký tự), JWT_ISSUER mặc định `badminton-identity`, JWT_AUDIENCE mặc định `badminton-system`. Khi thêm login, phải chốt cùng Gateway/Core/AI. Cấu hình này chưa thay thế kiểm tra quyền nghiệp vụ tại Core.

## Trạng thái kiểm tra bản đầu

Đã kiểm tra ở môi trường tạo bản: Prisma generate và tạo migration SQL từ schema; TypeScript build/typecheck; 4 unit tests. Chưa chạy Docker/PostgreSQL thật vì môi trường đó không có Docker Engine. Vì vậy cần chạy Compose và xác nhận readiness trên máy bạn. Bản này chưa xử lý lỗi 401 trên UI: bước tiếp theo là login + JWT + route Gateway + session UI.
