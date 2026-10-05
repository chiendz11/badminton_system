# Booking Core: kiến trúc và cách chạy

## Nguồn chuyển đổi

Đã tham khảo repo `chiendz11/Badminton_manager_microservices`, nhánh `master`, commit `484d381e873f513ed4faa4413407502112f4885d`:

| Nguồn cũ                                                                      | Nơi triển khai mới                                              |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `BM/services/center_service`: center/court/pricing, ownership                 | `services/booking_core/src/booking.service.ts`, DTO và Prisma   |
| `BM/services/booking_service`: daily/fixed booking, hold, giờ trống, discount | `booking.service.ts`, `domain.ts`, `packages/booking-contracts` |
| `Frontend/src/pages/Booking.jsx`, `components/bookingTable.jsx`               | `Frontend/src/App.tsx`, `packages/booking-ui`                   |
| `Admin/src/pages/CreateFixedBooking.jsx` và quản lý center/court              | `Admin/src/App.tsx`                                             |

Code được viết lại theo Nest/Prisma/TypeScript, giữ nghiệp vụ liên quan, không sao chép cả microservice tree. Không di chuyển dữ liệu MongoDB hoặc thông tin khách hàng thật. Seed là dữ liệu tổng hợp. Repo cũ và các thay đổi local của nó được giữ nguyên.

Các slot vẫn là một giờ, giờ Việt Nam UTC+7. API dùng phút từ đầu ngày (`300` = 05:00, `1020` = 17:00), khoảng giá `[startMinute,endMinute)` và UUID mới. Payload Mongo/ObjectId và hour arrays cũ không tương thích trực tiếp. Giới hạn đặt trước 90 ngày; fixed tối đa 60 ngày có lịch; giữ chỗ tối đa 5 yêu cầu/người, TTL mặc định 300 giây (30–900), luôn cắt ở thời điểm bắt đầu slot đầu tiên.

Giảm giá kế thừa: loyalty >=2000 điểm giảm 5%, >=4000 giảm 10%; đặt >=2 sân thêm 5%. Backend tính VND và snapshot base/discount/total, không tin giá do browser gửi. Loyalty lấy từ claim đã ký bởi Identity; lịch cố định tạo hộ khách chưa tra điểm của khách khác, nên hiện chỉ áp dụng giảm nhiều sân cho trường hợp này. Cần ghép Identity lookup nếu muốn giữ cả discount loyalty khi quản lý đặt hộ; không cho client tự khai báo điểm.

## Transaction boundary

`Center`, `Court`, `PricingBand`, `Reservation`, `SlotAllocation`, `Booking`, `BookingSeries`, `OutboxEvent` cùng nằm trong PostgreSQL. SlotAllocation giữ cả hold và booking confirmed. Các mutation dùng advisory lock theo center; khóa actor giới hạn hold và khóa idempotency chống retry tạo trùng. SQL `slot_no_overlap` dùng GiST exclusion để bảo vệ invariant cả khi ghi ngoài application. Database cần quyền tạo extension `btree_gist` trong migration đầu tiên.

Reservation đi từ `HELD` sang `CONFIRMED`, `CANCELLED` hoặc `EXPIRED`. Confirm quá hạn trả 410 sau khi đã commit cleanup; worker chạy mỗi 15 giây. Booking confirmed có thể hủy trước slot đầu tiên; trạng thái canceled giải phóng allocation. Đặt cố định tạo tất cả occurrence trong một transaction; xung đột bất kỳ ngày nào trả 409 và hoàn tác cả chuỗi. Giá đã chốt không đổi khi quản lý sửa bảng giá. Tạm đóng sân/trung tâm bị từ chối khi còn allocation tương lai.

`booking.confirmed.v1` và `booking.cancelled.v1` được ghi vào outbox cùng transaction. Chưa có publisher/broker hoặc consumer Notification; backlog metric là số record chưa phát, không phải lỗi gửi. Khi bổ sung publisher cần retry và consumer idempotency; không coi outbox là exactly-once delivery.

## Phân quyền và Identity

Backend nhận JWT HS256: `sub`, `role` (`user`, `center_manager`, `super_admin`), `name` tùy chọn, `loyaltyPoints` tùy chọn; kiểm tra issuer/audience và thời hạn nếu có. Identity phải cấp token có `exp`, ký bằng secret cùng cấu hình. Không tin `x-user-id`/role headers. User chỉ thấy/hủy booking của mình; manager chỉ quản lý trung tâm được gán; super_admin tạo trung tâm và quản lý mọi trung tâm.

