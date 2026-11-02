# Kế hoạch dự án 10 tuần — tuần 4 đến tuần 13 môn học

## Quy ước và phạm vi

Kế hoạch gồm 10 tuần, đánh số thống nhất từ **tuần 4 đến tuần 13** trong Excel, tài liệu và báo cáo môn học. Mã công việc dùng W04-N1 đến W13-N5; dependency và deadline dùng cùng số tuần.

Đây là bản ánh xạ kế hoạch gốc, không phải bảng nghiệm thu. Không tự đặt ngày lịch vì chưa có ngày bắt đầu tuần môn học. Status gốc của 50 task trong Excel là “Chưa bắt đầu”; việc đã có code hoặc tài liệu hiện nay không tự chứng minh hoàn thành đúng tuần lịch sử.

Nguồn: `Badminton_Manager_TechCorp_10_Week_Plan.xlsx`, sheet **Kế hoạch 10 tuần**. Metadata và SHA256 đầu vào ở [source provenance](../source-provenance.json). Người1..5 theo workbook, chưa có tên thật được cung cấp.

## Tổng quan 10 tuần

| Tuần | Mục tiêu chung |
| --- | --- |
| 4 | Hiểu đầy đủ bài toán & chốt phạm vi MVP |
| 5 | Thống nhất thiết kế kỹ thuật & contract trước khi code |
| 6 | Chạy được skeleton toàn hệ thống trên local |
| 7 | Hoàn thành lát cắt tìm sân → giữ chỗ → tạo booking |
| 8 | Hoàn thiện thanh toán và đăng pass/chat theo bài |
| 9 | Hoàn chỉnh giao dịch pass sân từ đầu đến cuối |
| 10 | Hoàn thành các chức năng phụ và tích hợp liên miền |
| 11 | Chạy staging và đo chất lượng hệ thống |
| 12 | Nghiệm thu người dùng và chốt release candidate |
| 13 | Demo, phát hành và bàn giao có thể tái lập |

## Tình trạng chuẩn bị và phần cần điều chỉnh

- Tuần 4: đã có bản kế hoạch, BRD draft và 5 artifact nghiệp vụ; review nhóm/G01 chưa có evidence.
- Tuần 5: đã có kiến trúc, ERD khái quát, contract và 9 ADR Proposed; G02 chưa ký duyệt.
- Tuần 6: 6 service bổ sung mới folder-only theo phạm vi đã chọn. Gate chạy toàn hệ thống bằng Compose, health và FE gọi stub chưa đạt; công việc runtime còn lại cần chuyển tiếp sang tuần7 và ưu tiên trước các tính năng phụ.
- Core/Gateway/AI và UI tương ứng đã có implementation từ trước; không báo cáo các phần đó như vừa được xây mới trong ba tuần nếu không có lịch sử công việc xác nhận.
- AI read-only của kế hoạch đang khác execution runtime. Phạm vi payment/pass, các chỉ tiêu NFR và ngân sách cloud còn cần review; không sửa lịch cam kết một cách ngầm định.

Các bảng dưới giữ **công việc và đầu ra của kế hoạch** để nhóm và thầy thấy phần chậm/đổi rõ ràng. Báo cáo từng tuần nêu riêng phần carry-over và kế hoạch điều chỉnh, chỉ cập nhật baseline sau khi được thống nhất.

## Tuần 4

**Mục tiêu chung:** Hiểu đầy đủ bài toán & chốt phạm vi MVP.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W04-N1 | Người 1 | Điều phối discovery toàn sản phẩm | BRD outline + domain glossary + context nghiệp vụ | Người 2 |
| W04-N2 | Người 2 | Phân tích Booking & Pass UX | User stories + pass wireflow + acceptance criteria | Người 1 |
| W04-N3 | Người 3 | Phân tích Chat & Notification | Chat business rules + message/notification scenarios | Người 4 |
| W04-N4 | Người 4 | Phân tích Identity, Commerce, Content | RBAC draft + POS rules + admin use cases | Người 3 |
| W04-N5 | Người 5 | Phân tích AI & NFR | AI use cases + quality metrics + system NFR | Người 1 |

**Weekly gate kế hoạch:** Cả 5 người review nghiệp vụ; flow booking-payment-pass-chat và AI được mô tả không mâu thuẫn.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A2:O6. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 5

