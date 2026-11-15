# Bản Đồ Tài Liệu Hệ Thống — Badminton Manager V2

Kho tài liệu kỹ thuật và nghiệp vụ của dự án **Badminton Manager V2** được tổ chức theo cấu trúc phân cấp chuẩn mực (Domain-Centric & Week-Milestone Hierarchy), hỗ trợ đầy đủ tiến độ 10 tuần học tập và phát triển mã nguồn.

```
docs/
├── planning/              # Kế hoạch tổng thể 10 tuần (Excel, CSV, Markdown, Provenance)
├── week-4/                # Khảo sát nghiệp vụ: Master BRD, BRD V2, 5 Artifacts W04
├── week-5/                # Thiết kế kỹ thuật: Master Architecture, Contracts, ADRs, 5 Artifacts W05
├── week-6/                # Khung hệ thống (Skeleton): 5 Artifacts W06, nghiệm thu Gate G03
├── week-7/                # Lát cắt Đặt sân & Xác thực (Booking Slice): 5 Artifacts W07, nghiệm thu Gate G04, PPTX
├── reports/               # Báo cáo thảo luận hàng tuần (WEEK_04 -> WEEK_07, Biên bản bàn giao)
├── services/              # Tài liệu kỹ thuật chi tiết các dịch vụ (Core, Gateway, UI, AI Subsystem)
└── devops/                # Tự động hóa CI/CD, Giám sát Prometheus/Grafana, Kiểm chứng & Runbooks
```

---

## 1. Kế hoạch Tổng thể 10 Tuần (Planning)

Tập hợp đầy đủ hồ sơ phân công chi tiết 50 tasks (W04–W13) cho 5 thành viên nhóm:

- [**Tổng quan Kế hoạch 10 Tuần (planning/README.md)**](planning/README.md): Bản đồ tổng thể lộ trình từ Tuần 4 đến Tuần 13 và vai trò của 5 kỹ sư.
- [**Bảng tính Kế hoạch Chi tiết (.xlsx)**](planning/Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx): File Excel trực quan, phân định rõ Mã việc, Người làm, Mô tả dễ hiểu, Đầu ra cụ thể, Tiêu chí xong và Giờ dự kiến.
- [**Bảng dữ liệu Kế hoạch (.csv)**](planning/ke_hoach_badminton_de_hieu.csv): File CSV UTF-8 phục vụ tự động hóa kiểm tra tiến độ.
- [**Đặc tả Phân rã Kế hoạch (PLAN_WEEK_04_13.md)**](planning/PLAN_WEEK_04_13.md): Tài liệu kỹ thuật quy định ranh giới và tiêu chuẩn bàn giao giữa các tuần.
- [**Truy xuất Nguồn gốc Kế hoạch (source-provenance.json)**](planning/source-provenance.json): Checksum SHA256 và bằng chứng nguồn gốc của kế hoạch.

---

## 2. Các Cột mốc Thực thi Theo Tuần (Weekly Milestones & Artifacts)

### [Tuần 4 — Khảo sát Nghiệp vụ & Phạm vi MVP (week-4/)](week-4/README.md)
Giai đoạn nghiên cứu bài toán, phân tích hiện trạng hệ thống cũ và chốt phạm vi sản phẩm:
- [**Master BRD (BRD.md)**](week-4/BRD.md): **Tài liệu Yêu cầu Nghiệp vụ Cốt lõi của Toàn hệ thống** (4 phân hệ, 25 yêu cầu chức năng V2-F01 đến V2-F25, quy tắc thanh toán PayOS và chuyển nhượng vé).
- [**BRD Kỹ thuật Bổ trợ (BRD_SYSTEM_V2.md)**](week-4/BRD_SYSTEM_V2.md): Bản tổng hợp nghiệp vụ từ 5 artifact kỹ thuật.
- **5 Artifact Phân tích Cá nhân**:
  - `W04-N1`: [Khung BRD & Bối cảnh nghiệp vụ](week-4/W04-N1_business-discovery.md) (Người 1)
  - `W04-N2`: [User Stories & Wireflow nhượng sân](week-4/W04-N2_pass-ux.md) (Người 2)
  - `W04-N3`: [Quy tắc Chat & Kịch bản thông báo](week-4/W04-N3_social-notification.md) (Người 3)
  - `W04-N4`: [Dự thảo RBAC & Use cases Admin/POS](week-4/W04-N4_identity-commerce-content.md) (Người 4)
  - `W04-N5`: [AI Use cases & Yêu cầu phi chức năng NFR](week-4/W04-N5_ai-nfr.md) (Người 5)

