# Contract catalog — theo service/API

Mỗi API có một OpenAPI 3.1 entry document. Nhãn `x-implementation-status` trên từng operation phân biệt **implemented** với **proposed**. Contract được CI kiểm tra không đồng nghĩa service đã có runtime.

| Entry document | Owner | Trạng thái |
| --- | --- | --- |
| [booking/openapi.json](booking/openapi.json) | Người 1; pass module Người 2 | Current booking; payment/pass Proposed |
| [gateway/openapi.json](gateway/openapi.json) | Người 1 + domain owners | Public API current + Proposed tham chiếu provider |
| [identity/openapi.json](identity/openapi.json) | Người 4 | Proposed |
| [commerce/openapi.json](commerce/openapi.json) | Người 4 | Proposed |
| [social/openapi.json](social/openapi.json) | Người 3 | REST Proposed |
| [content/openapi.json](content/openapi.json) | Người 4 | Proposed |
| [notification/openapi.json](notification/openapi.json) | Người 3 | Proposed |
| [storage/openapi.json](storage/openapi.json) | Đề xuất N4 API + N5 platform | Proposed |
| [ai/openapi.json](ai/openapi.json) | Người 5 | Current FastAPI; read-only chat Proposed |

`info.version` có hậu tố `proposed` khi chứa thiết kế chưa chạy; `x-runtime-contract-version` giữ version baseline nếu có. AI read-only còn chờ ADR-008, không thay execution mode. Các response AI chưa có FastAPI response_model được giữ theo schema runtime xuất ra, chưa coi là response contract đầy đủ.

## Source of truth và routing

Provider giữ operation/schema của mình; Gateway giữ API public và tham chiếu provider Path Items qua `$ref` cho phần Proposed. Root `x-upstreams` của Gateway mô tả native path; provider operation có `x-gateway-path` để đối chiếu. Không nhập `/internal/...`, health hoặc metrics của provider vào public Gateway contract.

Provider tương lai dùng base `/api/v1`: public `/api/booking/pass-posts` → Core `/api/v1/pass-posts`; `/api/social/conversations` → Social `/api/v1/conversations`. AI public `/api/ai/v1/chat` → AI `/v1/chat`. Các route legacy hiện tại giữ nguyên. Internal/health operations có server origin override riêng, tránh ghép nhầm dưới `/api/v1`. Host/port của service skeleton chỉ là thiết kế.

Booking Core sở hữu payment/pass; không có Pass service độc lập. Schema request/response baseline trong Booking/Gateway là file chuẩn và OpenAPI tham chiếu chúng để không chép lại. Các schema và examples đó vẫn được consumer tests sử dụng.

## Events, Socket và tools

- [events/booking-event.schema.json](events/booking-event.schema.json): hai booking outbox events hiện có, giữ nguyên.
- [events/domain-event.schema.json](events/domain-event.schema.json): bảy domain event types Proposed, chưa có publisher mới.
- [sockets/social-event.schema.json](sockets/social-event.schema.json): chín Socket.IO event types Proposed, có direction và strict payload.
- [ai-tools/](ai-tools/): schema tool/conversation input đang được AI tests dùng; khác HTTP API của AI.
- [shared/error.schema.json](shared/error.schema.json): error envelope chung cho API tương lai; baseline chưa tự đổi envelope lỗi.

Mỗi `.schema.json` đi cùng `.schema.examples.json`, gồm `valid`/`invalid`. Mỗi OpenAPI có `openapi.examples.json`, sample gồm `schema` là tên component và `value` là payload. Ví dụ không gọi provider hoặc endpoint thật.

## Validation và thay đổi

CI manifest có 13 nhóm contract: chín HTTP API specs, events, sockets, ai-tools và shared errors. CI kiểm OpenAPI, tham chiếu liên file, JSON Schema và positive/negative examples. Gateway contract phụ thuộc provider contracts để change detection kiểm `$ref` bị ảnh hưởng; service skeleton chưa có job ứng dụng.

Với Python đã cài `.github/ci/requirements.txt`:

```bash
python .github/scripts/validate_contracts.py contracts/booking
python .github/scripts/validate_contracts.py contracts/gateway
python .github/scripts/validate_contracts.py contracts/sockets
```

Sửa contract tại provider owner, cập nhật examples và consumer/provider tests tương ứng. Thay file OpenAPI không tự thêm route hoặc đổi auth của runtime. Tham khảo [system contract](../docs/SYSTEM_CONTRACTS.md) và [ADRs](../docs/adr/README.md) cho transaction/policy đang mở.

Có thể bundle từng entry cho Swagger UI/client generation khi cần; chưa thêm bundler hoặc build output vào repo. Không duy trì thêm một bản OpenAPI toàn hệ thống chép tay song song. Các schema chung đã dùng `$ref` để có một nguồn định nghĩa.