**Mục tiêu chung:** Thống nhất thiết kế kỹ thuật & contract trước khi code.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W05-N1 | Người 1 | Chốt kiến trúc tổng thể | C4 + ADR-001/002/003 + ERD tổng quát | Người 4 |
| W05-N2 | Người 2 | Chốt UX + API Pass | Wireframes + Pass OpenAPI + API examples | Người 1 |
| W05-N3 | Người 3 | Chốt Chat + Notification contracts | Socket contract + event catalog + ADR | Người 5 |
| W05-N4 | Người 4 | Chốt Identity/Commerce/Data | ERD/schema v1 + role matrix + technology ADR | Người 1 |
| W05-N5 | Người 5 | Chốt AI + Platform stack | AI API/tool spec + system deployment + ADR | Người 3 |

**Weekly gate kế hoạch:** ADR cốt lõi Accepted; các request/response quan trọng được chốt; không triển khai feature chính.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A7:O11. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 6

**Mục tiêu chung:** Chạy được skeleton toàn hệ thống trên local.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W06-N1 | Người 1 | Booking Core skeleton + schema | Booking Core health/OpenAPI/migration | Người 4 |
| W06-N2 | Người 2 | React shell + Marketplace mocks | React frontend shell + mocked pass screens | Người 3 |
| W06-N3 | Người 3 | Social skeleton | Social + Notification health/socket PoC | Người 2 |
| W06-N4 | Người 4 | Identity + Commerce schemas + Admin shell | Identity/Commerce/Content skeletons | Người 1 |
| W06-N5 | Người 5 | AI skeleton + CI/Compose | AI FastAPI skeleton + CI/Compose | Người 1 |

**Weekly gate kế hoạch:** docker compose up + health pass; PR test/lint/build xanh; FE có thể gọi stub API.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A12:O16. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 7

**Mục tiêu chung:** Hoàn thành lát cắt tìm sân → giữ chỗ → tạo booking.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W07-N1 | Người 1 | Court availability/booking ACID | Booking APIs + DB constraints + tests | Người 2 |
| W07-N2 | Người 2 | Booking History + Pass creation contract | Pass UI + PassPost draft endpoint | Người 1 |
| W07-N3 | Người 3 | JWT socket + private conversations | Secure private chat + tests | Người 4 |
| W07-N4 | Người 4 | Identity MVP + Commerce inventory | Identity auth + inventory CRUD | Người 3 |
| W07-N5 | Người 5 | AI FAQ baseline + evaluation | Eval script + FAQ MVP + baseline report | Người 1 |

**Weekly gate kế hoạch:** 2 user cùng giữ 1 slot: tối đa 1 thành công; web gọi API thật; access rule cơ bản pass.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A17:O21. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 8

**Mục tiêu chung:** Hoàn thiện thanh toán và đăng pass/chat theo bài.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W08-N1 | Người 1 | PayOS sandbox + idempotent webhook | Payment adapter & webhook integration tests | Người 2 |
| W08-N2 | Người 2 | PassPost + interest + browse | Pass marketplace MVP | Người 1 |
| W08-N3 | Người 3 | Pass Chat & notification contracts | Chat per PassPost + secure API | Người 2 |
| W08-N4 | Người 4 | Finish Identity + Commerce sale prototype | Identity v1 + POS sale PoC | Người 1 |
| W08-N5 | Người 5 | NL constraint extraction + Booking search tools | AI recommendation search API v0 | Người 3 |

**Weekly gate kế hoạch:** Người A book/pay thành công rồi đăng PassPost; B mở chat đúng bài; không spoof sender.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A22:O26. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 9

**Mục tiêu chung:** Hoàn chỉnh giao dịch pass sân từ đầu đến cuối.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W09-N1 | Người 1 | Transfer booking + outbox events | Pass transfer tx + event relay | Người 2 |
| W09-N2 | Người 2 | Complete Pass journey UI/E2E | Pass E2E flow + responsive fixes | Người 3 |
| W09-N3 | Người 3 | Notification consumers + chat reliability | Notification + reliable chat v1 | Người 5 |
| W09-N4 | Người 4 | Gateway + Admin integration | Gateway/Ingress routing + Admin UI | Người 1 |
| W09-N5 | Người 5 | AI ChatBox live + observability | AI ChatBox MVP + metrics | Người 4 |

