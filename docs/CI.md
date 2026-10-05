# CI cho kiến trúc bounded context

## Manifest là nguồn cấu hình

`.github/ci/components.yml` thay thế việc scan `BM/services/*`. Mỗi entry mô tả một deployable, một nhóm contract hoặc một shared package. Không suy luận kiến trúc từ `package.json` có sẵn trong codebase cũ.

| Component | Path dự kiến | Runtime / database |
| --- | --- | --- |
| api_gateway | services/api_gateway | Node |
| identity | services/identity_service | Node / PostgreSQL / Prisma |
| booking_core | services/booking_core | Node / PostgreSQL / Prisma |
| commerce | services/commerce_service | Node / PostgreSQL / Prisma |
| social | services/social_service | Node / MongoDB |
| content | services/content_service | Node / MongoDB |
| notification | services/notification_service | Node / MongoDB |
| storage | services/storage_service | Node |
| ai | services/ai_service | Python / FastAPI |
| frontend | Frontend | Web |
| admin | Admin | Web |

Identity gộp auth/user. Booking Core chứa center, court, pricing, availability, reservation, booking, payment và passes. Commerce chứa inventory/stock/sales/reporting. Content chứa rating/news. Đây là mapping CI dự kiến, không phải các thư mục/source được tạo bởi nhánh bootstrap.

Các shared package: `packages/auth-contracts`, `packages/booking-contracts`, `packages/event-contracts`, `packages/observability`. Các nhóm schema: `contracts/identity`, `contracts/booking`, `contracts/commerce`, `contracts/events`, `contracts/ai-tools`, `contracts/gateway`.

`depends_on` biểu diễn dependency của component vào API/event/shared package. Chỉnh graph cùng với dependency thực tế; tránh biểu diễn mọi HTTP call như một cạnh bắt buộc chạy CI khi implementation đổi.

## Bootstrap trước khi có source

`configuration_only: true` là trạng thái hiện tại được khai báo rõ trong manifest. Workflow kiểm tra cú pháp script, YAML, manifest và graph; tạo matrix rỗng; summary của `CI / required` ghi rõ không kiểm thử ứng dụng. Không tự tạo test mẫu, source, database hay Docker image để làm CI xanh.

Khi codebase mới sẵn sàng, đặt `configuration_only: false`. Component được chọn mà thiếu path/lockfile/CI script sẽ fail. Các application gate không dùng `--if-present`, `--passWithNoTests` hoặc `Error: no test specified`.

## Change detection

- PR: `merge-base` giữa base SHA và commit checkout, rồi `git diff --no-renames` để bao gồm cả path cũ/mới khi đổi tên.
- Push `main`: so sánh `before` với commit mới.
- Push đầu tiên, merge queue hoặc chạy thủ công: chọn toàn bộ manifest.
- Thay đổi `.github/**`: chọn toàn bộ component.
- Đổi file lock hoặc cấu hình workspace: chọn các component dùng install root đó.
- Đổi contract/shared package: chọn component đó, rồi mở rộng reverse dependency graph cho đến khi không còn consumer mới.
- Đổi implementation bên trong deployable: chọn deployable đó. Ví dụ `services/booking_core/src/modules/pricing/**` chạy toàn `booking_core`, không tạo job pricing riêng.
- Chỉ đổi tài liệu: matrix ứng dụng rỗng. Chỉ đổi `packages/booking-contracts/**` sẽ không kéo Content/Social/Commerce nếu graph không khai báo dependency này.
- `contracts/booking/**` chọn Booking Core, Gateway, AI và các web consumer đã khai báo, cùng schema job của nhóm Booking.
- `contracts/events/**` chọn các producer/consumer đã khai báo, gồm Notification.

Matrix tách thành `node`, `python`, `web`, `contract`. Shared package được kiểm tra thông qua component tiêu thụ; nếu sau này có package độc lập cần job riêng, phải mở rộng runtime/contract rõ ràng. Manifest kiểm tra tên/path, dependency không tồn tại, path trùng/lồng nhau và cycle.

## Node/Web workspace

Cấu hình mặc định là pnpm monorepo: Node 22, pnpm 10.25.0, install root `.`, root `pnpm-lock.yaml`. Đây là contract cho codebase sắp tạo. Nếu chọn package độc lập hoặc npm, override `install_path`, `package_manager`, `package_manager_version`, `lockfile` trong component. Root `packageManager` phải khớp phiên bản pnpm trong manifest. Docker mặc định build với context root để truy cập shared package; override `docker_context`/`dockerfile` nếu cần.

Node và Web bắt buộc có package scripts:

```text
lint              # chỉ kiểm tra, không --fix
typecheck         # kiểm tra kiểu, không emit / không sửa source
test:unit         # một lượt, không watch
test:contract     # provider/consumer tests thực tế
build             # build deployable / Vite dist
```

Node bổ sung `test:integration`. Component `prisma: true` bổ sung:

```text
prisma:validate
prisma:generate
prisma:migrate:deploy   # prisma migrate deploy, áp dụng migration đã commit
```

Node workflow tạo PostgreSQL 16 tạm với port ngẫu nhiên chỉ bind localhost, đặt `DATABASE_URL` dành riêng cho CI, validate/generate Prisma, rồi chạy lint/typecheck/unit/contract, áp dụng migration và integration. Container được dọn ở bước `always()`, kể cả khi test/migration fail. CI không dùng `db push` để thay migration.

MongoDB/Redis/RabbitMQ hoặc dependency khác do integration test của từng component khởi tạo/dọn bằng Testcontainers. Không kết nối database thật. Database metadata `mongodb` không tự bật thêm container chung cho tất cả job.