### [Tuần 5 — Thiết kế Kỹ thuật & System Contracts (week-5/)](week-5/README.md)
Giai đoạn chuẩn hóa kiến trúc và các hợp đồng giao tiếp trước khi viết code:
- [**Master Architecture Baseline (ARCHITECTURE.md)**](week-5/ARCHITECTURE.md): **Tài liệu Kiến trúc Chuẩn Toàn hệ thống V2** (Phân rã 9 microservices, Database-per-Service, Event-Driven Outbox).
- [**Cẩm nang Hợp đồng Hệ thống (SYSTEM_CONTRACTS.md)**](week-5/SYSTEM_CONTRACTS.md): Chuẩn JWT, ranh giới dữ liệu, idempotency key và cơ chế retry Exponential Backoff.
- [**Hồ sơ 9 Quyết định Kiến trúc (adr/)**](week-5/adr/README.md): Bộ quyết định ADR-001 đến ADR-009 đã được phê duyệt (Accepted).
- [**Thư viện Phân tích Chuyên sâu (architecture/)**](week-5/architecture/SYSTEM_ARCHITECTURE.md): Bao gồm [Ánh xạ Mã nguồn Cũ (SKELETON_MAPPING.md)](week-5/architecture/SKELETON_MAPPING.md) và [Cấu trúc Tổ chức Codebase (CODEBASE_ARCHITECTURE.md)](week-5/architecture/CODEBASE_ARCHITECTURE.md).
- **5 Artifact Thiết kế Cá nhân**:
  - `W05-N1`: [Kiến trúc C4, ADR & ERD Booking Core](week-5/W05-N1_architecture.md) (Người 1)
  - `W05-N2`: [Wireframes, Pass OpenAPI Contract](week-5/W05-N2_pass-ui-api.md) (Người 2)
  - `W05-N3`: [Socket.IO Contract & Event Catalog](week-5/W05-N3_social-events.md) (Người 3)
  - `W05-N4`: [Database Schemas V1 & RBAC Matrix](week-5/W05-N4_data-rbac.md) (Người 4)
  - `W05-N5`: [AI API/Tool Spec & Kế hoạch Deployment](week-5/W05-N5_ai-platform.md) (Người 5)

### [Tuần 6 — Khung Hệ thống (Skeleton) & Chạy Local (week-6/)](week-6/README.md)
Hiện thực hóa thành công 100% khung ứng dụng trên môi trường local (Đạt chuẩn Quality Gate G03):
- **5 Artifact Thực thi Cá nhân**:
  - `W06-N1`: [Booking Core skeleton, schema & migration](week-6/W06-N1_booking-core.md) (Người 1)
  - `W06-N2`: [React frontend shell & marketplace mocks](week-6/W06-N2_frontend-shell.md) (Người 2)
  - `W06-N3`: [Social service skeleton, Mongo & Socket.IO PoC](week-6/W06-N3_social-realtime.md) (Người 3)
  - `W06-N4`: [Content service, Admin shell & Docker hardening](week-6/W06-N4_content-admin.md) (Người 4)
  - `W06-N5`: [AI service FastAPI, Dual Runtime & CI/CD](week-6/W06-N5_ai-platform.md) (Người 5)

### [Tuần 7 — Lát cắt Đặt sân & Xác thực người dùng (week-7/)](week-7/README.md)
Hiện thực hóa thành công lát cắt dọc Đặt sân và Định danh (Đạt chuẩn Quality Gate G04 100%):
- [**Slide Báo cáo PowerPoint Tuần 7 (Bao_Cao_Tuan_7_Badminton_Manager.pptx)**](week-7/Bao_Cao_Tuan_7_Badminton_Manager.pptx)
- [**Thư viện Ảnh chụp Màn hình Kiểm chứng (screenshots/)**](week-7/screenshots/)
- **5 Artifact Thực thi Cá nhân**:
  - `W07-N1`: [Booking Core Concurrency ACID & Slot Hold Rules](week-7/W07-N1_booking-concurrency-acid.md) (Người 1)
  - `W07-N2`: [Web Booking Integration & Auth Shell](week-7/W07-N2_web-booking-integration.md) (Người 2)
  - `W07-N3`: [Social 1-1 Chat Progress & Recovery Plan](week-7/W07-N3_social-chat-progress.md) (Người 3)
  - `W07-N4`: [Identity MVP, Multi-role Seed & Auth RBAC](week-7/W07-N4_identity-auth-rbac.md) (Người 4)
  - `W07-N5`: [AI Assistant Q-Style & K8s Cluster Operations](week-7/W07-N5_ai-assistant-platform.md) (Người 5)

---

## 3. Báo cáo Tiến độ Thảo luận (Reports)

Tập trung các bản báo cáo hàng tuần phục vụ đăng bài trên chuyên mục GitHub Discussions của môn học:

