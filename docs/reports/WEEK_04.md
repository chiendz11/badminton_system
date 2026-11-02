## Báo cáo tuần 4

Báo cáo dùng số tuần 4 thống nhất với kế hoạch Excel. Nội dung được đối chiếu với artifact và kết quả thực tế trước khi đăng.

### 1. Những phần ĐÃ làm được:

- **Kế hoạch dự án:** Đã lập và ánh xạ kế hoạch 10 tuần từ tuần4 đến tuần13, nêu mục tiêu, công việc, output, người phụ trách và người review của từng tuần.
- **Định vị bài toán:** Đã phân tích hệ thống quản lý sân cầu lông và codebase legacy; xác định các hành trình tìm sân, giữ chỗ, đặt sân, thanh toán, pass sân, chat và quản trị trung tâm.
- **Tài liệu nghiệp vụ:** Đã soạn BRD V2, glossary, actor/role matrix, user stories và các happy/error scenarios. Thời lượng đặt sân được xác định theo slot60phút.
- **Phân công nhóm:** Đã lập phân công 5 người theo Booking Core, Pass/Frontend, Social/Notification, Identity/Commerce/Content và AI/Platform; có owner/reviewer và tiêu chí đầu ra cho từng task.
- **Nền tảng phát triển:** Repo đã có CI cho các thành phần đang triển khai. Lát cắt Core/Gateway/AI là nền có sẵn để tiếp tục mở rộng, không tính là code mới hoàn thành riêng trong tuần này.

### 2. Những phần CHƯA làm được theo kế hoạch:

- BRD và phạm vi MVP hiện là bản dự thảo; chưa có evidence review cả nhóm hoặc kết luận G01, nên chưa ghi nhận “đã chốt toàn bộ nghiệp vụ”.
- Chưa thống nhất đầy đủ chính sách payment/pass, phạm vi AI, tiêu chí chất lượng và phần ưu tiên khi giới hạn thời gian.
- Hạ tầng có mã Terraform và cấu hình GitOps ở repository riêng; đợt rà soát này chưa kiểm chứng kết quả apply/deploy AWS Staging hoặc CI/CD hoạt động đầu-cuối.

### 3. Các vấn đề phát sinh cần trao đổi để chốt với thầy:

- Phạm vi MVP gồm các nghiệp vụ nào là bắt buộc trong 10 tuần; có cần giảm ưu tiên POS, Content hoặc tính năng phụ để bảo đảm luồng booking/pass/chat hoàn chỉnh không?
- AI chỉ hỗ trợ hỏi đáp/tìm sân/gợi ý hay được phép đặt sân sau xác nhận? Kế hoạch mới và code AI hiện tại đang khác nhau ở điểm này.
- Mức yêu cầu đối với demo cloud, AWS Staging và ngân sách vận hành cần đạt tới đâu?

### 4. Kế hoạch tuần tiếp theo:

- Rà soát BRD và phạm vi MVP, ghi nhận những quyết định được nhóm/thầy xác nhận.
- Hoàn thiện C4, service boundaries, DB ownership và ERD.
- Thiết kế contract REST/Socket/events, auth/authorization, error codes và idempotency; viết ADR cho các quyết định chính.
- Chuẩn bị thiết kế AI retrieval/evaluation và ánh xạ môi trường local/staging; chưa coi thiết kế RAG là benchmark đã chạy.

Tài liệu kèm: [kế hoạch 10 tuần](PLAN_WEEK_04_13.md), [artifact nghiệp vụ](../week-4/README.md), [BRD V2](../week-4/BRD_SYSTEM_V2.md), [CI](../CI.md).
