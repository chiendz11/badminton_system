## Báo cáo tiến độ Tuần 6 — Hoàn thành Khung hệ thống (Foundation Skeleton Baseline)

Báo cáo dùng số tuần 6 thống nhất với kế hoạch Excel và bảng theo dõi 10 tuần. Nội dung được đối chiếu với mã nguồn thực tế và các Pull Request đã được kiểm định, hợp nhất trên nhánh `main`.

### 1. Những phần ĐÃ hoàn thành (100% Weekly Gate):

- **Hoàn thành toàn diện 5/5 task P0 của Tuần 6:**
  - **W06-N1 (Người 1 - Booking Core):** Khởi tạo `services/booking-core` (Prisma ORM + PostgreSQL), schema quan hệ đầy đủ (Center, Court, Pricing, Availability, Reservation, Booking), migration và seed script 3 cụm sân mẫu, API `/health` 200 OK.
  - **W06-N2 (Người 2 - Frontend):** Khởi tạo `apps/web` (React 18 + Vite + Tailwind CSS) và `apps/admin`, routing điều hướng trang chủ, danh sách sân, lịch trống, lịch sử đặt vé và chợ pass sân rỗng; không trắng trang, responsive desktop và mobile.
  - **W06-N3 (Người 3 - Social/Realtime):** Khởi tạo `services/social-service` (NestJS + MongoDB 8), Socket.IO server tiếp nhận kết nối WebSockets handshake thành công, schema phòng chat `PASS_BOOKING` và tin nhắn, khung RabbitMQ notification consumer.
  - **W06-N4 (Người 4 - Identity/Content):** Hoàn thiện trọn vẹn `services/content-service` (NestJS + Mongoose) quản lý Tin tức & Đánh giá sân, bộ test tự động Vitest (Unit, Contract, Integration), Dockerfile hardening loại bỏ npm dev tools đạt 0 lỗ hổng Trivy CVE scan. **Đã merge PR #3 và PR #5 vào main**.
  - **W06-N5 (Người 5 - AI/Platform):** Khởi tạo `services/ai-service` (FastAPI + Pydantic), nâng cấp constraint-aware recommendations và golden evaluation, thiết lập Hạ tầng kép Local Runtime (`compose.yml` 9 containers & Cụm k3d local Kubernetes GitOps Ingress 18081), pipeline CI/CD GitHub Actions. **Đã merge PR #6 và PR #7 vào main**.
- **Chạy được toàn bộ hệ thống trên môi trường Local:**
  - `docker compose up --build`: 9/9 containers đều ở trạng thái Healthy (Postgres, Mongo, Redis, RabbitMQ, Booking, Content, Social, AI, Gateway).
  - `make local-up` (cụm k3d local): 9/9 Pods Kubernetes ở trạng thái Running (1/1 Ready), Ingress điều phối lưu lượng qua cổng 18081.
- **Hàng rào kiểm thử tự động CI/CD đạt chuẩn 100%:**
  - 100% PR được bot GitHub Actions kiểm tra tự động và báo Xanh (22/22 checks thành công).
  - Không có lỗ hổng bảo mật nghiêm trọng (0 Critical / High CVEs).

### 2. Các điểm kỹ thuật nổi bật đã xử lý trong tuần:

1. **Bảo mật Container Trivy Scan:** Xóa bỏ toàn bộ thư mục npm/yarn toàn cục ở runtime stage của `content-service` Dockerfile, triệt tiêu các cảnh báo CVE từ `pacote` và `sigstore`.
2. **Tuân thủ hợp đồng CI Node:** Bổ sung đầy đủ 6 script kiểm định bắt buộc (`lint`, `typecheck`, `build`, `test:unit`, `test:contract`, `test:integration`) và viết test thực tế bằng Vitest.
3. **Khắc phục lỗi Mongoose Schema Metadata:** Bổ sung `@Prop({ type: ... })` tường minh trong `RatingSchema` và `NewsSchema` giúp Vitest suy luận kiểu chính xác.
4. **Đồng bộ GitOps đa kho lưu trữ:** Đồng bộ manifests K8s và catalog runtime giữa `badminton-system`, `badminton-gitops` và `badminton-infras`.

### 3. Đánh giá chất lượng & Nghiệm thu:

- **Weekly Gate Tuần 6:** **ĐẠT 100% TIÊU CHÍ (OFFICIALLY PASSED)**.
- Toàn bộ ranh giới nghiệp vụ, dữ liệu và hợp đồng API đã được chốt vững chắc.

### 4. Kế hoạch Tuần 7 tiếp theo (Booking Vertical Slice):

- **Người 1:** Lập trình API tìm sân trống `/availability` và logic khóa giữ chỗ tạm thời 10 phút (ACID) chống trùng slot trong `booking-core`.
- **Người 2:** Nối giao diện chọn ngày, chọn khung giờ, chọn sân trên Web vào API thật của Người 1 thay vì dùng mock data.
- **Người 3:** Lập trình logic phòng chat riêng tư 1-1 có xác thực JWT token và kiểm tra quyền thành viên trong phòng chat.
- **Người 4:** Hoàn thiện API đăng ký, đăng nhập JWT, phân quyền tài khoản (User, Owner, Admin) trong `identity-service`.
- **Người 5:** Xây dựng bộ dữ liệu câu hỏi thường gặp (FAQ Dataset) và lập trình module AI tra cứu câu trả lời chuẩn.

Tài liệu chi tiết kèm theo: [Thư mục báo cáo Tuần 6](../week-6/README.md), [Kế hoạch 10 tuần chi tiết](../Badminton_Manager_Ke_Hoach_10_Tuan_De_Hieu.xlsx), [Hồ sơ ADR](../adr/README.md).
