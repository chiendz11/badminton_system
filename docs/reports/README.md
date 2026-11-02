# Báo cáo Tiến độ Môn học — Badminton Manager V2

Thư mục này lưu trữ các bản báo cáo tiến độ hàng tuần được chuẩn bị để thảo luận và đăng lên chuyên mục Discussions của môn học theo quy chuẩn đào tạo.

---

## 1. Quy ước Đánh số Tuần

Dự án áp dụng thống nhất **chuỗi số tuần từ 4 đến 13** trên tất cả tài liệu, file Excel kế hoạch và mã công việc (`W04-N1` $\rightarrow$ `W13-N5`).

| Tuần | Trọng tâm báo cáo môn học | Báo cáo chi tiết | Bộ Artifact kỹ thuật tương ứng |
| :---: | :--- | :--- | :--- |
| **Tuần 4** | Khảo sát bài toán, xác định phạm vi MVP & Master BRD | [**Báo cáo Tuần 4 (WEEK_04.md)**](WEEK_04.md) | [**Bộ Artifact Tuần 4**](../week-4/README.md) |
| **Tuần 5** | Thiết kế kiến trúc V2, ERD dữ liệu & System Contracts | [**Báo cáo Tuần 5 (WEEK_05.md)**](WEEK_05.md) | [**Bộ Artifact Tuần 5**](../week-5/README.md) |
| **Tuần 6** | Hiện thực hóa khung hệ thống (Skeleton) & Chạy Local | [**Báo cáo Tuần 6 (WEEK_06.md)**](WEEK_06.md) | [**Bộ Artifact Tuần 6**](../week-6/README.md) |
| **Tuần 7–13** | Lộ trình phát triển tính năng, tích hợp, staging & bàn giao | [**Kế hoạch 10 tuần**](../planning/PLAN_WEEK_04_13.md) | [**Hồ sơ Kế hoạch Tổng thể**](../planning/README.md) |

---

## 2. Quy trình Đăng Báo cáo Discussions Môn học

1. **Khởi tạo Thread Thảo luận**: Nhóm trưởng tạo một bài thảo luận (thread) trên GitHub Discussions theo định dạng tiêu đề: `<Tên_Nhóm>_Badminton_Manager`.
2. **Công bố Kế hoạch**: Đăng kế hoạch 10 tuần phân công chi tiết 50 tasks cho 5 thành viên (tham chiếu [PLAN_WEEK_04_13](../planning/PLAN_WEEK_04_13.md)).
3. **Cập nhật Tiến độ Định kỳ**: Vào mỗi sáng thứ Hai hàng tuần, phản hồi (reply) vào cùng thread với nội dung tóm tắt kết quả đạt được của tuần trước và kế hoạch tuần tiếp theo.
4. **Báo cáo Buổi học**: Đại diện nhóm trình bày báo cáo tuần trước giảng viên và lớp dựa trên nội dung đã đăng.

---

## 3. Tài liệu Tham chiếu & Đối chiếu

- [**Biên bản Bàn giao Tuần 4–5 (DELIVERY_W04_W05.md)**](DELIVERY_W04_W05.md): Biên bản đối chiếu kết quả bàn giao giữa giai đoạn phân tích nghiệp vụ và thiết kế kiến trúc.
- [**Master BRD**](../week-4/BRD.md) & [**BRD Tổng hợp V2**](../week-4/BRD_SYSTEM_V2.md): Hồ sơ yêu cầu nghiệp vụ chuẩn của hệ thống.
- [**Kiến trúc Chuẩn Hệ thống V2**](../week-5/ARCHITECTURE.md) & [**System Contracts**](../week-5/SYSTEM_CONTRACTS.md): Hồ sơ thiết kế kỹ thuật và hợp đồng giao tiếp giữa các services.
- [**Bộ Quyết định Kiến trúc (ADRs)**](../week-5/adr/README.md): 9 quyết định công nghệ và ranh giới hệ thống.
- [**Kiểm chứng Môi trường Local**](../devops/validation.md) & [**Quy trình CI/CD**](../devops/ci-cd.md): Kết quả kiểm tra sức khỏe và pipeline tự động.
- [**Hồ sơ Nguồn gốc Provenance**](../planning/source-provenance.json): Bảng băm SHA256 và truy xuất kế hoạch gốc.
