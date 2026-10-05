# Cấu trúc và ranh giới code

## Workspace

Deployable web đặt dưới `apps`, backend dưới `services`; tên thư mục dùng lowercase/kebab-case. Package names (`@badminton/frontend`, `@badminton/admin`, `@badminton/booking-core`) và URL API giữ ổn định để scripts/consumers tiếp tục dùng được. Router không chứa toàn bộ giao diện; Booking Core không còn một BookingService quản lý mọi nghiệp vụ.

```text
apps/{web,admin}/
  src/
    app/                    # router, entrypoint; lazy-load màn hình gốc
    features/<domain>/
      pages/                # màn hình JSX từ repo gốc
      ui/                   # component của nghiệp vụ
      api/                  # client giữ URL/payload/envelope gốc
    shared/
      ui/                   # layout, header/footer, modal/spinner dùng chung
      styles/               # CSS gốc + Tailwind 3/PostCSS
      session/              # profile được host cung cấp; không triển khai login
      api/                  # Axios transport, socket configuration
      assets/               # ảnh import trong Admin
  public/                   # ảnh/static assets gốc của Frontend
  test/{unit,contract}/
```

Router chỉ ghép các màn hình và lazy-load để giảm bundle ban đầu. Các màn hình gốc cùng state của chúng được giữ lại; không viết lại UI thành form mới. API adapter nằm trong feature, dùng Axios transport chung của từng ứng dụng. Tên package vẫn `@badminton/frontend`/`@badminton/admin` và đường dẫn trang vẫn như nguồn cũ. Typo/case của import được sửa để build trên Linux. Giữ source JSX thay vì chuyển toàn bộ sang TypeScript chỉ vì đổi folder; `allowJs` giúp TypeScript kiểm tra phần tooling/tests, `checkJs: false` không có nghĩa JSX đã được kiểm tra kiểu đầy đủ.

`SessionProvider` nhận profile có sẵn từ host, không gọi auth, không tự tạo user/role/token. HTTP transport đọc bearer token và client ID từ integration đó. Session/role trên browser chỉ hỗ trợ render; gateway/backend phải xác minh token và quyền. Bỏ UI login/guard redirect không làm cho API protected trở thành public. Chi tiết và giới hạn integration ở [LEGACY_UI.md](LEGACY_UI.md).

ESLint áp dụng `no-undef`, `rules-of-hooks`, `exhaustive-deps` ở mức error cho JSX; kiểm tra dependency direction của shared/features. API URL không đổi sang `/api/v1`. Các callback fetch dùng `useCallback` theo bộ lọc thật, constants không đổi theo render đặt ngoài component. Backend module refactor được giữ; không tạo business endpoint mới trong lần khôi phục UI này.

## Booking Core

```text
services/booking-core/
  src/
    main.ts / app.module.ts
    bootstrap/          # HTTP setup
    common/
      auth/             # guard, JWT verification, center access policy
      config/           # environment validation
      domain/           # calendar, selections, pricing, quote rules
      http/             # exception filter, pagination, idempotency
      observability/    # clock, telemetry, request middleware
    infrastructure/
      database/         # Prisma, transaction runner, persisted record types
      outbox/           # ghi event trong cùng transaction
    modules/
      centers/          # controller, service, DTO, DB projection
      courts/
      pricing/
      availability/     # read calendar + slot allocation
      reservations/     # hold/release + expiry worker
      bookings/         # query/command/fixed services, mapper, DTO
      health/
      development/      # demo session, chỉ đăng ký ở development
  prisma/               # schema, migration, seed
  generated/client/     # generated/ignored, không sửa bằng tay
  test/{unit,integration,contract}/
  scripts/
```

Mỗi module NestJS khai báo providers/controllers và chỉ export service mà module khác cần. Module graph không có `forwardRef`: reservations → bookings → availability → centres theo chiều consumer phụ thuộc provider; courts/pricing chỉ cần centres. BookingsCommandService xử lý confirm/cancel, BookingsQueryService xử lý read/history/stats, FixedBookingsService sở hữu chuỗi cố định. ReservationsController dùng command service để confirm; không gọi controller của module khác.

Database/observability/auth là các module dùng chung. PrismaService giữ một connection pool; Clock có thể override trong test; BookingTransactions chia sẻ advisory locks, transaction timing và cleanup hết hạn. OutboxService không publish network trong transaction. Tách file/module không tách database hoặc tạo transaction boundary mới: confirm, allocation và outbox vẫn atomic, fixed batch vẫn all-or-nothing, constraint GiST vẫn ở migration.

Các policy common không import module, infrastructure hoặc generated client; persisted Prisma record types nằm trong database infrastructure. Domain helpers nhận dữ liệu/clock qua tham số và không truy cập DB. Đây là modular monolith trong một deployable Booking Core; không tạo repository wrapper chỉ để chuyển tiếp từng hàm Prisma.

## Thêm hoặc sửa tính năng

1. Chọn module/feature sở hữu nghiệp vụ. Thêm DTO/API adapter, model/service, UI/controller tương ứng; tránh đưa logic vào App hoặc main.
2. Dùng transaction runner hiện có cho mutation slot/booking và ghi outbox trong transaction. Giữ quyền center/owner trên backend.
3. Nếu thay HTTP/event shape, sửa `contracts`, shared schemas và consumer/provider tests. Thay implementation không mặc nhiên tạo deployable mới.
4. Thêm case bảo vệ invariant/hành vi thực; chạy các test bị ảnh hưởng, lint/typecheck/build.
5. Khi thêm deployable, cập nhật manifest, workspace và Docker context cùng source; component chưa có code/test tiếp tục `enabled: false`.

Lệnh local không đổi: `pnpm dev:core`, `pnpm dev:web`, `pnpm dev:admin`, `docker compose up --build -d`. Main vẫn là default branch; code nằm trên feat/booking-core. Identity thật, customer directory và outbox publisher là các integration tiếp theo, được ghi rõ trong BOOKING_CORE/MONITORING. Không có payment hoặc pass sân trong nhánh này.

Tham khảo mô hình [module của NestJS](https://docs.nestjs.com/modules) và [quy tắc hook của React](https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks). Cây thư mục là lựa chọn cho workspace này, không phải yêu cầu rằng mọi dự án production phải dùng cùng một cây.
