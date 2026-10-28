# Đối chiếu kiến trúc đích và skeleton

Tài liệu kiến trúc đính kèm mô tả **đích V2** và repo legacy, không phải toàn bộ nguyên trạng `badminton_system`. Baseline repo mới: `fbd3d4d538692b8ae383f561165c844fdf9d0bf2`, ngày đối chiếu 18/10/2026.

| Tên trong kiến trúc | Path repo mới | Trạng thái sau lần bổ sung này |
| --- | --- | --- |
| gateway/api_gateway | services/api-gateway | Đã có code; giữ nguyên |
| booking_core | services/booking-core | Đã có code booking; payment/pass chưa có; giữ nguyên |
| ai_service | services/ai-service | Đã có conversational planning/execution; giữ nguyên |
| identity_service | services/identity-service | Skeleton mới, gộp auth + user |
| commerce_service | services/commerce-service | Skeleton mới, gộp inventory + transaction |
| social_service | services/social-service | Skeleton mới |
| content_service | services/content-service | Skeleton mới, gộp rating + news |
| notification_service | services/notification-service | Skeleton mới |
| storage_service | services/storage-service | Skeleton mới |
| apps/web, apps/admin | apps/web, apps/admin | Đã có UI của lát cắt Core/AI; giữ nguyên |
| Hạ tầng và triển khai platform | Repo `badminton-infras` và `badminton-gitops` | Đã bỏ skeleton platform khỏi app; GitOps cài stack monitoring |
| Monitoring ứng dụng | monitoring/chart, monitoring/local | Nguồn rule/dashboard dùng chung Compose và Helm; GitOps pin chart từ app |
| Schema migration | Prisma/Alembic trong từng service | Giữ lịch sử version; đã bỏ skeleton data-migration ở root |
| model-artifacts/ai | model-artifacts/ai | Chỗ cho manifest/registry metadata, không chứa model weights |
| docs/{adr,api,architecture,runbooks} | Cùng tên | Tài liệu thiết kế và chỉ mục mới |

## Những phần chưa tạo code

Theo yêu cầu chỉ cây thư mục và tài liệu: không thêm package.json, controller, stub trả 200, Prisma schema giả, route UI, dependency, test chạy được, Dockerfile, Compose service hoặc CI component mới.

Không tạo module payment/pass vào Booking Core trong đợt này vì ba backend hiện có được loại khỏi phạm vi sửa. Chúng thuộc **Booking Core**, không có service Pass độc lập. W06-N1 vẫn cần bổ sung `src/modules/payment` và `src/modules/pass-marketplace/{pass-post,interest,transfer}` sau review contract. Quyền ownership/ACID của transfer nằm trong cùng DB Core.

Không thêm thư mục tính năng vào hai ứng dụng đang chạy; cây module frontend tương lai được ghi trong W05-N2 và giữ UI legacy làm nguồn tham khảo. Các thư mục đã có không bị nhân đôi chỉ để giống tên underscore trong bản đề xuất.

## Khoảng cách với gate tuần 6

Folder skeleton là đầu vào tổ chức code. Chưa đáp ứng gate Excel “docker compose up + health pass; PR test/lint/build xanh; FE có thể gọi stub API”. Để đạt gate đó, từng DRI phải triển khai runtime, auth, schema và check thật. Các `.gitkeep` trong `tests/` không phải unit/integration test.

## Điểm khác biệt phải quyết định

1. AI trong kiến trúc/Excel chỉ đọc; AI hiện có khả năng đặt sau xác nhận. ADR-008 còn Proposed; không tự tắt hoặc thay đổi AI runtime.
2. Core hiện confirm booking trực tiếp; mục tiêu V2 thanh toán trước khi xác nhận cần payment state/cutover riêng.
3. Gateway đang dùng HS256 + role lowercase; legacy JWT/role khác. Không thể chỉ gắn Identity vào mà bỏ qua migration token.
4. UI Web đặt ngày chưa gửi Idempotency-Key; thêm contract không sửa được lỗi này.
5. DB SQL/Mongo, RabbitMQ/Redis, Cloudinary là lựa chọn thiết kế cho phần chưa làm, không phải tất cả đã có container trong Compose hiện tại.