- [**Chỉ mục Báo cáo Tiến độ (reports/README.md)**](reports/README.md): Hướng dẫn quy trình đăng báo cáo định kỳ mỗi thứ Hai.
- [**Báo cáo Tuần 4 (reports/WEEK_04.md)**](reports/WEEK_04.md): Kết quả khảo sát nghiệp vụ và hoàn thành Master BRD.
- [**Báo cáo Tuần 5 (reports/WEEK_05.md)**](reports/WEEK_05.md): Kết quả thiết kế kỹ thuật, hợp đồng dịch vụ và bộ 9 ADR.
- [**Báo cáo Tuần 6 (reports/WEEK_06.md)**](reports/WEEK_06.md): Kết quả chạy thử nghiệm hệ thống kép (Compose + k3d) và vượt qua Gate G03.
- [**Báo cáo Tuần 7 (reports/WEEK_07.md)**](reports/WEEK_07.md): Kết quả lát cắt Đặt sân, Concurrency ACID GiST và nghiệm thu Gate G04.
- [**Biên bản Bàn giao Tuần 4–5 (reports/DELIVERY_W04_W05.md)**](reports/DELIVERY_W04_W05.md): Biên bản đối chiếu bàn giao giữa hai giai đoạn.

---

## 4. Hướng Dẫn Kỹ Thuật Các Dịch Vụ (Services)

Toàn bộ hướng dẫn phát triển và tài liệu từng dịch vụ trong [`docs/services/`](services/README.md):

- [**Booking Core Service (services/booking-core.md)**](services/booking-core.md): Cài đặt NestJS, Prisma, PostgreSQL, khóa giữ chỗ 10 phút và bảo vệ ACID.
- [**API Gateway (services/api-gateway.md)**](services/api-gateway.md): Cơ chế Reverse Proxy định tuyến tập trung, kiểm tra JWT và rate limiting.
- [**Kế thừa Giao diện Cũ (services/legacy-ui.md)**](services/legacy-ui.md): Quy trình kế thừa giao diện từ repo gốc và [hồ sơ nguồn gốc (legacy-ui-provenance.json)](services/legacy-ui-provenance.json).
- [**Chỉ mục Hợp đồng API (services/api/README.md)**](services/api/README.md): Danh mục OpenAPI contracts của 9 microservices.
- [**Phân hệ Trợ lý Thông minh (services/ai/)**](services/ai/README.md):
  - [Tổng quan AI Service (ai/README.md)](services/ai/README.md): FastAPI, LangGraph workflow và bộ nhớ đàm thoại.
  - [Kiến trúc LangChain Tools & LangGraph (ai/LANGGRAPH_WORKFLOW_AND_TOOLS.md)](services/ai/LANGGRAPH_WORKFLOW_AND_TOOLS.md): Danh mục 9 Tools, sơ đồ StateGraph 11 Node và kiểm chứng Provider K8s.
  - [Nâng cấp Khuyến nghị & Đàm phán (ai/UPGRADE.md)](services/ai/UPGRADE.md): Đề xuất nới lỏng điều kiện tìm sân khi hết giờ.
  - [Tính năng Trợ lý AI (ai/FEATURES.md)](services/ai/FEATURES.md): Tra cứu lịch sử, hủy vé 2 bước và giải đáp FAQ.
  - [Code Walkthrough Chi tiết (ai/CODE_WALKTHROUGH.md)](services/ai/CODE_WALKTHROUGH.md): Phân tích chi tiết từng tầng code.

---

## 5. Vận Hành, CI/CD & Giám Sát (DevOps & Platform)

Toàn bộ tài liệu tự động hóa và giám sát trong [`docs/devops/`](devops/README.md):

- [**Framework k3d Local, Argo CD & CI/CD Toàn Diện (devops/LOCAL_K3D_ARGOCD_CICD_FRAMEWORK.md)**](devops/LOCAL_K3D_ARGOCD_CICD_FRAMEWORK.md): **Cẩm nang chuẩn hóa toàn diện 3-Tier Multi-Repo**, hướng dẫn cài đặt k3d local, cấu hình Argo CD GitOps, tích hợp LocalStack Secrets Manager, Ingress ALB, HPA scaling và quy chuẩn bổ sung microservice mới.
- [**Quy trình CI/CD Tự động hóa (devops/ci-cd.md)**](devops/ci-cd.md): Cơ chế phát hiện thay đổi theo đồ thị (`detect_changes.py`), ma trận kiểm thử 22 components và quy chuẩn merge PR.
- [**Quy chuẩn Truy xuất Nguồn gốc Provenance (devops/provenance.md)**](devops/provenance.md): Tiêu chuẩn 6 mục tiêu Traceability, Reproducibility, Security, Audit, Debugging, Rollback; quy chuẩn lockfile, immutable image tags, AI model/prompt versioning và GitOps promotion.
- [**Quy chuẩn Giám sát Toàn diện (devops/monitoring.md)**](devops/monitoring.md): Chuẩn Prometheus metrics, Alertmanager rules, Grafana dashboards và Loki logging.
- [**Biên bản Kiểm chứng Local (devops/validation.md)**](devops/validation.md): Kết quả khởi động các container và smoke tests local.
- [**Nghiệm thu Artifacts (devops/artifact-validation.md)**](devops/artifact-validation.md): Bảng kiểm tra tính đầy đủ của các artifacts Tuần 4 và Tuần 5.
- [**Cẩm nang Xử lý Sự cố (devops/runbooks/)**](devops/runbooks/README.md): Quy trình vận hành và ứng cứu sự cố khẩn cấp.
