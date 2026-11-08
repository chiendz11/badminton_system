# W06-N5 — AI Service FastAPI, Dual Runtime & CI/CD Pipeline

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W06-N5 |
| Tuần | 6 |
| Người phụ trách (DRI) | Người 5 — AI Service · MLOps · Platform |
| Người duyệt chéo (Peer Reviewer) | Người 1 — Tech Lead · Booking Core |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (100%)** |

## 1. Mục tiêu công việc

Xây dựng bộ khung dịch vụ Trợ lý AI và thiết lập toàn bộ hạ tầng thực thi thử nghiệm kép (Dual Runtime) kèm hệ thống CI/CD tự động:
- Khởi tạo dịch vụ `services/ai-service` bằng FastAPI (Python 3.12) và Pydantic.
- Nâng cấp khả năng bóc tách ràng buộc (constraint-aware recommendations) và golden evaluation.
- Thiết lập môi trường chạy thử nghiệm kép: Docker Compose (dành cho dev hàng ngày) và Cụm k3d local (chuẩn Kubernetes mô phỏng Staging).
- Tự động hóa kiểm thử mã nguồn và quét lỗ hổng bảo mật qua GitHub Actions CI/CD.

## 2. Kết quả bàn giao cụ thể

1. **Dịch vụ Trợ lý AI (`services/ai-service`):**
   - Chạy độc lập trên port 8000, cung cấp endpoint `/health` và `/health/ready`.
   - Cấu trúc module rõ ràng: `recommendation` (bóc tách điều kiện ngày, giờ, giá, địa điểm), `tools` (gọi Booking Core read-only), `workflow` (quản lý trạng thái hội thoại).
   - Bộ kiểm thử tự động (Unit, Contract, Integration, Golden evaluation) đạt chuẩn chất lượng.
2. **Hạ tầng Kép Local Runtime (Dual Runtime):**
   - **Docker Compose (`compose.yml`):** Chạy toàn bộ 9 container (PostgreSQL, Mongo, Redis, RabbitMQ, Booking Core, Content Service, Social Service, AI Service, API Gateway) sẵn sàng với 1 lệnh `docker compose up`.
   - **Cụm k3d Local (Kubernetes GitOps):** Dựng cụm Kubernetes local bằng k3d, cấu hình Ingress cổng 18081, tích hợp Argo CD đồng bộ tự động với `badminton-gitops`. Đây là môi trường Local Staging giúp kiểm thử toàn diện mà không tốn chi phí Cloud AWS.
3. **Pipeline CI/CD Tự Động (GitHub Actions):**
   - `.github/workflows/ci.yml`: Tự động kích hoạt khi có Pull Request, kiểm tra Lint, Typecheck, Unit test, Contract validation và Docker security scan.
   - `.github/workflows/publish-and-deploy.yml`: Đóng gói Docker images, đẩy lên GitHub Container Registry (GHCR) và tự động cập nhật image tag vào `badminton-gitops`.
4. **Hợp nhất mã nguồn:**
   - Đã merge PR #6 (`10-week execution plan spreadsheets`) và PR #7 (`ai constraint recommendations & contracts`) vào nhánh `main`.

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [x] Gõ 1 lệnh là toàn bộ hệ thống khởi động lên được, tất cả container/pod đều ở trạng thái Healthy.
- [x] Bot GitHub Actions kiểm tra tự động 100% PR báo Xanh (22/22 checks thành công).
- [x] AI Service giữ vững ranh giới read-only: chỉ tra cứu, không tự ý sửa đổi cơ sở dữ liệu.

## 4. Kế hoạch Tuần 7 tiếp theo

- Thực hiện task **W07-N5**: Xây dựng bộ dữ liệu câu hỏi thường gặp (FAQ Dataset) và lập trình module AI tra cứu câu trả lời chuẩn xác về luật đặt sân, giá tiền và quy định hoàn hủy vé.
