# BRD V2 — toàn hệ thống Badminton Manager

## Phạm vi tài liệu

Phiên bản tài liệu 0.2, cập nhật ngày **25/10/2026**. DRI: Người 1; phạm vi phối hợp: cả 5 thành viên. BRD tổng hợp đầu ra phân tích tuần 4: bài toán, actor, phạm vi MVP, yêu cầu chức năng, quy tắc nghiệp vụ và NFR.

Đây là tài liệu yêu cầu và thiết kế toàn sản phẩm. Các luồng trong BRD là căn cứ triển khai, không phải danh sách tính năng đã nghiệm thu chạy trên môi trường thực tế. Chi tiết từng phần nằm trong 5 artifact tuần 4; kiến trúc và contract tương ứng nằm ở [tuần 5](../week-5/README.md).

## Vấn đề, kết quả và actor

Hệ thống phục vụ tìm/đặt sân theo giờ, nhượng booking hợp lệ, trao đổi giữa người chơi, vận hành trung tâm và bán hàng tại quầy. Các vấn đề cần giải quyết gồm đặt trùng, sai giá, chuyển quyền không kiểm soát, tồn kho không nhất quán và thông báo bị lặp hoặc mất.

| Actor | Quyền/mục tiêu |
| --- | --- |
| Public | Xem trung tâm, lịch, giá và nội dung công khai. |
| user | Đặt sân, quản lý booking của mình, nhượng sân, chat, review và nhận thông báo. |
| center_manager | Vận hành trung tâm được giao, lịch cố định, nhập/bán hàng và báo cáo. |
| super_admin | Quản trị hệ thống, phân quyền và nội dung; quyền này không tự cho phép đọc chat riêng. |
| Provider payment/storage/LLM | Cung cấp tích hợp có xác minh; quyền nghiệp vụ vẫn do hệ thống kiểm soát. |
| Nhóm 5 người | Phân tích, thiết kế, phát triển, kiểm thử và review theo kế hoạch 10 tuần. |

Ma trận quyền chi tiết ở [W04-N4](W04-N4_identity-commerce-content.md). Với Storage, mô hình phối hợp trong thiết kế là Người 4 phụ trách API/quyền và Người 5 phụ trách platform/provider.

## Business outcomes và thứ tự ưu tiên

| Mã | Outcome | Điều kiện nghiệm thu thiết kế |
| --- | --- | --- |
| BO-01 | Quyền sử dụng sân chính xác | Không hai booking/hold hiệu lực chiếm cùng slot trong kịch bản concurrency. |
| BO-02 | Thanh toán và nhượng có thể đối soát | Webhook/retry không tạo kết quả trùng; transfer có audit và một kết quả commit. |
| BO-03 | Bán hàng không sai tồn | Không âm balance; sale/invoice không thành công một phần. |
| BO-04 | Giao tiếp có quyền và đáng tin | Không giả sender/join room trái phép; event duplicate không tạo thông báo mới. |
| BO-05 | Trợ lý tra cứu hữu ích | Ngày/giờ/thời lượng được diễn giải đúng; lịch/giá lấy từ Core, công cụ theo profile read-only. |
| BO-06 | Vận hành và phục hồi được | Request/event có correlation; quy trình backup/restore/replay và cách kiểm chứng được mô tả. |

P0 tập trung vào invariant và luồng nghiệp vụ chính. P1 bổ sung nội dung, friendship và tiện ích vận hành. P2 gồm cá nhân hóa, autoscaling và tối ưu nâng cao theo kết quả đo. Các mức này xác định thứ tự triển khai, không thay cho kết quả nghiệm thu từng chức năng.

## Functional requirements toàn hệ thống

