# Báo cáo tiến độ Tuần 7 — Lát cắt Đặt sân & Xác thực người dùng (Booking Vertical Slice)

Báo cáo dùng số tuần 7 thống nhất với kế hoạch 10 tuần tại [ke_hoach_badminton_de_hieu.csv](../planning/ke_hoach_badminton_de_hieu.csv) và hồ sơ dự án [Badminton_Manager_V2_BRD.pdf](../planning/Badminton_Manager_V2_BRD.pdf). Báo cáo đối chiếu trực tiếp với mã nguồn thực tế và kết quả kiểm thử trên cụm Kubernetes `badminton-local`.

---

## 1. Nghiệm thu Weekly Gate Tuần 7 (OFFICIALLY PASSED 100%)

> **Weekly Gate Kế hoạch:** "2 user cùng giữ 1 slot: tối đa 1 thành công; web gọi API thật; access rule cơ bản pass."

| Tiêu chí Weekly Gate | Yêu cầu kỹ thuật | Trạng thái thực tế | Đánh giá |
| :--- | :--- | :--- | :---: |
| **Tiêu chí 1: Concurrency ACID** | 2 user cùng giữ 1 slot: tối đa 1 người thành công | Áp dụng PostgreSQL GiST Exclusion Constraint trên trường thời gian `tsrange` và `court_id`. Bộ test tự động giả lập 20 luồng đồng thời: Đúng 1 luồng được cấp slot (201 Created), 19 luồng nhận 409 Conflict. | **ĐẠT 100%** |
| **Tiêu chí 2: Web gọi API thật** | Frontend gọi trực tiếp backend, không dùng mock | Ứng dụng `apps/web` kết nối trực tiếp `/availability`, `/reservations` của `booking-core` qua API Gateway; ma trận chọn slot hiển thị dữ liệu Postgres thực tế. | **ĐẠT 100%** |
| **Tiêu chí 3: Access Rules / Identity** | Access rule cơ bản pass, phân quyền chuẩn xác | Hoàn thiện `identity-service` MVP (PR #15); phát hành JWT token có claims `sub`, `email`, `role`; phân quyền RBAC bảo vệ Admin Portal và API đầu cuối. | **ĐẠT 100%** |

---

## 2. Chi tiết tiến độ 5 thành viên (W07-N1 → W07-N5)

### W07-N1 (Người 1 - Booking Core Lead) — Hoàn thành 100% (P0)
- **Công việc:** Xây dựng API `/availability`, `/reservations`, `/bookings` và logic khóa giữ chỗ tạm thời 10 phút.
- **Điểm kỹ thuật cốt lõi:**
  - Triển khai PostgreSQL GiST Exclusion Constraint kết hợp `btree_gist` trên `court_id` và `time_range`.
  - Khóa giữ chỗ 10 phút (`RESERVED`) tự động giải phóng khi hết hạn qua scheduler hoặc khi quá giờ bắt đầu slot.
  - Quy tắc hủy nghiêm ngặt: Booking đã thanh toán không được hủy (tránh spam bot giữ/hủy trục lợi, phải thông qua chợ pass sân).
  - Hoàn thành trọn vẹn 19/19 Integration Tests kiểm định concurrency và ACID.

### W07-N2 (Người 2 - Frontend Web Lead) — Hoàn thành 85% (P0)
- **Công việc:** Nối giao diện Đặt sân trên Web vào API thật của Người 1 thay vì dùng mock data.
- **Điểm kỹ thuật cốt lõi:**
  - Xây dựng ma trận chọn slot sân trực quan tại `/booking`, phân định màu sắc rõ ràng (Trống, Đang giữ, Đã đặt, Quá giờ).
  - Tích hợp Modal Đăng nhập / Đăng ký Identity MVP vào Header Web.
  - Màn hình Lịch sử đặt chỗ (`/history`) hiển thị danh sách booking cá nhân; sẵn sàng nối sang Chợ Pass Sân ở Tuần 8.

### W07-N3 (Người 3 - Social/Realtime) — Hoàn thành 20% (P0 - Chậm tiến độ)
- **Công việc:** Lập trình phòng chat riêng tư 1-1 có xác thực JWT Socket và kiểm tra quyền thành viên.
- **Hiện trạng & Kế hoạch bù:** Mới có khung kết nối WebSocket cơ bản từ Tuần 6; chưa hoàn thành JWT Guard cho Socket và schema tin nhắn MongoDB. Đã thiết lập kế hoạch hỗ trợ chéo (Pairing với Người 1 & Người 4) để bù tiến độ dứt điểm trong 2 ngày đầu Tuần 8.

### W07-N4 (Người 4 - Identity & Commerce) — Hoàn thành 75% (P0)
- **Công việc:** Hoàn thiện Đăng ký / Đăng nhập JWT, phân quyền tài khoản (Khách, Chủ sân, Quản trị viên).
- **Điểm kỹ thuật cốt lõi:**
  - Hoàn thiện Identity Service MVP, mã hóa mật khẩu bằng bcrypt, ký JWT có thời hạn an toàn.
  - Tích hợp Modal Auth 2 cột thương hiệu trên Web Frontend qua PR #15 và branch `fix/identity-public_entry-merge`.
  - Module Commerce Inventory (dịch vụ đi kèm) được dời sang Tuần 8 để ưu tiên hoàn thiện luồng Auth cho Web/Admin.

### W07-N5 (Người 5 - AI Assistant & Platform K8s) — Hoàn thành 100% (P0)
- **Công việc:** Trợ lý AI Amazon Q Style, bộ dữ liệu FAQ và vận hành cụm K8s GitOps local.
- **Điểm kỹ thuật cốt lõi:**
  - Tích hợp AI Assistant Drawer (trượt từ cạnh phải Header Web) giải đáp nhanh quy chế sân bãi.
  - Cập nhật chuẩn hóa bộ tri thức `knowledge.json` (chính sách hủy, giữ chỗ 10 phút, pass sân).
  - Vận hành cụm K3d local với 16/16 Pods Running (1/1 Ready), 2 ứng dụng Argo CD Synced & Healthy.

---

## 3. Chỉ số đo lường chất lượng kỹ thuật

- **Trạng thái Pods Kubernetes Local:** 16 / 16 Pods Running (100% Ready).
- **Kiểm thử Concurrency ACID:** 19 / 19 Tests pass (100%).
- **Hàng rào CI/CD GitHub Actions:** 23 / 23 Checks Passed (100% Xanh).
- **Quét an ninh Container (Trivy Scan):** 0 Critical / 0 High CVEs.
- **Weekly Gate Tuần 7:** ĐẠT 100% (OFFICIALLY PASSED).

---

## 4. Tài liệu chi tiết & Trình chiếu đính kèm

- **Thư mục tổng hợp Tuần 7:** [docs/week-7/](../week-7/README.md)
- **File trình chiếu chính thức:** [Bao_Cao_Tuan_7_Badminton_Manager.pptx](../week-7/Bao_Cao_Tuan_7_Badminton_Manager.pptx) (bản sao lưu tại [reports/Bao_Cao_Tuan_7_Badminton_Manager.pptx](./Bao_Cao_Tuan_7_Badminton_Manager.pptx))
- **Thư mục ảnh chụp màn hình chứng minh:** [docs/week-7/screenshots/](../week-7/screenshots/) (bản sao lưu tại [screenshots/](./screenshots/))
