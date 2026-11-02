# Tuần 6 — Dựng khung hệ thống (Foundation & Skeleton Baseline)

Kế hoạch Excel, tên thư mục và báo cáo môn học đều dùng **tuần 6** cho giai đoạn hiện thực hóa bộ khung xương (Skeleton) của toàn bộ hệ thống trên môi trường local. Tham chiếu [báo cáo tuần 6](../reports/WEEK_06.md) và [kế hoạch tuần 4–13](../reports/README.md).

Nguồn phân công: workbook "Badminton_Manager_TechCorp_10_Week_Plan.xlsx", sheet **Kế hoạch 10 tuần**, các dòng 12–16. Phạm vi tuần này là dựng thành công toàn bộ khung ứng dụng Monorepo, 5 microservices, 2 web apps, cơ sở dữ liệu ban đầu, môi trường chạy thử nghiệm kép (Docker Compose + cụm k3d local) và pipeline CI/CD tự động.

## Artifact của từng thành viên

| ID | DRI / ownership | Peer reviewer task | Artifact | Ước lượng kế hoạch | Trạng thái thực tế |
| --- | --- | --- | --- | --- | :---: |
| W06-N1 | Người 1 — Tech Lead · Booking Core | Người 2 | [Booking Core skeleton, schema & migration](W06-N1_booking-core.md) | 9h | **HOÀN THÀNH (100%)** |
| W06-N2 | Người 2 — Pass Marketplace · Frontend | Người 1 | [React frontend shell & marketplace mocks](W06-N2_frontend-shell.md) | 8h | **HOÀN THÀNH (100%)** |
| W06-N3 | Người 3 — Social Realtime · Notification | Người 4 | [Social service skeleton, Mongo & Socket.IO PoC](W06-N3_social-realtime.md) | 8h | **HOÀN THÀNH (100%)** |
| W06-N4 | Người 4 — Identity · Commerce · Content | Người 3 | [Content service, Admin shell & Docker hardening](W06-N4_content-admin.md) | 9h | **HOÀN THÀNH (100%)** |
| W06-N5 | Người 5 — AI Service · MLOps · Platform | Người 1 | [AI service FastAPI, Dual Runtime & CI/CD Pipeline](W06-N5_ai-platform.md) | 10h | **HOÀN THÀNH (100%)** |

Tổng khối lượng thực thi: **44 giờ cho cả nhóm**.

## Đối chiếu đầu ra với kế hoạch

| Người | Đầu ra theo Excel | Nội dung thực tế đã hoàn thành & minh chứng PR |
| --- | --- | --- |
| Người 1 | Booking Core skeleton + schema | Thư mục `services/booking-core` hoạt động trên port 3000; schema Prisma quan hệ hoàn chỉnh (Center, Court, Pricing, Availability, Reservation, Booking); migration và seed data 3 cụm sân mẫu; endpoint `/health` trả về HTTP 200 OK. |
| Người 2 | React shell + Marketplace mocks | Ứng dụng `apps/web` (React 18 + Vite + Tailwind CSS) hoạt động trên port 3000; bố cục layout chuẩn; điều hướng React Router mượt mà: Trang chủ, Danh sách sân & Lịch trống, Lịch sử đặt vé, Chợ sang nhượng vé (Pass Market); không trắng trang, responsive desktop và mobile. |
| Người 3 | Social skeleton + Mongo + Socket PoC | Thư mục `services/social-service` kết nối cơ sở dữ liệu MongoDB 8; khởi tạo máy chủ Socket.IO; kiểm chứng kết nối WebSockets handshake thành công; khung Conversation/Message schemas gắn liền với mã bài Pass (`PASS_BOOKING`); khung Consumer nhận sự kiện từ RabbitMQ. |
| Người 4 | Content service + Admin shell | Hoàn thiện toàn diện `services/content-service` (NestJS + Mongoose) quản lý Tin tức & Đánh giá sân; bộ test Vitest đạt chuẩn (Unit/Contract/Integration); tối ưu Dockerfile loại bỏ npm dev tools (0 CVEs Trivy scan); khung `apps/admin` có bảo vệ phân quyền RBAC; **Đã merge PR #3 và PR #5 vào main**. |
| Người 5 | AI skeleton + Dual Runtime + CI/CD | Dịch vụ `services/ai-service` (FastAPI + Pydantic) có `/health` và module chat tư vấn sân; **Hạ tầng Kép Local**: `docker compose up` (9 container healthy) & cụm `k3d local` (Kubernetes GitOps Ingress 18081); Pipeline GitHub Actions tự động kiểm thử lint/test/security; **Đã merge PR #6 và PR #7 vào main**. |

## Tiêu chí nghiệm thu theo kế hoạch — G03 (WEEKLY GATE)

Tiêu chí nghiệm thu cốt lõi của Tuần 6:
1. **Khởi động thành công bằng cả 2 cách**: Chạy được bằng cả lệnh `docker compose up` HOẶC `make local-up` (cụm k3d local).
2. **Trạng thái dịch vụ Healthy**: 100% các services (`booking-core`, `content-service`, `social-service`, `ai-service`, `api-gateway`) và các cơ sở dữ liệu (`Postgres`, `Mongo`, `Redis`, `RabbitMQ`) đều ở trạng thái Sống (Healthy), không crash loop.
3. **Pipeline CI GitHub Actions Xanh 100%**: Mọi PR đều vượt qua bộ kiểm tra hợp đồng Node, Unit tests, Contract tests và quét bảo mật container Trivy (0 CVEs Critical/High).
4. **Hợp nhất mã nguồn sạch sẽ**: Đã hoàn thành merge PR #3 (`content-service`), PR #5 (`ci/cd tests & security`), PR #6 (`10-week plan spreadsheet`), PR #7 (`ai constraint & service contracts`) vào nhánh `main`.

👉 **KẾT QUẢ ĐÁNH GIÁ: ĐẠT 100% TIÊU CHÍ NGHIỆM THU GATE TUẦN 6 (OFFICIALLY PASSED)**.

## Bàn giao sang Tuần 7 (Booking Vertical Slice)

- **Người 1**: Lập trình API tìm sân trống `/availability` và logic khóa giữ chỗ tạm thời 10 phút (ACID) chống trùng slot trong `booking-core`.
- **Người 2**: Nối giao diện chọn ngày, chọn khung giờ, chọn sân trên Web vào API thật của Người 1 thay vì dùng mock data.
- **Người 3**: Lập trình logic phòng chat riêng tư 1-1 có xác thực JWT token và kiểm tra quyền thành viên trong phòng chat.
- **Người 4**: Hoàn thiện API đăng ký, đăng nhập JWT, phân quyền tài khoản (User, Owner, Admin) trong `identity-service`.
- **Người 5**: Xây dựng bộ dữ liệu câu hỏi thường gặp (FAQ) và lập trình module AI tra cứu câu trả lời chuẩn.