**Weekly gate kế hoạch:** A chuyển đúng 1 booking cho B, post SOLD, notification phát một lần, UI cập nhật đúng.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A27:O31. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 10

**Mục tiêu chung:** Hoàn thành các chức năng phụ và tích hợp liên miền.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W10-N1 | Người 1 | Core hardening + performance | Core reliability report + fixes | Người 5 |
| W10-N2 | Người 2 | Pass E2E edge cases & UX | Pass Playwright suite + UAT draft | Người 1 |
| W10-N3 | Người 3 | Social scale & security tests | Realtime test report + policies | Người 5 |
| W10-N4 | Người 4 | Commerce & Content feature completion | Commerce/Content v1 + admin flows | Người 2 |
| W10-N5 | Người 5 | AI recommendation eval + Helm v1 | AI eval report + Helm charts | Người 3 |

**Weekly gate kế hoạch:** Không âm kho; role đúng; booking/pass/commerce/AI chạy cùng dev stack qua gateway.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A32:O36. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 11

**Mục tiêu chung:** Chạy staging và đo chất lượng hệ thống.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W11-N1 | Người 1 | Booking staging + backup/restore | Booking staging + restore evidence | Người 4 |
| W11-N2 | Người 2 | Pass acceptance on staging | Pass UAT report + fixes | Người 1 |
| W11-N3 | Người 3 | Social WSS multi-replica staging | Social staging & load report | Người 5 |
| W11-N4 | Người 4 | Identity/Commerce/Content staging | Ops checklist + staging APIs | Người 1 |
| W11-N5 | Người 5 | Staging platform + AI capacity | Staging platform + dashboard + AI quality report | Người 3 |

**Weekly gate kế hoạch:** Staging có URL demo; metrics/trace; rollback DB/app tested; golden AI eval pass.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A37:O41. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 12

**Mục tiêu chung:** Nghiệm thu người dùng và chốt release candidate.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W12-N1 | Người 1 | Booking RC failure scenarios | Booking RC sign-off | Người 2 |
| W12-N2 | Người 2 | Pass UAT & demo data | Pass UAT sign-off + demo dataset | Người 1 |
| W12-N3 | Người 3 | Social/Notification security & recovery | Social RC sign-off + runbook | Người 4 |
| W12-N4 | Người 4 | Identity/Commerce/Content & security gate | Data/security RC report | Người 5 |
| W12-N5 | Người 5 | AI release evaluation + rollback rehearsal | AI RC + release pipeline evidence | Người 1 |

**Weekly gate kế hoạch:** Không còn blocker P0; Critical/High xử lý/duyệt ngoại lệ; RC có tag và release notes.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A42:O46. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.

## Tuần 13

**Mục tiêu chung:** Demo, phát hành và bàn giao có thể tái lập.

| Mã công việc | DRI | Công việc theo kế hoạch | Output dự kiến | Peer reviewer |
| --- | --- | --- | --- | --- |
| W13-N1 | Người 1 | System release + architecture handoff | Architecture handbook + system release | Người 5 |
| W13-N2 | Người 2 | Pass demo & user documentation | Pass demo script + user guide | Người 3 |
| W13-N3 | Người 3 | Realtime + notification operations handoff | Realtime ops handbook | Người 2 |
| W13-N4 | Người 4 | Identity/Commerce/Admin/data handoff | Admin/commerce/content handbook | Người 1 |
| W13-N5 | Người 5 | AI model card + platform release | Model card + platform runbook | Người 4 |

**Weekly gate kế hoạch:** Người khác checkout → setup → seed → chạy demo từ docs; 5 người cùng xác nhận bàn giao.

**Nguồn:** sheet “Kế hoạch 10 tuần”, A47:O51. Output/gate trong phần này là mục tiêu, không chứng nhận đã hoàn thành.


## Cách dùng khi báo cáo

Mỗi tuần đối chiếu công việc/output với code, tài liệu và kết quả chạy thực tế; phân loại kết quả đã làm, công việc chuyển tiếp và kế hoạch tuần tới. Link evidence theo từng loại: commit/PR, CI run, artifact, test/eval report hoặc demo. Không dùng schema validation thay test nghiệp vụ hay dùng README skeleton thay healthcheck.

[Chỉ mục báo cáo và quy trình Discussions](README.md).
