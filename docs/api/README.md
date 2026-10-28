# Chỉ mục contract API

- [Catalog theo service](../../contracts/README.md): chín entry documents, owner, status và native/public mappings.
- [Booking Core](../../contracts/booking/openapi.json): current booking + payment/pass Proposed.
- [Gateway public](../../contracts/gateway/openapi.json): current + Proposed tham chiếu provider, không nhập internal endpoints.
- [AI HTTP](../../contracts/ai/openapi.json): current FastAPI + read-only chat Proposed.
- Proposed: [Identity](../../contracts/identity/openapi.json), [Commerce](../../contracts/commerce/openapi.json), [Social](../../contracts/social/openapi.json), [Content](../../contracts/content/openapi.json), [Notification](../../contracts/notification/openapi.json), [Storage](../../contracts/storage/openapi.json).
- [Booking events](../../contracts/events/booking-event.schema.json), [domain events Proposed](../../contracts/events/domain-event.schema.json), [Socket Proposed](../../contracts/sockets/social-event.schema.json).
- [System handbook](../SYSTEM_CONTRACTS.md): auth, ownership, transaction, retry và business policy.

Mỗi OpenAPI có `openapi.examples.json`; JSON Schema có `.schema.examples.json`. CI kiểm cấu trúc/ví dụ, không chứng minh endpoint Proposed đã chạy. Review/ngày chốt và consumer verification vẫn cần evidence nhóm.
