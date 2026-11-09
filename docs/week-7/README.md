# Tuần 7 — Lát cắt Đặt sân & Xác thực người dùng (Booking Vertical Slice)

Kế hoạch Excel, tên thư mục và báo cáo môn học đều dùng **tuần 7** cho giai đoạn hiện thực hóa lát cắt dọc quan trọng nhất của hệ thống: Đặt sân trực tiếp chống xung đột đồng thời (Concurrency ACID) và Hệ thống Định danh người dùng (Identity Authentication & RBAC). Tham chiếu [báo cáo tuần 7 tóm tắt](../reports/WEEK_07.md), [file trình chiếu PowerPoint](./Bao_Cao_Tuan_7_Badminton_Manager.pptx) và [kế hoạch tuần 4–13](../planning/README.md).

Nguồn phân công: workbook "Badminton_Manager_TechCorp_10_Week_Plan.xlsx" (và file kế hoạch [Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx](../planning/Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx)), sheet **Kế hoạch 10 tuần**, các dòng 17–21. Phạm vi tuần này là đưa dữ liệu thật lên giao diện Web, xử lý triệt để tranh chấp đặt slot sân bằng GiST Constraint, tích hợp đăng nhập Identity Service MVP và vận hành cụm Kubernetes local `badminton-local`.

---

## 1. Artifact của từng thành viên

| ID | DRI / ownership | Peer reviewer | Artifact | Ước lượng | Trạng thái thực tế |
| --- | --- | --- | --- | :---: | :---: |
| **W07-N1** | Người 1 — Tech Lead · Booking Core | Người 2 | [Booking Concurrency ACID & Hold Rules](W07-N1_booking-concurrency-acid.md) | 9h | **HOÀN THÀNH (100%)** |
| **W07-N2** | Người 2 — Pass Marketplace · Frontend | Người 1 | [Web Booking Integration & Auth Modal](W07-N2_web-booking-integration.md) | 9h | **HOÀN THÀNH (85%)** |
| **W07-N3** | Người 3 — Social Realtime · Notification | Người 4 | [Social 1-1 Chat Progress & Recovery Plan](W07-N3_social-chat-progress.md) | 9h | **CHẬM TIẾN ĐỘ (20%)** |
| **W07-N4** | Người 4 — Identity · Commerce · Content | Người 3 | [Identity MVP, Multi-role Seed & Auth RBAC](W07-N4_identity-auth-rbac.md) | 9h | **HOÀN THÀNH (75%)** |
| **W07-N5** | Người 5 — AI Assistant · MLOps · Platform | Người 1 | [AI Assistant Q-Style & K8s Cluster Operations](W07-N5_ai-assistant-platform.md) | 10h | **HOÀN THÀNH (100%)** |

Tổng khối lượng thực thi theo kế hoạch: **46 giờ cho cả nhóm**.

---

## 2. Đối chiếu đầu ra với kế hoạch

| Người | Đầu ra theo Kế hoạch Excel | Nội dung thực tế đã hoàn thành & minh chứng kiểm thử |
| --- | --- | --- |
| **Người 1** | API `/availability` + Hold rule 10p | Hoàn thiện API `/availability`, `/reservations`, `/bookings` trong `services/booking-core`. Áp dụng **PostgreSQL GiST Exclusion Constraint** chống race condition tuyệt đối. Khóa giữ chỗ 10 phút tự động hủy; quy tắc không cho hủy slot đã thanh toán (chống bot spam). **19/19 Concurrency Tests Pass**. |
| **Người 2** | Nối Web vào API Booking thật | Ứng dụng `apps/web` hiển thị ma trận chọn slot sân trực quan 4 sân × 19 khung giờ (từ 05:00 đến 23:00) tại `/booking?centerId=...`. Gọi GraphQL lấy thông tin cụm sân và REST API lấy trạng thái slot từ backend thật. Tích hợp Auth Modal đăng nhập. |
| **Người 3** | Logic phòng chat 1-1 + Socket auth | Thiết lập khung kết nối WebSocket Socket.IO và schema phòng chat `PASS_BOOKING`. Chưa hoàn thành JWT Socket Guard và lưu trữ tin nhắn MongoDB. **Đã lập kế hoạch bù tiến độ P0 trong 2 ngày đầu Tuần 8**. |
| **Người 4** | Đăng ký, Đăng nhập, Phân quyền JWT | Hoàn thiện `services/identity/` MVP: cấp phát JWT token chuẩn bảo mật (claims `sub`, `email`, `role`). Tích hợp form đăng nhập modal 2 cột trên Web & Admin. Seed dữ liệu đa vai trò (`customer`, `admin`, `manager`). **Đã merge PR #15 và PR #17 vào main**. |
| **Người 5** | FAQ Dataset + Module AI gợi ý | Nâng cấp `services/ai-service` với Amazon Q-Style Assistant Drawer trượt từ mép phải màn hình. Bộ tri thức `knowledge.json` chuẩn hóa quy định đặt/hủy sân. Vận hành cụm **k3d local** với 16/16 Pods Running (100% Ready) và pipeline CI/CD GitHub Actions đạt **23/23 Checks Green**. |

---

## 3. Tiêu chí nghiệm thu Weekly Gate — G04 (OFFICIALLY PASSED 100%)

> **Tiêu chí Weekly Gate Tuần 7:** *"2 user cùng giữ 1 slot: tối đa 1 thành công; web gọi API thật; access rule cơ bản pass."*

1. **Tiêu chí 1: Concurrency ACID (Đạt 100%)**
   - Thử nghiệm 20 luồng gửi request giữ cùng 1 slot sân tại cùng 1 mili-giây: **Đúng 1 luồng thành công (HTTP 201 Created)**, 19 luồng còn lại bị từ chối ngay lập tức tại tầng DB (HTTP 409 Conflict).