`test:contract` phải kiểm tra provider/consumer theo contract chính thức. Schema syntax check một mình không thể phát hiện client còn đọc `available` sau khi API đổi thành `isAvailable`; consumer/provider tests bắt buộc của các component bị ảnh hưởng chịu trách nhiệm kiểm tra hành vi này.

## Python AI contract

AI dùng Python 3.12, uv 0.8.22, `services/ai_service/pyproject.toml` và `uv.lock`. Install dùng `uv sync --locked --all-groups`; các lệnh chạy qua `uv run --frozen`.

Khai báo lệnh thật trong `pyproject.toml` của AI, ví dụ:

```toml
[tool.badminton-ci.commands]
lint = "ruff check ."
typecheck = "mypy app"
unit = "pytest tests/unit"
contract = "pytest tests/contracts"
integration = "pytest tests/integration"
golden = "python -m evaluation.golden"
smoke = "pytest tests/smoke"
```

Đây là interface cần triển khai trong codebase mới; nhánh này không tạo các module/test trên. Giá trị command được tách thành argv, không chạy shell pipeline. Golden evaluator đọc `GOLDEN_SUITE` (`small` mặc định, `full` qua workflow_dispatch) và `GOLDEN_REPORT=reports/golden.json`.

CI đặt `AI_PROVIDER=fake` và `AI_OFFLINE=true`, không cấp API key LLM. Các test/evaluator phải thực sự tôn trọng interface này. Integration/contract dùng Booking API mock hoặc test-owned API, kiểm tra tool allowlist và authorization; AI không nhận `DATABASE_URL` của Booking Core và không ghi trực tiếp booking DB.

Golden report phải có số sample dương, suite đã yêu cầu và các metric trong [0, 1]:

```json
{
  "suite": "small",
  "sample_count": 40,
  "schema_validity": 1.0,
  "constraint_f1": 0.94,
  "critical_field_accuracy": 0.98
}
```

Đây là ví dụ định dạng, không phải kết quả đã chạy. Gate mặc định: schema validity = 100%, constraint F1 >= 0.90, critical field accuracy >= 0.95. Threshold được khai báo trong manifest, kiểm tra độc lập bởi `check_golden_report.py`; report thiếu metric, rỗng, sai suite hoặc dưới ngưỡng đều fail. Report được upload để review. PR dùng small golden suite; full suite được chọn thủ công và có thể nối vào nightly/release sau.

## Contract schema CI

`validate_contracts.py` kiểm tra mọi file `.json`, `.yaml`, `.yml` trong nhóm contract (trừ `*.examples.json`):

- OpenAPI: `openapi-spec-validator`.
- AsyncAPI: official `@asyncapi/cli@3.4.0 validate`.
- JSON Schema (DTO/event/AI tools): `jsonschema` theo `$schema`; phải có ví dụ dương và âm.

Với `request.schema.json`, thêm `request.schema.examples.json`:

```json
{
  "valid": [{"duration_minutes": 120}],
  "invalid": [{"duration_minutes": "two hours"}]
}
```

Schema tương ứng phải định nghĩa field/ràng buộc thật. Local `$ref` chỉ được resolve bên trong repository; các JSON Schema tham chiếu bằng `$id` được đăng ký từ các file cùng nhóm. Vendor dependency schema để validation có thể tái lập. Nhóm contract rỗng hoặc file không xác định loại schema đều fail. Pipeline không tạo schema giả hoặc thay provider/consumer tests bằng việc chỉ parse YAML.

## Image và required check

Node/Python component có `docker: true` dùng composite `.github/actions/build-scan`: build image cục bộ rồi Trivy quét vulnerability OS/library. Gate fail với HIGH/CRITICAL có bản sửa; vulnerability chưa có fix được bỏ qua theo cấu hình `ignore-unfixed`. Không push image, đăng nhập AWS, publish artifact production hay deploy. Web `dist/` và golden report chỉ là GitHub Actions artifacts giữ 7 ngày.

`CI / required` luôn chạy để tổng hợp. Configuration/discovery phải thành công; mọi matrix được chọn phải thành công; matrix rỗng phải có trạng thái skipped. Failed/cancelled/skipped job ngoài dự kiến không được coi là pass. Summary phân biệt configuration-only với application CI.

## Git local và bước tiếp theo

Thư mục ứng dụng cũ đã có `origin` trỏ tới `chiendz11/badminton_system`; remote cũ được giữ dưới tên `legacy-upstream`. Nhánh CI được checkout bằng Git worktree riêng ở `/data/Dev/newBTL/badminton_system`, cùng metadata Git với thư mục ứng dụng cũ. Các thay đổi ứng dụng đang có được giữ nguyên; commit CI chỉ lấy file CI và tài liệu.

Để tiếp tục sửa CI tại local:

```bash
cd /data/Dev/newBTL/badminton_system
git status
git push origin ci/bootstrap
```

Sau khi xây codebase mới: cập nhật path/dependency thực tế trong manifest, commit lockfiles và CI contract/test thật, tắt configuration-only rồi mở PR vào `main`. `main` vẫn là default branch. Targeted cross-service `integration.yml` được thêm sau khi các scenario thật tồn tại; phạm vi từng scenario khai báo các deployable cần dùng, không dựng cả hệ thống cho mọi PR. Broader integration/nightly và `release.yml` (ECR/SBOM/GitOps) là giai đoạn sau.

Nguồn yêu cầu: [thảo luận CI cho kiến trúc mới](https://chatgpt.com/share/6ac2943b-efb4-83ec-b181-e9161879f28d). Các cấu hình được chuẩn bị cho codebase sắp tạo; không thực thi test/build ứng dụng trong lần cập nhật bootstrap này.
