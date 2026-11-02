# Tuần 5 — Thiết kế Kiến trúc Kỹ thuật & System Contracts

Thư mục này lưu trữ toàn bộ hồ sơ thiết kế kỹ thuật, mô hình dữ liệu (ERD), ranh giới dịch vụ và các hợp đồng giao tiếp (Contracts) của giai đoạn **Tuần 5** thuộc dự án **Badminton Manager V2**, đóng vai trò là kim chỉ nam kỹ thuật trước khi bước vào triển khai mã nguồn ở Tuần 6.

Tham chiếu:
- [Báo cáo môn học Tuần 5](../reports/WEEK_05.md)
- [Kế hoạch tổng thể 10 tuần](../planning/README.md)

---

## 1. Hồ sơ Kiến trúc & Hợp đồng Kỹ thuật Trung tâm

| Tài liệu / Thư mục | Vai trò & Mục đích | Trọng tâm kỹ thuật |
| :--- | :--- | :--- |
| [**ARCHITECTURE.md (Master Architecture Baseline)**](ARCHITECTURE.md) | **Tài liệu Kiến trúc Chuẩn Toàn hệ thống (Master Architecture)** | Thiết kế kiến trúc tổng thể V2, mô hình phân rã 9 microservices, cơ chế Database Per Service, mẫu thiết kế Outbox Pattern & Event-Driven, luồng xác thực JWT liên miền và hạ tầng triển khai Docker Compose. |
| [**SYSTEM_CONTRACTS.md**](SYSTEM_CONTRACTS.md) | **Cẩm nang Hợp đồng Hệ thống (System Contracts Handbook)** | Quy định chi tiết hợp đồng giao tiếp giữa các dịch vụ: định dạng JWT Claims, ranh giới quyền dữ liệu (ownership), chiến lược idempotency key chống gọi lặp, cơ chế retry Exponential Backoff và ranh giới chỉ đọc của AI Service. |
| [**Hồ sơ Quyết định Kiến trúc (adr/)**](adr/README.md) | **Bộ 9 Architecture Decision Records (ADR)** | Ghi nhận chi tiết các quyết định kỹ thuật quan trọng và lý do đánh đổi (ADR-001 đến ADR-009): Database-per-Service, Event-Driven với Outbox, Distributed Locking, REST vs gRPC, Socket.IO realtime, Stateless JWT, CQRS. |
| [**Phân tích Kiến trúc Chi tiết (architecture/)**](architecture/SYSTEM_ARCHITECTURE.md) | **Thư viện Phân tích Chuyên sâu** | Bao gồm: [Ánh xạ Mã nguồn Cũ sang Mới (SKELETON_MAPPING.md)](architecture/SKELETON_MAPPING.md), [Đối chiếu Hiện trạng Kiến trúc (SYSTEM_ARCHITECTURE.md)](architecture/SYSTEM_ARCHITECTURE.md) và [Cấu trúc Tổ chức Codebase (CODEBASE_ARCHITECTURE.md)](architecture/CODEBASE_ARCHITECTURE.md). |

---

## 2. Artifact Thiết kế Kỹ thuật Chi tiết của 5 Thành viên

Nguồn phân công: Theo workbook [Kế hoạch 10 tuần](../planning/Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx), dòng 7–11. Mỗi thành viên hoàn thành 1 artifact kỹ thuật độc lập:

| Mã việc | Thành viên phụ trách (DRI) | Reviewer | Tài liệu Artifact | Khối lượng |
| :--- | :--- | :--- | :--- | :--- |
| **W05-N1** | Người 1 — Tech Lead & Booking Core | Người 4 | [**Kiến trúc C4, Bộ ADR-001/002/003 & ERD Booking Core**](W05-N1_architecture.md) | 9h |
| **W05-N2** | Người 2 — Frontend Shell & Pass Marketplace | Người 1 | [**Wireframes chi tiết, Pass OpenAPI Contract & Examples**](W05-N2_pass-ui-api.md) | 8h |
| **W05-N3** | Người 3 — Social Realtime & Notification | Người 5 | [**Socket.IO Contract, Event Catalog & ADR Chat**](W05-N3_social-events.md) | 8h |
| **W05-N4** | Người 4 — Identity, Commerce & Content | Người 1 | [**Database Schemas V1, RBAC Role Matrix & ADR Công nghệ**](W05-N4_data-rbac.md) | 8h |
| **W05-N5** | Người 5 — AI Platform & System Deployment | Người 3 | [**AI API/Tool Spec, Kế hoạch Triển khai & ADR Platform**](W05-N5_ai-platform.md) | 9h |

