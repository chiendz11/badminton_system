# Bản Đồ Tài Liệu Hệ Thống — Badminton Manager V2

Chào mừng bạn đến với kho tài liệu kỹ thuật và nghiệp vụ của dự án **Badminton Manager V2**. Toàn bộ tài liệu được chuẩn hóa theo tiến độ 10 tuần (từ Tuần 4 đến Tuần 13) và phân chia theo các miền nghiệp vụ - kỹ thuật rõ ràng.

---

## 1. Lộ trình, Kế hoạch & Báo cáo Tiến độ (Planning & Reports)

Bao gồm kế hoạch thực thi 10 tuần, phân rã 50 tasks chi tiết cho 5 thành viên và các báo cáo nghiệm thu từng tuần:

- **Bảng kế hoạch 10 tuần chi tiết (50 Tasks đầy đủ W04–W13):**
  - File Excel: [`Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx`](Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx)
  - File CSV chuẩn UTF-8: [`ke_hoach_badminton_de_hieu.csv`](ke_hoach_badminton_de_hieu.csv)
- **Báo cáo môn học tổng thể:** [`reports/README.md`](reports/README.md)
  - [Tuần 4 — Kế hoạch, bài toán và nghiệp vụ](reports/WEEK_04.md)
  - [Tuần 5 — Kiến trúc, dữ liệu và contract](reports/WEEK_05.md)
  - [Tuần 6 — Khung hệ thống và chạy local thành công](reports/WEEK_06.md)
  - [Kế hoạch các tuần tiếp theo 7–13](reports/PLAN_WEEK_04_13.md)
- **Hồ sơ chi tiết theo tuần của 5 thành viên (Weekly Deliverables):**
  - [**Tuần 4 (Business Discovery)**](week-4/README.md): Khảo sát nghiệp vụ, phân tích bối cảnh, 8 user stories, quy tắc chat/thông báo, RBAC, POS và use cases AI.
  - [**Tuần 5 (Architecture Baseline)**](week-5/README.md): Sơ đồ kiến trúc C4, ERD database, hợp đồng API/Socket, ma trận phân quyền, đặc tả AI tools.
  - [**Tuần 6 (Foundation Skeleton)**](week-6/README.md): Báo cáo nghiệm thu hoàn thành 100% Gate Tuần 6 (Booking Core, React Web, Social Service, Content Service, AI Service, Docker Compose, cụm k3d local và CI/CD).

---

## 2. Yêu cầu Nghiệp vụ & Hợp đồng Tích hợp (Business Requirements)

Tài liệu định nghĩa bài toán kinh doanh, ranh giới actor, 25 yêu cầu chức năng (V2-F01 đến V2-F25) và các quy tắc giao dịch:

- [**Tài liệu Yêu cầu Nghiệp vụ Toàn diện (BRD.md)**](BRD.md): Bản đặc tả yêu cầu nghiệp vụ chính thức, invariant chống trùng sân, máy trạng thái thanh toán PayOS và luồng sang nhượng vé.
- [**Bản phân tích BRD V2 Tuần 4**](week-4/BRD_SYSTEM_V2.md): Đầu ra khảo sát nghiệp vụ ban đầu của nhóm 5 người.
- [**Cẩm nang Hợp đồng Hệ thống (SYSTEM_CONTRACTS.md)**](SYSTEM_CONTRACTS.md): Danh mục hợp đồng REST, WebSockets, Domain Events trên RabbitMQ và quy tắc tương thích ngược.
- [**Kế thừa Giao diện Cũ (LEGACY_UI.md)**](LEGACY_UI.md): Bố cục màn hình và các luồng giao diện kế thừa từ repository nguồn.

---

## 3. Kiến trúc Hệ thống & Quyết định Kỹ thuật (Architecture & ADRs)

Kiến trúc Hybrid kết hợp Modular Monolith cho Booking Core và các Bounded Microservices:

