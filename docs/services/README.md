# Tài liệu Kỹ thuật Các Dịch vụ (Services Documentation)

Thư mục này tập trung toàn bộ tài liệu đặc tả kỹ thuật, hướng dẫn triển khai và kiến trúc chi tiết của các dịch vụ trong hệ sinh thái **Badminton Manager V2**.

---

## 1. Dịch vụ Nền tảng & Cốt lõi (Core & Gateway)

| Dịch vụ | Tài liệu chi tiết | Công nghệ | Mô tả & Trách nhiệm |
| :--- | :--- | :--- | :--- |
| **Booking Core** | [**booking-core.md**](booking-core.md) | NestJS, Prisma, PostgreSQL | Trái tim nghiệp vụ quản lý sân cầu lông: tìm kiếm sân trống, quản lý slot 60 phút, giữ chỗ tạm thời (hold 10 phút) và chốt đặt sân (commit booking) với bảo đảm ACID. |
| **API Gateway** | [**api-gateway.md**](api-gateway.md) | Node.js / Express Proxy | Cổng giao tiếp duy nhất đón nhận request từ Web/Admin, điều phối routing tới các microservices phía sau, phân giải JWT token và rate limiting. |
| **Legacy Web UI & Shell** | [**legacy-ui.md**](legacy-ui.md) | React, Vite, TailwindCSS | Hướng dẫn tích hợp và kế thừa giao diện từ repo gốc [Badminton_manager_microservices](https://github.com/chiendz11/Badminton_manager_microservices), kèm [hồ sơ nguồn gốc provenance](legacy-ui-provenance.json). |
| **API Contract Index** | [**api/README.md**](api/README.md) | OpenAPI 3.0, JSON Schema | Mục lục đối chiếu các bộ API contract của toàn bộ 9 microservices, sự kiện domain events và Socket.IO protocols. |

---

## 2. Phân hệ Trợ lý Thông minh (AI Service Subsystem)

Toàn bộ tài liệu chi tiết về dịch vụ Trợ lý AI thông minh (`services/ai-service`) được quy hoạch trong thư mục [**docs/services/ai/**](ai/README.md):

- [**AI Service Overview (ai/README.md)**](ai/README.md): Tổng quan kiến trúc FastAPI, LangGraph workflow, kết nối LLM (Groq / OpenAI-compatible / Fake offline provider) và bộ nhớ ngữ cảnh hội thoại.
- [**Constraint-Aware Recommendation (ai/UPGRADE.md)**](ai/UPGRADE.md): Thiết kế thuật toán đề xuất thông minh khi hết sân trống, chẩn đoán nguyên nhân và đàm phán nới lỏng điều kiện (đổi giờ, đổi ngày, đổi sân).
- [**AI Assistance Features (ai/FEATURES.md)**](ai/FEATURES.md): Danh mục các tính năng trợ lý: tra cứu lịch sử, hủy booking an toàn 2 bước, giải thích thống kê cá nhân và tra cứu FAQ nội bộ.
- [**Codebase Walkthrough (ai/CODE_WALKTHROUGH.md)**](ai/CODE_WALKTHROUGH.md): Phân tích chi tiết từng tầng mã nguồn (routers, services, tools, ranking algorithms, database models).
- [**Architecture Designs (ai/designs/)**](ai/designs/AI_SERVICE_UPGRADE_DESIGN_V1.md): Bản thiết kế nâng cấp kiến trúc AI Service phiên bản V1.

---

## 3. Kiến trúc Microservices Mở rộng (Domain Services)

Các dịch vụ thành phần mở rộng được phân rã theo Domain-Driven Design (DDD):
- `services/identity-service`: Quản lý tài khoản, xác thực JWT và phân quyền RBAC (User, Yard Owner, Admin).
- `services/social-service`: Quản lý bài đăng tìm bạn chơi, phòng chat thời gian thực WebSocket và kết nối xã hội.
- `services/commerce-service`: Quản lý giao dịch mua sắm phụ kiện, nước uống tại sân (POS) và thanh toán.
- `services/content-service`: Quản lý tin tức giải đấu, banner quảng cáo và thông tin hệ thống CMS.
- `services/notification-service`: Trung tâm gửi thông báo đẩy (In-app, Email, SMS).
- `services/storage-service`: Quản lý tải lên hình ảnh sân bãi, avatar người dùng và hóa đơn.

> Chi tiết System Contracts và kiến trúc liên dịch vụ xem tại [**docs/week-5/SYSTEM_CONTRACTS.md**](../week-5/SYSTEM_CONTRACTS.md) và [**docs/week-5/ARCHITECTURE.md**](../week-5/ARCHITECTURE.md).
