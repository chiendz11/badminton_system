# Kiểm tra artifact tuần 4–5 và skeleton

Phần ghi ngày18/10 bên dưới là kết quả trước khi tách contract. Cấu trúc và kết quả kiểm tra mới ngày19/10 nằm ở cuối tài liệu; các con số cũ không phải thống kê contract hiện tại.

Ngày 18/10/2026. Chỉ kiểm tra tĩnh tài liệu, schema và cây thư mục. Kết quả: **PASS** cho các kiểm tra dưới đây; không đồng nghĩa service đã triển khai hoặc artifact đã được nhóm phê duyệt.

| Kiểm tra | Kết quả |
| --- | --- |
| Link Markdown tương đối trong file mới/sửa | 162 link trỏ tới file/thư mục tồn tại |
| Mapping task Excel | Đúng 10 task, 5 mỗi tuần; ID/DRI/reviewer/deliverable/DoD/giờ/status đối chiếu ô gốc |
| ADR metadata | 9 ADR có đúng DRI/reviewers và evidence theo sheet ADR & Contracts, đều Proposed |
| OpenAPI | 3.1.0 hợp lệ; 53 operations và 61 component schemas cho phần mở rộng Proposed |
| Event / Socket JSON Schema | Draft2020-12 hợp lệ; 7 domain event types mới, 9 Socket event types |
| Schema examples | 7 positive được chấp nhận, 7 negative bị từ chối; gồm slot 30 phút/sender giả/quantity0/event sai version/trùng slot |
| Source legacy | 30 file tham chiếu đối chiếu SHA256 với git object ở commit 484d381e873f513ed4faa4413407502112f4885d |
| Input attachments | SHA256 của cả hai file đúng với source-provenance.json |
| Skeleton | Đủ 6 service, mỗi nhánh trống có .gitkeep; chỉ README và placeholders |
| Phạm vi thay đổi | Không sửa source Gateway/Core/AI/apps/packages, contract baseline, Compose, workspace/dependencies hoặc CI |
| Credential-shaped scan | Không tìm thấy Groq/GitHub/private-key patterns trong Markdown mới/sửa; không đọc `.env` |

Tools dùng riêng trong `/tmp`: Python, openapi-spec-validator và jsonschema; không thêm dependency vào repo. Link nguồn ngoài được kiểm qua git object tại commit pin, không dùng nội dung legacy chưa commit. Kiểm link nội bộ chỉ xác nhận path, không thay link checking trình duyệt/render hoặc kiểm API network.

Không chạy unit/integration/E2E ứng dụng, không gọi LLM/payment provider, không migrate database, không build container hoặc deploy. ADR/G01/G02 vẫn chờ review nhóm; folder-only chưa đạt gate runtime tuần 6.

## Cập nhật 19/10/2026 — contract theo service

- Chín OpenAPI 3.1 entry documents theo API owner; current/proposed operations có nhãn riêng.
- Cả 13 nhóm contract qua validator dùng các phiên bản dependency pin trong `.github/ci/requirements.txt`: OpenAPI, liên kết `$ref`, JSON Schema và positive/negative examples.
- 15 Node contract tests qua: Core5, Gateway2, Web4, Admin4. Bốn AI contract tests qua, gồm kiểm HTTP routes và MessageRequest schema khớp FastAPI mà không chạy lifespan/DB/LLM.
- Giữ nguyên 35 operation HTTP baseline của Core/Gateway và 16 schema/example files đang dùng. Toàn bộ proposal và 14 example payloads của thiết kế gộp đã được chuyển sang owner tương ứng.
- Xóa thư mục contract gộp với sáu file đã được thay thế; domain events chuyển vào events, Socket schema vào sockets. Catalog tập trung trong contracts/README.md và owner/status của từng OpenAPI.
- CI manifest có 21 component, trong đó 13 contract groups; các service skeleton vẫn chưa có application jobs. Không thay runtime endpoint, auth hoặc workflow AI.
- Rà soát cuối: 40 JSON files parse được, 734 `$ref` trỏ tới file/pointer nội bộ tồn tại, 250 link Markdown tương đối hợp lệ; dependency selection kiểm lại Gateway khi provider đổi và bỏ qua application matrix cho docs-only.

Node contract tests chạy local bằng Node26.7.0/pnpm10.25.0, AI contract tests dùng Python3.12.13. CI vẫn dùng Node22/Python3.12 theo manifest; chưa có kết quả chạy GitHub cho thay đổi này.

Chỉ chạy contract tests/validation phù hợp với thay đổi này; chưa chạy lại DB integration, E2E, build container hoặc deploy. CI trên GitHub chưa được kích hoạt bằng commit/push trong lần cập nhật local.

## Cập nhật 25/10/2026 — thống nhất số tuần 4–13

- Workbook vẫn có 10 tuần, 50 task và tổng 441 giờ dự kiến. Số tuần, task IDs W04–W13, dependency, lịch họp, deadline ADR và Quality Gates đã được cập nhật đồng bộ trên 7 sheet.
- Kiểm tra ZIP/XML xác nhận 4 công thức, cell styles, merged ranges, kích thước hàng/cột và data validations được giữ nguyên; owner/reviewer, priority, giờ và trạng thái công việc không đổi. Đây là kiểm tra cấu trúc file, không phải mở/render bằng ứng dụng Excel.
- Đã giữ bản sao workbook trước đổi số tuần trong Downloads. Provenance lưu checksum hiện tại và checksum/size trước thay đổi để phân biệt hai phiên bản đầu vào.
- Artifact chuyển sang `docs/week-4` và `docs/week-5`; 10 file cá nhân dùng mã W04/W05. Đối chiếu lại đúng 10 artifact với các ô Excel; kế hoạch Markdown có đủ 50 mã công việc theo thứ tự tuần 4–13.
- Rà 361 liên kết tương đối trong 57 tài liệu của dự án: không có đường dẫn hỏng ở thời điểm kiểm tra. Nguồn legacy phục vụ phát triển được giữ; artifact tuần và bản tóm tắt tuần 5 không chứa nội dung tham chiếu legacy.
- Chỉ sửa workbook và tài liệu/tham chiếu. Không chạy lại test ứng dụng, không đổi trạng thái Accepted của ADR hoặc kết quả nghiệm thu.
