# W06-N4 — Content Service, Admin Shell & Docker Hardening

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W06-N4 |
| Tuần | 6 |
| Người phụ trách (DRI) | Người 4 — Identity · Commerce · Content |
| Người duyệt chéo (Peer Reviewer) | Người 3 — Social Realtime · Notification |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (100%)** |

## 1. Mục tiêu công việc

Hiện thực hóa toàn diện dịch vụ quản lý nội dung `services/content-service` và trang quản trị `apps/admin`:
- Xây dựng các API quản lý Đánh giá sân (Ratings) và Tin tức (News) trên NestJS + Mongoose.
- Viết bộ kiểm thử tự động đạt chuẩn CI Node Contract (Unit tests, Contract tests, Integration tests).
- Đóng gói Dockerfile bảo mật loại bỏ hoàn toàn các lỗ hổng CVE từ base image.
- Tích hợp manifests Kubernetes và cập nhật catalog runtime đa repo.

## 2. Kết quả bàn giao cụ thể

1. **Thư mục dịch vụ:** `services/content-service` hoạt động trên port 3001.
2. **Lược đồ dữ liệu Mongoose:**
   - `RatingSchema`: Quản lý đánh giá sao (1-5 sao), bình luận, `centerId`, `userId`, `bookingId`. Bổ sung `@Prop({ type: ... })` tường minh để tương thích hoàn toàn với Vitest và Mongoose 8.
   - `NewsSchema`: Quản lý bài viết tin tức, tiêu đề, tóm tắt, nội dung, ảnh thumbnail, trạng thái duyệt (`DRAFT`, `PUBLISHED`).
3. **Bộ test tự động Vitest hoàn chỉnh:**
   - `test/unit/auth.spec.ts`: Kiểm tra hàm `verifyActor` và bảo vệ quyền người dùng.
   - `test/unit/ratings.spec.ts`: Kiểm tra xác thực `ObjectId` và DTO đánh giá.
   - `test/contract/content-contract.spec.ts`: Kiểm chuẩn cấu trúc DTO theo hợp đồng.
   - `test/integration/app-module.spec.ts`: Kiểm tra metadata và khởi tạo module NestJS.
4. **Dockerfile Hardening (Bảo mật tối đa):**
   - Loại bỏ hoàn toàn npm/yarn dev tools thừa trong container runtime (`rm -rf /usr/local/lib/node_modules...`), giải quyết triệt để các cảnh báo CVE từ `pacote`, `sigstore`.
   - Quét Trivy Container Security Scan đạt **0 lỗ hổng CRITICAL / HIGH**.
5. **Hợp nhất mã nguồn:**
   - **badminton-system:** Đã merge PR #3 (`feat/content-service`) và PR #5 (`ci/cd tests & security`).
   - **badminton-gitops:** Đã merge PR #2 (thêm Mongo deployment, Service, Kustomization cho content-service).
   - **badminton-infras:** Đã merge PR #2 (cập nhật catalog runtime content-service sang implemented).

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [x] Quét bảo mật Trivy Docker Image đạt 0 lỗ hổng nghiêm trọng (Zero CVEs).
- [x] 100% bộ test Unit, Contract và Integration chạy pass trên GitHub Actions.
- [x] Cụm k3d local và Docker Compose đều khởi động `content-service` và `mongo` ở trạng thái Healthy.
- [x] Cổng API Gateway 8081 định tuyến mượt mà vào Content Service qua endpoint `/api/ratings` và `/api/news`.

## 4. Kế hoạch Tuần 7 tiếp theo

- Thực hiện task **W07-N4**: Hoàn thiện API đăng ký, đăng nhập JWT, phân quyền tài khoản (User, Owner, Admin) trong `identity-service` và gắn bộ bảo vệ Guards vào hệ thống.
