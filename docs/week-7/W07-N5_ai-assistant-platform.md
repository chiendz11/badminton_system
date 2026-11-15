# W07-N5 — AI Assistant Q-Style & Kubernetes GitOps Operations

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W07-N5 |
| Tuần | 7 |
| Người phụ trách (DRI) | Người 5 — AI Assistant · MLOps · Platform |
| Người duyệt chéo (Peer Reviewer) | Người 1 — Tech Lead · Booking Core |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (100%)** |

---

## 1. Mục tiêu công việc

- Nâng cấp dịch vụ AI (`services/ai-service`) với giao diện trợ lý ảo thông minh Amazon Q Style.
- Chuẩn hóa bộ dữ liệu tri thức tĩnh (`knowledge.json`) giải đáp mọi thắc mắc về quy định đặt sân, chính sách hủy và chuyển nhượng vé.
- Quản trị, vận hành và đảm bảo độ ổn định của toàn bộ cụm Kubernetes local `badminton-local` theo chuẩn GitOps.
- Giám sát hàng rào CI/CD GitHub Actions bảo đảm 100% kiểm thử tự động đạt kết quả xanh.

---

## 2. Điểm kỹ thuật cốt lõi

### 2.1. Trợ lý AI Amazon Q Style (Side Drawer Widget)
- Thiết kế Drawer trượt mượt mà từ mép phải màn hình (`width: 380px`), kích hoạt bằng nút Trợ lý AI trên Header Web.
- Giao diện thân thiện: Hiển thị các câu hỏi gợi ý nhanh (Quick Prompts) như:
  - *"Quy định hủy sân thế nào?"*
  - *"Thời gian giữ chỗ bao lâu?"*
  - *"Cách thức pass sân cho người khác?"*
- Tích hợp phản hồi thời gian thực từ endpoint `/api/ai/chat` qua API Gateway.

### 2.2. Chuẩn hóa Bộ tri thức (Knowledge Base) & Bảo vệ Phân quyền Hủy sân
- **Bảo vệ và định tuyến từ chối thông minh trong Chatbot (`cancellation.py`)**:
  - Khi người dùng yêu cầu hủy qua chatbot, hệ thống thực hiện quy trình 2 bước với consent riêng.
  - Khi Booking Core trả về lỗi **HTTP 403 Forbidden** (do hệ thống khóa hoàn toàn việc hủy booking `CONFIRMED` cho mọi vai trò nhằm tránh phát sinh hoàn tiền phức tạp), Chatbot bắt lỗi và phản hồi hành động `cancellation_refused` kèm lời khuyên nghiệp vụ:
    > *"Booking đã xác nhận không thể tự hủy. Bạn vui lòng sử dụng tính năng Chợ Pass sân hoặc liên hệ quản lý trung tâm."*
  - Bổ sung ca kiểm thử tích hợp `test_core_403_cancellation_refused_advises_pass_marketplace` trong `tests/integration/test_assistance.py`.
- **Tệp tri thức `knowledge.json` (`cancel-booking` và `pass-booking-rules`)**:
  - Quy định giữ chỗ: 10 phút tự động hủy nếu chưa hoàn tất thanh toán (khách hàng có thể hủy sớm qua `DELETE /api/v1/reservations/:id`).
  - Quy định hủy sân: Slot đã thanh toán (`CONFIRMED`) không được hủy trực tiếp bởi bất kỳ vai trò nào để tránh bot spam và do hệ thống không hỗ trợ hoàn tiền.
  - Hướng dẫn chuyển nhượng: Đăng bán qua Chợ Pass Sân, tiền được giữ trong Escrow cho đến khi người mua nhận sân thành công.

### 2.3. Vận hành Cụm Kubernetes K3d GitOps Local
- Cụm `badminton-local` vận hành ổn định 16/16 Pods ở trạng thái **1/1 Running**:
  - `web` (2 replicas), `admin` (2 replicas), `api-gateway` (2 replicas)
  - `booking-core` (2 replicas), `content-service` (2 replicas), `ai-service` (2 replicas)
  - `identity-service` (1 replica)
  - Cơ sở hạ tầng: `postgres-0`, `mongo`, `redis`, `rabbitmq`
- Thiết lập **NetworkPolicy** bảo vệ phân vùng mạng:
  - Cho phép Ingress NodePort từ host (`172.24.0.1`) tới `web` (18082), `admin` (18083), `api-gateway` (18081).
  - Cho phép thông tuyến nội bộ giữa `api-gateway`, `identity-service` và `postgres`.
- Cấu hình DNS Kubernetes FQDN: Cập nhật template nginx của `web` và `admin` tự động phân giải qua CoreDNS `10.43.0.10`.

---

## 3. Tiêu chí nghiệm thu & Chỉ số chất lượng

- [x] **AI Chatbot:** Phản hồi chính xác 100% các câu hỏi về quy định sân bãi theo bộ dữ liệu vàng (Golden Evaluation).
- [x] **Kubernetes Health:** 100% Pods đạt Ready; 2 ứng dụng Argo CD (`badminton-local-apps` và `badminton-local-platform`) ở trạng thái Synced & Healthy.
- [x] **Hàng rào CI/CD:** 23/23 Checks trên GitHub Actions báo Xanh hoàn hảo (Lint, Typecheck, Unit, Contract, Integration Tests, Trivy 0 CVEs).
- [x] **Độ trễ hệ thống:** Thời gian xử lý yêu cầu qua Gateway dưới 25ms trong môi trường cụm local.

---

## 4. Kế hoạch Tuần 8 tiếp theo

- Phát triển thuật toán AI gợi ý định giá thông minh cho các bài đăng trên Chợ Pass Sân (dựa trên mức độ khan hiếm khung giờ và thời gian còn lại đến giờ thi đấu).
- Thiết lập bảng điều khiển Grafana giám sát tải CPU/RAM của các pods microservices.