2. **Tiêu chí 2: Web gọi API thật (Đạt 100%)**
   - Web Frontend kết nối trực tiếp API Gateway qua cổng `18081` và reverse proxy nginx nội bộ cụm K8s; không sử dụng bất kỳ mock data tĩnh nào.
3. **Tiêu chí 3: Access Rules / Identity (Đạt 100%)**
   - Đăng nhập thành công trả về `accessToken` JWT và thông tin hồ sơ; bảo vệ phân quyền chặt chẽ giữa khách hàng thông thường (`user`) và quản trị viên (`super_admin`).

👉 **KẾT QUẢ ĐÁNH GIÁ CHUNG: ĐẠT 100% TIÊU CHÍ NGHIỆM THU GATE TUẦN 7 (OFFICIALLY PASSED)**.

---

## 4. Tài liệu trình chiếu & Hình ảnh minh chứng

### File trình chiếu chính thức
- 📊 **PowerPoint Presentation:** [Bao_Cao_Tuan_7_Badminton_Manager.pptx](./Bao_Cao_Tuan_7_Badminton_Manager.pptx)
- 📝 **Kịch bản Slide chi tiết:** [scripts/generate_pptx_w7.py](../../scripts/generate_pptx_w7.py)

### Thư viện ảnh chụp màn hình kiểm chứng ([screenshots/](./screenshots/))

| STT | Ảnh minh chứng | Mô tả kỹ thuật |
| :---: | :--- | :--- |
| 1 | [01_web_homepage.png](./screenshots/01_web_homepage.png) | Giao diện Trang chủ Web (`http://127.0.0.1:18082`) với nhận diện thương hiệu, banner và thanh điều hướng |
| 2 | [02_web_login_modal.png](./screenshots/02_web_login_modal.png) | Cửa sổ Đăng nhập Identity MVP 2 cột chuẩn thương hiệu, tích hợp API Gateway `/api/auth/login` |
| 3 | [03_web_ai_drawer.png](./screenshots/03_web_ai_drawer.png) | Trợ lý AI Amazon Q Style dạng Drawer trượt từ mép phải, tư vấn quy chế sân và chính sách giữ chỗ |
| 4 | [04_web_booking_grid.png](./screenshots/04_web_booking_grid.png) | Ma trận chọn slot đặt sân 4 sân × 19 khung giờ (05:00 - 23:00) hiển thị dữ liệu Postgres thực tế |
| 5 | [05_admin_portal.png](./screenshots/05_admin_portal.png) | Cổng Quản trị Admin Portal (`http://127.0.0.1:18083`) phục vụ quản lý sân và cấu hình giá |
| 6 | [06_k3d_cluster_cli.png](./screenshots/06_k3d_cluster_cli.png) | Trạng thái cụm K3d local: 16/16 Pods Running (1/1 Ready), Ingress điều phối NodePort ổn định |
| 7 | [07_booking_acid_tests.png](./screenshots/07_booking_acid_tests.png) | 19/19 Vitest Concurrency Tests đạt 100% Pass, chứng minh Exclusion Constraint bảo vệ toàn vẹn slot |
| 8 | [08_ci_cd_23_checks_green.png](./screenshots/08_ci_cd_23_checks_green.png) | Hàng rào CI/CD GitHub Actions: 23/23 Checks hoàn tất thành công, không có lỗ hổng bảo mật |

---

## 5. Tài khoản thử nghiệm đã Seed sẵn trên Cụm K3d

Hệ sinh thái Kubernetes local đã được nạp sẵn các tài khoản demo chuẩn với mật khẩu chung là **`Password123!`**:

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Cổng giao diện đề xuất | Ghi chú quyền hạn |
| :--- | :--- | :--- | :--- | :--- |
| **Khách hàng (Customer)** | `customer@badminton.local` | `Password123!` | `http://127.0.0.1:18082` (Web) | Xem sân, chọn slot đặt sân, chat trợ lý AI |
| **Quản trị viên (Super Admin)** | `admin@badminton.local` | `Password123!` | `http://127.0.0.1:18083` (Admin) | Quản trị toàn bộ cụm sân, tài khoản, cấu hình giá |
| **Quản lý sân (Center Manager)** | `manager@badminton.local` | `Password123!` | `http://127.0.0.1:18083` (Admin) | Quản lý khung giờ và giá của cơ sở phụ trách |
| **Khách hàng Legacy** | `dung@example.com` | `Password123!` | `http://127.0.0.1:18082` (Web) | Tài khoản tương thích từ hệ thống cũ |

---

## 6. Bàn giao sang Tuần 8 (Chợ Pass Sân & Realtime Chat)

1. **Người 1 (Booking Core Lead):** Hiện thực hóa state machine `PASS_PENDING` → `PASS_CLAIMED` và API escrow tiền chuyển nhượng vé.
2. **Người 2 (Frontend Web Lead):** Xây dựng sàn giao dịch Chợ Pass Sân (`/pass-market`) và trang chi tiết bài đăng pass.
3. **Người 3 (Social Lead):** Bù tiến độ phòng chat 1-1: hoàn thiện Socket JWT Guard, kết nối MongoDB lưu trữ lịch sử tin nhắn đàm phán giữa người pass và người mua.
4. **Người 4 (Identity & Commerce Lead):** Hoàn thiện dịch vụ bổ trợ Commerce (thuê vợt, cầu, nước giải khát) và quản lý hóa đơn.
5. **Người 5 (AI & DevOps Lead):** Nâng cấp công cụ AI gợi ý định giá bài pass sân hợp lý và tối ưu tài nguyên cụm K8s.