| ID | Yêu cầu | Priority | Owner | Acceptance chính |
| --- | --- | --- | --- | --- |
| V2-F01 | Đăng ký, xác minh, login, refresh/logout | P0 | Identity/N4 | Rotation/revocation, password và token được bảo vệ. |
| V2-F02 | Profile, role, center assignments | P0 | Identity/N4 | Không tự nâng quyền; resource scope kiểm phía server. |
| V2-F03 | Center/court/pricing | P0 | Core/N1 | Role và center ownership; giá do server quản lý. |
| V2-F04 | Availability theo ngày/giờ | P0 | Core/N1 | Snapshot theo ngày, slot 60 phút, timezone Việt Nam. |
| V2-F05 | Giữ chỗ TTL chống trùng | P0 | Core/N1 | Replay cùng key; 409 khi conflict; hết hạn không chặn slot. |
| V2-F06 | Booking ngày/cố định, history/hủy | P0 | Core/N1 | Lịch cố định atomic; quyền owner/manager được kiểm. |
| V2-F07 | Checkout/payment attempt | P0 | Core/N1 | Amount từ server; không giữ DB transaction xuyên provider call. |
| V2-F08 | Verify webhook, dedupe, reconciliation | P0 | Core/N1 | Redirect trình duyệt không tự xác nhận paid. |
| V2-F09 | Pass post/filter/expiry/cancel | P0 | Core module/N2 | Booking owner và eligibility được server xác minh. |
| V2-F10 | Interest idempotent và danh sách có quyền | P0 | Core module/N2 | Unique post/user; danh sách người quan tâm theo quyền seller. |
| V2-F11 | Chuyển booking owner và audit | P0 | Core/N1+N2 | Owner/post/audit/outbox commit trong cùng transaction. |
| V2-F12 | Friendship/private conversation | P1 | Social/N3 | Membership được xác minh phía server. |
| V2-F13 | PASS_BOOKING chat không cần kết bạn | P0 | Social/N3 | Context/post/pair đúng; đóng bài chuyển quyền gửi theo lifecycle policy. |
| V2-F14 | Message/history/ack/read cursor | P0 | Social/N3 | Persist trước ack, client ID dedupe, read cursor hợp lệ. |
| V2-F15 | In-app notification/read/read-all | P0 | Notification/N3 | Unique event/recipient/channel; chỉ sửa trạng thái của caller. |
| V2-F16 | Product/unit/price và nhập kho | P0 | Commerce/N4 | Server kiểm đơn vị, conversion và balance/movement. |
| V2-F17 | POS sale/stock/invoice | P0 | Commerce/N4 | Local atomic; quantity/price hợp lệ; không âm tồn. |
| V2-F18 | Reports sale/stock theo center | P1 | Commerce/N4 | Bộ lọc và quyền không vượt center scope. |
| V2-F19 | Review/rating và moderation | P1 | Content/N4 | Kiểm eligibility, thang điểm và quyền sửa/ẩn. |
| V2-F20 | News draft/publish/archive | P1 | Content/N4 | Editor permission, lifecycle và audit. |
| V2-F21 | Upload/resolve/delete ảnh có quyền | P1 | Storage/N4+N5 | Kiểm MIME/size/owner, trạng thái metadata và cleanup provider. |
| V2-F22 | AI FAQ và tìm sân bằng ngôn ngữ tự nhiên | P0 | AI/N5 | Parse constraint, hỏi lại khi thiếu/mơ hồ, tra cứu nguồn đúng và giữ tool boundary. |
| V2-F23 | UI Web/Admin theo luồng nghiệp vụ | P0 | Frontend/N2 + domain owners | Hiển thị đúng quyền/trạng thái, loading/error/retry và chống gửi thao tác trùng. |
| V2-F24 | Hỗ trợ nhận sân/check-in | Theo phạm vi MVP | Core/N1 | Manager xác minh booking/owner/ngày; QR là phương án mở rộng của luồng nhận sân. |
| V2-F25 | Health/CI/security/telemetry/recovery | P0 | N5 điều phối, mọi owner | Health, kiểm thử, quan sát và phục hồi theo tiêu chí của từng môi trường. |

## Quy tắc nghiệp vụ dùng chung