`POST /api/v1/dev/session` chỉ tồn tại khi `NODE_ENV=development` và `ENABLE_DEMO_AUTH=true`; trả token demo có hạn 1 giờ. Production chặn demo và secret mẫu, yêu cầu METRICS_TOKEN. Frontend đọc session trong sessionStorage và xác minh response bằng shared Zod schemas; backend mới là nơi quyết định quyền. Integration Identity login/logout và customer directory chưa có. `VITE_IDENTITY_LOGIN_URL` là đường dẫn đăng nhập dự kiến, không tự triển khai một auth service.

## Chạy bằng Node

Dùng Node 22 và pnpm 10.25.0. Khi máy chưa có pnpm, có thể dùng `npx --yes --package=node@22 --package=pnpm@10.25.0 -- pnpm ...` thay cho `pnpm ...`.

```bash
pnpm install --frozen-lockfile
cp services/booking_core/.env.example services/booking_core/.env
cp Frontend/.env.example Frontend/.env
cp Admin/.env.example Admin/.env
docker compose up -d postgres
pnpm --filter @badminton/booking-core prisma:generate
pnpm --filter @badminton/booking-core prisma:migrate:deploy
pnpm --filter @badminton/booking-core seed
pnpm dev:core
```

Hai terminal khác: `pnpm dev:web` (5173), `pnpm dev:admin` (5174). Vite proxy `/api` đến 3000. Shared packages build qua `prepare` khi install; sau khi sửa package dùng `pnpm --filter './packages/**' build`. Seed idempotent, không reset giá/booking đã sửa.

## API chính

Contract: `contracts/booking/openapi.json`; DTO và example schemas đi cùng, event schemas trong `contracts/events`.

| Endpoint                                                                                  | Chức năng                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------- |
| `GET /api/v1/centers`, `GET /api/v1/centers/:id`                                          | Catalogue và tìm kiếm/phân trang      |
| `GET /api/v1/centers/:id/availability?date=YYYY-MM-DD`                                    | Lịch một ngày                         |
| `POST /api/v1/reservations`                                                               | Giữ slot; bắt buộc Idempotency-Key    |
| `POST /api/v1/reservations/:id/confirm`, `DELETE /api/v1/reservations/:id`                | Xác nhận/bỏ hold                      |
| `GET /api/v1/bookings/me`, `GET /api/v1/bookings/me/stats`                                | Lịch sử/thống kê cá nhân              |
| `POST /api/v1/bookings/:id/cancel`                                                        | Hủy booking                           |
| `POST /api/v1/availability/fixed`, `POST /api/v1/bookings/fixed`                          | Preview toàn range/tạo lịch cố định   |
| `POST/PATCH /api/v1/centers[/:id]`, `POST/PATCH .../courts[/:courtId]`, `PUT .../pricing` | Quản lý centre/court/giá              |
| `GET /api/v1/centers/:id/bookings`                                                        | Lịch của trung tâm, chỉ manager/admin |

Date là lịch VN thực sự tồn tại, body không chấp nhận field thừa. Idempotency-Key 8–128 ký tự chữ/số/underscore/hyphen; replay cùng nội dung trả cùng kết quả, đổi nội dung trả 409. Lỗi có `requestId`, không trả stack/secret. Manager nhập user ID/name khi tạo lịch cố định, chờ Identity directory.

## Triển khai tiếp

Compose commit là local development. Để triển khai cần tạo PostgreSQL/secret riêng, chạy migration job, seed chỉ khi cần dữ liệu demo, tắt ENABLE_DEMO_AUTH, dùng NODE_ENV=production, JWT_SECRET mạnh khớp Identity, issuer/audience đúng, METRICS_TOKEN riêng và CORS_ORIGINS cụ thể. API runtime image chạy user `node`, chỉ mang Prisma Client đã generate; Prisma CLI/npm/yarn không nằm trong runtime image. Migration/seed dùng build target riêng; frontend/admin Docker build mặc định tắt demo, Compose local bật rõ bằng build args. Nginx proxy đến service `api:3000`; chỉnh upstream khi môi trường khác.

Không bật lại AI/Identity/Gateway/Commerce CI cho đến khi có source, lockfile và test thật. Không có payment, pass, hoàn tiền, tích điểm sau thanh toán hoặc migration dữ liệu cũ trong phạm vi nhánh này.