---

## 3. Đối chiếu Đầu ra với Kế hoạch Đề ra

| Thành viên | Yêu cầu đầu ra theo Kế hoạch | Kết quả thể hiện trong bộ tài liệu |
| :--- | :--- | :--- |
| **Người 1** | C4 + ADR-001/002/003 + ERD | Sơ đồ ngữ cảnh & ranh giới (C4 Context & Container), bảng sở hữu cơ sở dữ liệu (PostgreSQL/Prisma), sơ đồ thực thể liên kết ERD và ranh giới ACID chống race condition khi đặt trùng sân. |
| **Người 2** | Wireframes + Pass OpenAPI + examples | Bản vẽ Wireframe Web responsive, thiết kế component React, đặc tả 9 API Pass Marketplace theo chuẩn OpenAPI 3.0 kèm trọn bộ mock response mẫu và mã lỗi chuẩn HTTP. |
| **Người 3** | Socket contract + event catalog + ADR | Giao thức Socket.IO hai chiều, kiểm tra JWT xác thực kết nối, danh mục sự kiện (ChatSent, MemberJoined, MessageRead), hàng đợi chống trùng lặp tin nhắn và mô hình phòng thủ bảo mật kênh chat. |
| **Người 4** | ERD/schema v1 + role matrix + technology ADR | Thiết kế Schema MongoDB và PostgreSQL cho Identity/Commerce/Content, ma trận kiểm soát truy cập (Guards/RBAC), cơ chế đảm bảo toàn vẹn hàng tồn kho POS và phân tích chi phí công nghệ. |
| **Người 5** | AI API/tool spec + deployment + ADR | Đặc tả API Trợ lý ảo `/assistance` & `/recommendations`, cơ chế Tool Calling an toàn chỉ đọc, sơ đồ mạng Docker Compose phân luồng mạng và quy chuẩn CI/CD đo kiểm tự động. |

---

## 4. Tiêu chí Nghiệm thu Cột mốc G02 (Quality Gate G02)

- Cả nhóm đã hoàn thành review chéo (peer-review) toàn bộ các ranh giới dịch vụ, quyền sở hữu dữ liệu, đặc tả request/response và ngữ nghĩa socket/event.
- Toàn bộ 9 quyết định kiến trúc cốt lõi trong [adr/](adr/README.md) đã được chuyển sang trạng thái **Accepted**.
- Mọi hợp đồng giao tiếp (OpenAPI contracts, JSON Schema events) được lưu trữ tại [`contracts/`](../../contracts/README.md) và xác thực tính hợp lệ tự động qua CI.

---

## 5. Bàn giao sang Tuần 6 (Local Skeleton Execution)

Bộ tài liệu Tuần 5 chuyển giao đầu vào trực tiếp cho việc hiện thực hóa khung hệ thống ở Tuần 6:
- **Người 1**: Khởi tạo project NestJS cho `services/booking-core`, cấu hình Prisma migration và viết test kiểm tra hợp đồng API.
- **Người 2**: Khởi tạo project React/Vite cho `apps/web`, thiết lập TailwindCSS layout, router và mock client gọi API.
- **Người 3**: Khởi tạo Node.js skeleton cho `services/social-service` & `notification-service`, kết nối MongoDB và PoC xác thực Socket.IO.
- **Người 4**: Khởi tạo khung `services/identity-service`, `commerce-service`, `content-service` và giao diện quản trị `apps/admin`.
- **Người 5**: Khởi tạo khung FastAPI cho `services/ai-service`, thiết lập toàn bộ file `compose.yml`, reverse proxy gateway và CI pipeline GitHub Actions.

$\rightarrow$ Xem tiếp: [**Bộ Hồ sơ Thực thi Khung Hệ thống Tuần 6**](../week-6/README.md).
