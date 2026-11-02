## Báo cáo tuần 6

Báo cáo dùng số tuần 6 thống nhất với kế hoạch Excel. Nội dung được đối chiếu với artifact và kết quả thực tế trước khi đăng.

### 1. Những phần ĐÃ làm được:

- **Skeleton service:** Đã tạo cây thư mục và README cho Identity, Commerce, Social, Content, Notification và Storage, có module placeholders và thư mục test dự kiến.
- **Tổ chức repo:** Đã bổ sung `model-artifacts/ai` và các nhóm tài liệu ADR/API/architecture/runbooks. Schema migration thuộc từng service; các skeleton platform/data-migration dự phòng ở root đã được dọn. Hạ tầng và triển khai được quản lý tại các repo riêng.
- **Bảo toàn nền hiện có:** Giữ nguyên implementation Core/Gateway/AI, hai UI và cấu hình Compose/CI. Payment/pass được xác định là module tương lai trong Core, không tách thành service sở hữu booking riêng.
- **Đầu vào cho phát triển:** Đã liên kết skeleton với BRD, contract, phân công và nguồn legacy; phân biệt rõ thành phần có code với thành phần mới là thiết kế.
- **Kiểm tra tĩnh:** Bộ artifact đã được kiểm mapping Excel, link, OpenAPI/JSON Schema và ví dụ hợp lệ/không hợp lệ. Kết quả này kiểm tra tài liệu/schema, không phải test nghiệp vụ của service mới.

### 2. Những phần CHƯA làm được theo kế hoạch:

- **Chưa đạt gate tuần6 Excel:** Các service mới chỉ có thư mục/README/.gitkeep, chưa có runtime, healthcheck, schema migration, Compose startup và CI checks riêng.
- Chưa có Social socket PoC, Identity register/login stub hoặc frontend gọi API stub của các service bổ sung. Thư mục test trống chưa phải unit/integration tests.
- Chưa tích hợp toàn bộ Identity/Commerce/Social/Content/Notification/Storage vào Gateway hoặc hai ứng dụng; chưa có full-stack startup mới bằng một lệnh.
- Review BRD/ADRs và quyết định AI policy vẫn còn cần hoàn tất; AWS Staging, deployment và RAG benchmark chưa được kiểm chứng trong đợt chuẩn bị này.

### 3. Các vấn đề phát sinh cần trao đổi để chốt với thầy:

- Phạm vi chuẩn bị đã chọn là folder-only nên còn thiếu phần runtime so với kế hoạch gốc. Nhóm cần chốt phần carry-over và điều chỉnh ưu tiên trước khi phát triển nhiều tính năng cùng lúc.
- Có thể ưu tiên luồng Booking Core → Identity → Pass/Chat và AI tra cứu trước, lùi POS/Content nâng cao nếu không đủ thời gian không?
- Cần thống nhất tiêu chí nghiệm thu cụ thể cho skeleton chạy được, demo local/cloud và phạm vi AI để các thành viên phát triển theo cùng một mốc.

### 4. Kế hoạch tuần tiếp theo:

- **Ưu tiên công việc chuyển tiếp:** Hoàn thiện các service skeleton cần cho luồng P0 thành runtime có config/health/schema/checks thật; chỉ nối Compose/CI sau khi có ứng dụng. Ghi rõ phần nào vẫn chưa đạt gate thay vì đánh dấu cả tuần hoàn thành.
- **Người1:** Tiếp tục rà soát/kiểm chứng availability, giữ chỗ, booking và constraint đang có; chuẩn bị mở rộng Core theo contract đã được review.
- **Người2:** Tiếp tục Booking History/Pass UI kế thừa legacy, eligibility và form theo contract; nối API khi backend tương ứng sẵn sàng.
- **Người3:** Social runtime, JWT-derived sender, membership guard và private conversation; triển khai sau khi auth contract được chốt.
- **Người4:** Identity register/login/refresh/profile/RBAC và Commerce inventory theo ưu tiên; kiểm tra center scope và migrations.
- **Người5:** Hỗ trợ Compose/CI cho service có runtime, chuẩn bị FAQ/golden dataset và benchmark retrieval baseline có thể tái lập; chốt AI mode trước khi thay workflow/tool policy.
- Do có carry-over, nhóm cần rà lại sức chứa công việc tuần7; các mục trên là thứ tự ưu tiên, chưa cam kết hoàn tất mọi tính năng và cloud deployment trong cùng tuần.

Tài liệu kèm: [skeleton mapping](../architecture/SKELETON_MAPPING.md), [kiểm tra artifact](../ARTIFACT_VALIDATION.md), [kế hoạch gốc và đầu ra tuần7–13](PLAN_WEEK_04_13.md), [ADR-008 AI](../adr/ADR-008.md).
