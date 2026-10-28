# Bàn giao thiết kế tuần 4–5 và skeleton V2

Excel, artifact và báo cáo môn học dùng chung số tuần 4–13. Bộ phân tích ở tuần 4, thiết kế/contract ở tuần 5, skeleton ở tuần 6; [chỉ mục báo cáo](reports/README.md) tổng hợp cùng cách đánh số.

Cập nhật 19/10/2026: contract đã được tách theo service, dùng `$ref` để giảm khai báo trùng và được CI kiểm theo 13 nhóm. Phần mô tả “giữ nguyên CI/contract baseline” bên dưới ghi nhận phạm vi lần bàn giao skeleton ngày18/10; lần tách contract này giữ nguyên endpoint/payload runtime và schema đang dùng, đồng thời bổ sung cấu hình CI cho các định nghĩa mới. [Catalog hiện tại](../contracts/README.md).

## Kết luận đối chiếu

File kiến trúc được cung cấp là **đích V2 dựa trên legacy**. Nó phù hợp định hướng boundaries nhưng không phản ánh đủ trạng thái hiện tại của repo mới: mới có Core/Gateway/AI và hai UI lát cắt. Kiến trúc còn đề xuất AI read-only, khác execution runtime; không thể coi toàn tài liệu là nguyên trạng đã triển khai.

Đầu vào: kiến trúc `.md` và workbook `.xlsx` trong Downloads; nguồn chính sheet “Kế hoạch 10 tuần”, kèm “ADR & Contracts”/“Quality Gates”. Source legacy đọc pristine commit `484d381e873f513ed4faa4413407502112f4885d`; target baseline `fbd3d4d538692b8ae383f561165c844fdf9d0bf2`. [Provenance](source-provenance.json) có SHA256 file nguồn và task/cell mapping; không commit lại Excel, dataset, model hoặc secrets.

## Artifact theo tuần

| Người | Tuần 4 | Tuần 5 |
| --- | --- | --- |
| 1 — Lead/Core | [Discovery, glossary, business context](week-4/W04-N1_business-discovery.md) | [C4, ERD, boundaries, ADR-001/002/003](week-5/W05-N1_architecture.md) |
| 2 — Pass/Frontend | [User stories, eligibility, wireflow, AC](week-4/W04-N2_pass-ux.md) | [Wireframes, Pass OpenAPI và ví dụ API](week-5/W05-N2_pass-ui-api.md) |
| 3 — Social/Notification | [Chat rules và notification scenarios](week-4/W04-N3_social-notification.md) | [Socket contract, event catalog, ACL/retry](week-5/W05-N3_social-events.md) |
| 4 — Identity/Commerce/Content | [RBAC, POS rules, Admin use cases](week-4/W04-N4_identity-commerce-content.md) | [Schema/ERD, role matrix, technology trade-offs](week-5/W05-N4_data-rbac.md) |
| 5 — AI/Platform | [AI use cases, eval metrics, system NFR](week-4/W04-N5_ai-nfr.md) | [AI/tool API, deployment, CI/telemetry/secrets](week-5/W05-N5_ai-platform.md) |

Mỗi file có ID, DRI, peer reviewer đúng ô Excel, dependency, DoD, giờ ước lượng và đầu ra bàn giao. Nguồn legacy phục vụ phát triển được giữ trong provenance, ADR và các tài liệu kỹ thuật ngoài thư mục artifact tuần. [Tuần4](week-4/README.md), [tuần5](week-5/README.md) có bảng gate. **G01/G02 chờ review**, không có Accepted ADR, biên bản giả hoặc khẳng định 5 người đã hoàn thành.

## Tài liệu chung

- [BRD_SYSTEM_V2](week-4/BRD_SYSTEM_V2.md): yêu cầu toàn hệ thống để nhóm chốt phạm vi; [BRD.md](BRD.md) baseline Core/AI được giữ nguyên.
- [SYSTEM_CONTRACTS](SYSTEM_CONTRACTS.md): contract handbook cho toàn bộ thành phần, ownership, auth, REST, Socket, events, retry/idempotency, compatibility và migration.
- [Contract catalog theo service](../contracts/README.md): chín OpenAPI entries, event/socket schemas và examples. Nhãn implemented/proposed phân biệt current và thiết kế.
- [ADR-001..009](adr/README.md): context/options/trade-offs/decision đề xuất/consequences/rollback, DRI/reviewers lấy từ sheet ADR.
- [ARCHITECTURE](ARCHITECTURE.md): kiến trúc đích V2 từ tài liệu được cung cấp; [SYSTEM_ARCHITECTURE](architecture/SYSTEM_ARCHITECTURE.md) đối chiếu current/target; [CODEBASE_ARCHITECTURE](architecture/CODEBASE_ARCHITECTURE.md) mô tả cấu trúc implementation.
- [SKELETON_MAPPING](architecture/SKELETON_MAPPING.md): ánh xạ tên kiến trúc ↔ paths repo mới và khoảng cách W6.

## Skeleton mới

| Path | Các phần chính | Owner |
| --- | --- | --- |
| services/identity-service | auth,user,profile,oauth,role,session,prisma | N4 |
| services/commerce-service | product,inventory,stock,sale,invoice,reporting,prisma | N4 |
| services/social-service | friendship,conversation,message,gateway,clients,guards | N3 |
| services/content-service | review,rating,news,clients | N4 |
| services/notification-service | consumers,notification,delivery,adapters,retry | N3 |
| services/storage-service | files,metadata,uploads,providers/cloudinary,authorization | N4+N5, đề xuất phân công |
| model-artifacts/ai | Metadata/registry manifests tương lai | N5 |
| docs/adr,api,architecture,runbooks | ADR/contract index/diagrams/runbook index | Cả nhóm theo domain |

Cập nhật tổ chức repo: đã bỏ skeleton platform và data-migration ở root. Hạ tầng AWS thuộc `badminton-infras`; GitOps quản lý manifests triển khai và cài stack monitoring. Nguồn monitoring ứng dụng nằm ở `monitoring/chart` trong app, dùng chung rule/dashboard cho Compose và Helm; GitOps tham chiếu chart bằng commit đã review. Migration schema của từng service vẫn được giữ. [Hướng dẫn monitoring](../monitoring/README.md) ghi lệnh local và bước pin trước khi sync production.

Các service có common và tests/unit,tests/integration placeholders; mọi nhánh trống có `.gitkeep`. Không có package/runtime/new UI/source copy. Không sửa code ba backend hiện tại, hai app, Compose, CI hay packages/contracts baseline. Payment/pass còn là module tương lai trong Core, không service riêng.

## Kiểm tra và giới hạn bàn giao

Đối chiếu task/cell Excel, source links pin commit, relative links nội bộ, JSON/OpenAPI schema và positive/negative examples bằng kiểm tra tĩnh. Kết quả cụ thể ghi ở [ARTIFACT_VALIDATION](ARTIFACT_VALIDATION.md) sau kiểm tra. Không chạy unit/integration/E2E ứng dụng hoặc gọi provider, không migrate/deploy.

Folder-only skeleton **chưa đáp ứng gate W6**: chưa full-stack Compose, service health, test/build mới hoặc FE gọi stub mới. AI policy, payment cutover, pass policy, refresh/revocation và các NFR còn cần nhóm chốt. Contract “đầy đủ” ở đây là đủ nhóm thành phần và critical integration để review, chưa đóng băng các chính sách đang mở thành giao kèo production.
