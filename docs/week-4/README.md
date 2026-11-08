# Tuần 4 — Khảo sát Nghiệp vụ & Xác định Phạm vi MVP

Thư mục này lưu trữ toàn bộ hồ sơ yêu cầu nghiệp vụ cốt lõi của giai đoạn **Tuần 4** thuộc dự án **Badminton Manager V2**, làm tiền đề phân tích cho thiết kế kiến trúc kỹ thuật ở Tuần 5. 

Tham chiếu:
- [Báo cáo môn học Tuần 4](../reports/WEEK_04.md)
- [Kế hoạch tổng thể 10 tuần](../planning/README.md)

---

## 1. Tài liệu Yêu cầu Nghiệp vụ Cốt lõi (Master BRD)

| Tài liệu | Vai trò & Mục đích | Trạng thái |
| :--- | :--- | :--- |
| [**BRD.md (Master Business Requirements Document)**](BRD.md) | **Tài liệu Yêu cầu Nghiệp vụ Tổng thể (Master BRD)**: Định nghĩa toàn bộ bối cảnh bài toán, 4 phân hệ chính (Đặt sân & Lịch thi đấu, Sang nhượng sân Pass Marketplace, Mạng xã hội & Chat realtime, AI Assistant), phân tích hiện trạng hệ thống cũ, ranh giới dữ liệu và tiêu chí nghiệm thu MVP. | **Chính thức (Primary)** |
| [**BRD_SYSTEM_V2.md**](BRD_SYSTEM_V2.md) | **Tài liệu Nghiệp vụ Kỹ thuật Bổ trợ V2**: Tổng hợp chi tiết các quy tắc nghiệp vụ, state machine và ma trận phân quyền từ 5 artifact cá nhân của đội ngũ phát triển. | **Bổ trợ (Technical Synthesis)** |

---

## 2. Artifact Phân tích Chi tiết của 5 Thành viên

Nguồn phân công: Theo workbook [Kế hoạch 10 tuần](../planning/Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx), dòng 2–6. Mỗi thành viên hoàn thành 1 artifact độc lập (8 giờ/người, tổng cộng 40 giờ):

| Mã việc | Thành viên phụ trách (DRI) | Reviewer | Tài liệu Artifact | Khối lượng |
| :--- | :--- | :--- | :--- | :--- |
| **W04-N1** | Người 1 — Tech Lead & Booking Core | Người 2 | [**Khung BRD, Thuật ngữ miền & Bối cảnh nghiệp vụ**](W04-N1_business-discovery.md) | 8h |
| **W04-N2** | Người 2 — Frontend Shell & Pass Marketplace | Người 1 | [**User Stories, Wireflow sàn nhượng sân & Tiêu chí nghiệm thu**](W04-N2_pass-ux.md) | 8h |
| **W04-N3** | Người 3 — Social Realtime & Notification | Người 4 | [**Quy tắc nghiệp vụ Chat & Kịch bản gửi thông báo**](W04-N3_social-notification.md) | 8h |
| **W04-N4** | Người 4 — Identity, Commerce & Content | Người 3 | [**Dự thảo RBAC, Quy tắc POS & Use Cases Admin**](W04-N4_identity-commerce-content.md) | 8h |
| **W04-N5** | Người 5 — AI Platform & System NFR | Người 1 | [**AI Use Cases, Chỉ số chất lượng & Yêu cầu phi chức năng (NFR)**](W04-N5_ai-nfr.md) | 8h |

---

## 3. Đối chiếu Đầu ra với Kế hoạch Đề ra

| Thành viên | Yêu cầu đầu ra theo Kế hoạch | Kết quả thể hiện trong bộ tài liệu |
| :--- | :--- | :--- |
| **Người 1** | BRD outline + glossary + business context | Xác lập bối cảnh hệ thống, 5 tác nhân chính (Khách hàng, Chủ sân, Thu ngân, Admin, Hệ thống), từ điển thuật ngữ chuẩn hóa, hành trình người dùng xuyên suốt và quy tắc phân ranh giới giao dịch (transaction boundary). |
| **Người 2** | User stories + wireflow + acceptance criteria | 8 bộ User Stories chi tiết, sơ đồ chuyển trạng thái tin đăng pass sân (DRAFT -> ACTIVE -> LOCKED -> TRANSFERRED), bảng phân biệt VALID/INVALID và bộ tiêu chuẩn Given/When/Then. |
| **Người 3** | Chat rules + notification scenarios | Phân loại phòng chat (1-1, phòng theo tin pass sân, phòng ghép đội), kiểm tra quyền thành viên (membership ACL), 8 kịch bản chat chi tiết, cơ chế chống trùng lặp tin nhắn và ma trận kích hoạt thông báo. |
| **Người 4** | RBAC draft + POS rules + admin use cases | Ma trận phân quyền 3 roles (User, Yard Owner, Admin), 7 quy tắc bán hàng tại quầy POS, 6 Use Cases quản trị sân và chính sách kiểm duyệt nội dung tin tức/bài viết. |
| **Người 5** | AI use cases + quality metrics + NFR | 6 Use Cases AI Trợ lý ảo, phạm vi chỉ đọc (read-only execution boundary), bộ chỉ số đo lường chất lượng đề xuất và phương pháp kiểm chứng các tiêu chuẩn NFR (tính sẵn sàng 99.5%, thời gian phản hồi p95 < 2s). |

---

## 4. Tiêu chí Nghiệm thu Cột mốc G01 (Quality Gate G01)

- Toàn bộ các tác nhân, trạng thái kinh doanh (business states), luồng xử lý thành công (happy path) và luồng bắt lỗi sự cố (error path) đã được đội ngũ rà soát và thống nhất.
- Luồng liên kết xuyên suốt giữa các nghiệp vụ: **Tìm sân & Giữ chỗ $\rightarrow$ Thanh toán $\rightarrow$ Sang nhượng vé $\rightarrow$ Chat trao đổi** được mô tả nhất quán, không xảy ra mâu thuẫn ranh giới dữ liệu.
- Bộ 5 artifact cá nhân và Master BRD là cơ sở vững chắc để bước vào giai đoạn thiết kế kiến trúc kỹ thuật ở Tuần 5.

---

## 5. Bàn giao sang Tuần 5 (Architecture & Contracts)

- Dùng **Master BRD** và từ điển thuật ngữ để phân rã microservices, xác định Database Per Service và ranh giới ACID.
- Chuyển đổi Use Cases và Wireflow thành giao diện chi tiết, API Contracts (OpenAPI 3.0), Domain Events Schema và Socket.IO protocols.
- Chuyển đổi tiêu chuẩn NFR thành phương án lựa chọn công nghệ, cấu hình giám sát Prometheus/Grafana và kế hoạch CI/CD.

$\rightarrow$ Xem tiếp: [**Bộ Hồ sơ Thiết kế Kỹ thuật Tuần 5**](../week-5/README.md).