1. Slot dài 60 phút; startMinute/durationMinutes theo bội 60, khoảng thời gian `[start,end)`. Giờ 18h30 phải hỏi lại, không tự làm tròn. Timestamp lưu UTC RFC3339, ngày nghiệp vụ theo Asia/Ho_Chi_Minh.
2. Tiền VND là số nguyên không âm; giá/discount/tổng tiền do server quyết định. Không tin totalAmount do client tự gửi.
3. Availability không giữ chỗ; DB allocation constraint là lớp bảo vệ cuối cùng. Hold có TTL và hết hiệu lực trước khi ảnh hưởng quyền sử dụng của booking khác.
4. Booking ownership và manager scope được kiểm tại service sở hữu dữ liệu, kể cả khi request đã qua Gateway. Không lấy sender/role/centerId client gửi làm chứng minh quyền.
5. Payment callback phải xác minh signature, order, amount, currency và dedupe. Paid sau khi hold hết hạn đi vào reconciliation/refund theo policy, không chèn lấn booking khác.
6. Pass không cấp slot mới; transfer giữ nguyên sân/thời gian, đổi owner nguyên tử và có audit. Interest không phải reservation.
7. Booking CONFIRMED và payment SUCCEEDED là hai trạng thái có trách nhiệm riêng; không suy thanh toán thành công chỉ từ booking status.
8. Event/socket có thể delivery lặp; dedupe và reconnect qua lịch sử bền vững. Thông báo lỗi không rollback transaction domain đã commit.
9. POS sale/stock/invoice cùng DB transaction; reversal là movement bù, không xóa chứng từ tài chính.
10. Profile AI trong thiết kế chỉ có công cụ đọc; kết quả tìm sân là snapshot, thao tác ghi do Booking UI/Core thực hiện theo quyền và xác nhận tương ứng.

## Business state và error journeys

| Entity | State / lifecycle trong thiết kế | Exception cần thể hiện |
| --- | --- | --- |
| Reservation | HELD → CONFIRMED/CANCELLED/EXPIRED | Quá hạn, conflict, release allocation. |
| Booking | CONFIRMED/CANCELLED; liên kết payment gate theo luồng thanh toán | Payment trễ, owner đã đổi, hủy quá giờ. |
| PaymentAttempt | PENDING → SUCCEEDED/FAILED/EXPIRED/REQUIRES_RECONCILIATION | Duplicate/out-of-order callback và timeout. |
| PassPost | ACTIVE → SOLD/CANCELLED/EXPIRED | Hai transfer cạnh tranh; bài hiển thị stale. |
| Conversation | PRIVATE hoặc PASS_BOOKING, writable/read-only theo lifecycle | Token hết hạn, mất close event, actor không phải member. |
| POS | Commit đầy đủ sale/stock/invoice hoặc rollback | Thiếu tồn, retry, lỗi trước/sau commit. |

Happy/error paths cụ thể và acceptance Given/When/Then nằm trong 5 artifact tuần 4; kiến trúc, schema và contract nằm trong tuần 5.

## NFR, dữ liệu và phụ thuộc

[W04-N5](W04-N5_ai-nfr.md) định nghĩa các thước đo và cách kiểm chứng. Invariant P0 yêu cầu 0 vi phạm trong bộ nghiệm thu được xác định; số liệu tải, chất lượng model và khả năng phục hồi phải gắn với dataset/environment và báo cáo đo tương ứng.

Dependencies ngoài gồm payment provider, OAuth, Cloudinary và LLM; dependencies nội bộ gồm PG/Mongo, RabbitMQ và Redis theo kiến trúc. Thiết kế yêu cầu timeout, identity, rate limit, correlation, secret delivery và phương án degrade phù hợp. Dữ liệu thật, PII, secret và model lớn nằm ngoài Git; quyền truy cập và retention theo owner/policy.

## Đầu ra và liên kết sang thiết kế tuần 5

BRD cung cấp danh sách actor, 25 yêu cầu chức năng, quy tắc nghiệp vụ, business state và NFR để xây dựng:

- [Kiến trúc, transaction boundary và ERD](../week-5/W05-N1_architecture.md).
- [Wireframe và Pass API](../week-5/W05-N2_pass-ui-api.md).
- [Socket và event contract](../week-5/W05-N3_social-events.md).
- [Schema và JWT/RBAC](../week-5/W05-N4_data-rbac.md).
- [AI/platform và kế hoạch deployment](../week-5/W05-N5_ai-platform.md).

[SYSTEM_CONTRACTS](../SYSTEM_CONTRACTS.md) tổng hợp giao tiếp giữa các thành phần. Đây là đầu vào cho triển khai theo từng tuần; review/ADR được lưu trong hồ sơ riêng của nhóm.