- [**Kiến trúc Đích Tổng thể V2 (ARCHITECTURE.md)**](ARCHITECTURE.md): Phân tích toàn diện 11 service cũ từ legacy repo, thiết kế ranh giới giao dịch mới, lược đồ quan hệ và mô hình triển khai.
- [**Đối chiếu Hiện trạng & Khoảng cách (architecture/SYSTEM_ARCHITECTURE.md)**](architecture/SYSTEM_ARCHITECTURE.md): Sơ đồ C4 Container, ranh giới dữ liệu và lộ trình di chuyển.
- [**Cấu trúc Codebase & Trách nhiệm Module (architecture/CODEBASE_ARCHITECTURE.md)**](architecture/CODEBASE_ARCHITECTURE.md): Hướng dẫn tổ chức thư mục trong Monorepo và quy tắc phụ thuộc.
- [**Ánh xạ Skeleton Hệ thống (architecture/SKELETON_MAPPING.md)**](architecture/SKELETON_MAPPING.md): Bảng đối chiếu các service mới trong thư mục `services/`.
- [**Hồ sơ Quyết định Kiến trúc (adr/README.md)**](adr/README.md): Bộ 9 quyết định kỹ thuật cốt lõi (ADR-001 đến ADR-009) về Database, Message Queue, Framework và bảo mật.

---

## 4. Hướng Dẫn Kỹ Thuật Dịch Vụ (Service Guides)

Tài liệu chi tiết cho từng dịch vụ nghiệp vụ trong hệ thống:

- [**Booking Core Service (BOOKING_CORE.md)**](BOOKING_CORE.md): Hướng dẫn thiết lập Prisma ORM, migrations, seed dữ liệu, khóa giữ chỗ tạm thời và chống double-booking.
- [**API Gateway (API_GATEWAY.md)**](API_GATEWAY.md): Cổng tiếp nhận tập trung (Port 8081), định tuyến request, xác thực JWT và kiểm tra phân quyền RBAC.
- [**Trợ lý Ảo AI (AI_SERVICE.md)**](AI_SERVICE.md): Kiến trúc dịch vụ AI (FastAPI + LangGraph), hướng dẫn khởi chạy offline và cấu hình LLM provider.
- [**Nâng cấp AI Khuyến nghị & Đàm phán (AI_SERVICE_UPGRADE.md)**](AI_SERVICE_UPGRADE.md): Thuật toán trích xuất ràng buộc (constraints), gợi ý gần đúng (near-miss) và revalidation.
- [**Walkthrough Chi tiết Code AI Service (AI_SERVICE_CODE_WALKTHROUGH.md)**](AI_SERVICE_CODE_WALKTHROUGH.md): Hướng dẫn giải thích từng dòng mã nguồn và workflow LangGraph.
- [**Tính năng Trợ lý AI Đặt sân (AI_ASSISTANCE_FEATURES.md)**](AI_ASSISTANCE_FEATURES.md): Các ca sử dụng tra cứu FAQ, so sánh cơ sở sân và hủy lịch tự phục vụ.

---

## 5. Vận Hành, CI/CD & Giám Sát (DevOps, CI/CD & Observability)

Quy trình tự động hóa kiểm thử, đóng gói container và giám sát thời gian thực:

- [**Quy chuẩn CI/CD Pipeline (CI.md)**](CI.md): Bộ kiểm định hợp đồng Node, Unit/Contract/Integration tests, quét bảo mật container Trivy (0 CVEs) và luồng Continuous Delivery (`publish-and-deploy.yml`).
- [**Quy chuẩn Giám sát & Đo lường (MONITORING.md)**](MONITORING.md): Cấu hình Prometheus thu thập metrics, Alertmanager và Grafana dashboards giám sát ứng dụng.
- [**Kiểm chứng Môi trường Local (VALIDATION.md)**](VALIDATION.md): Bảng kiểm tra sức khỏe hệ thống và kết quả nghiệm thử thực tế.
- [**Cẩm nang Vận hành (runbooks/README.md)**](runbooks/README.md): Hướng dẫn xử lý sự cố và vận hành hệ thống.
