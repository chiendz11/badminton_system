# Tuần 5 — Thiết kế kỹ thuật và contract trước khi triển khai

Kế hoạch Excel, tên thư mục và báo cáo môn học đều dùng **tuần 5** cho giai đoạn thiết kế kỹ thuật và contract. Tham chiếu [báo cáo tuần 5](../reports/WEEK_05.md) và [kế hoạch tuần 4–13](../reports/README.md).

Nguồn phân công: workbook “Badminton_Manager_TechCorp_10_Week_Plan.xlsx”, sheet **Kế hoạch 10 tuần**, các dòng 7–11. Phạm vi tuần này là kiến trúc, mô hình dữ liệu, giao diện và contract làm đầu vào cho phát triển. Giờ trong bảng là ước lượng kế hoạch.

## Artifact của từng thành viên

| ID | DRI / ownership | Peer reviewer task | Artifact | Ước lượng kế hoạch |
| --- | --- | --- | --- | --- |
| W05-N1 | Người 1 — Tech Lead · Booking Core | Người 4 | [C4 + ADR-001/002/003 + ERD tổng quát](W05-N1_architecture.md) | 9h |
| W05-N2 | Người 2 — Pass Marketplace · Frontend | Người 1 | [Wireframes + Pass OpenAPI + API examples](W05-N2_pass-ui-api.md) | 8h |
| W05-N3 | Người 3 — Social Realtime · Notification | Người 5 | [Socket contract + event catalog + ADR](W05-N3_social-events.md) | 8h |
| W05-N4 | Người 4 — Identity · Commerce · Content | Người 1 | [ERD/schema v1 + role matrix + technology ADR](W05-N4_data-rbac.md) | 8h |
| W05-N5 | Người 5 — AI Service · MLOps · Platform | Người 3 | [AI API/tool spec + system deployment + ADR](W05-N5_ai-platform.md) | 9h |

Tổng khối lượng dự kiến: **42 giờ cho cả nhóm**. Đầu ra dùng chung gồm [system contracts](../SYSTEM_CONTRACTS.md), [Gateway OpenAPI](../../contracts/gateway/openapi.json), [hồ sơ ADR](../adr/README.md), [system architecture](../architecture/SYSTEM_ARCHITECTURE.md) và [quy ước monitoring](../MONITORING.md).

## Đối chiếu đầu ra với kế hoạch

| Người | Đầu ra theo Excel | Nội dung có trong bộ tài liệu |
| --- | --- | --- |
| Người 1 | C4 + ADR-001/002/003 + ERD | Context/boundary, owner/store, ERD và transaction boundary; liên kết hồ sơ ADR kiến trúc. |
| Người 2 | Wireframes + Pass OpenAPI + examples | Wireframe, cấu trúc frontend, 9 thao tác Pass API, request/response và error/UI mapping. |
| Người 3 | Socket contract + event catalog + ADR | Socket protocol, JWT/room ACL, schema/indexes, event payload, retry/dedupe và threat model. |
| Người 4 | ERD/schema v1 + role matrix + technology ADR | Schema Identity/Commerce/Content/Storage, JWT/RBAC, sale-stock invariant và technology/cost trade-offs. |
| Người 5 | AI API/tool spec + deployment + ADR | Profile AI/tool boundary, evaluation design, environment/port/secrets và CI/release/observability plan. |

Bộ tài liệu đã có đủ **5 đầu ra thiết kế cá nhân** cùng các contract và hồ sơ kiến trúc liên quan. Bảng này đối chiếu sự hiện diện và nội dung của tài liệu; trạng thái phê duyệt quyết định được quản lý trong hồ sơ ADR và review của nhóm.

## Tiêu chí nghiệm thu theo kế hoạch — G02

Cả nhóm review boundary, DB ownership, request/response, auth, error và event/socket semantics. Theo Excel, gate G02 yêu cầu các ADR cốt lõi được Accepted và các contract quan trọng được thống nhất. Việc nghiệm thu sử dụng nội dung tài liệu, hồ sơ ADR và review tương ứng.

## Bàn giao sang tuần 6

- Người 1: Booking Core modules/schema, migration, health và contract tests.
- Người 2: React shell, mocked pass screens, shared API client và UI states.
- Người 3: Social/Notification skeleton, Mongo schemas và Socket.IO auth PoC.
- Người 4: Identity/Commerce/Content skeleton, schema/migration và Admin shell.
- Người 5: AI FastAPI skeleton, Compose, CI và cấu hình môi trường theo contract.

Mục tiêu tuần 6 theo Excel là chạy được skeleton toàn hệ thống trên local: Compose/health, lint/test/build và frontend gọi API. Tuần 5 bàn giao thiết kế và contract; tuần 6 hiện thực hóa các đầu vào đó thành skeleton chạy được.
