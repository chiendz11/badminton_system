# W04-N4 — RBAC draft, POS rules và admin use cases

| Thuộc tính | Giá trị |
| --- | --- |
| DRI theo kế hoạch | Người 4 — Identity · Commerce · Content |
| Peer reviewer của task | Người 3 |
| Deliverable gốc, ô H5 | RBAC draft + POS rules + admin use cases |
| Ưu tiên / giờ dự kiến | P0 / 8 giờ |
| Phụ thuộc | Workshop chung |
| Definition of Done gốc | Trách nhiệm user/center manager/admin rõ; POS rule được review. |
| Nguồn kế hoạch | Sheet “Kế hoạch 10 tuần”, A5:O5 |
| Đầu ra của tuần | Tài liệu phân tích nghiệp vụ |

Tài liệu trình bày kết quả phân tích trong tuần 4: phạm vi, quy tắc nghiệp vụ và tiêu chí nghiệm thu làm đầu vào cho thiết kế tuần 5.

## Actor và role/action matrix

Tên role chuẩn của hệ thống: `user`, `center_manager`, `super_admin`. Identity là nguồn cấp danh tính và role; quyền thao tác tài nguyên còn phụ thuộc ownership hoặc center assignment, không chỉ tên role.

| Hành động | Public | user | center_manager | super_admin |
| --- | --- | --- | --- | --- |
| Đọc center/news/rating công khai | Có | Có | Có | Có |
| Profile/phiên/booking của mình | Không | Own | Own | Theo policy; admin không mặc định đọc chat riêng |
| Onboarding đối tác & Ký HĐ B2B SaaS | Không | Không | Nhận bàn giao cơ sở | **Toàn quyền khi ký HĐ** |
| Thiết lập hồ sơ cơ sở (hotline, địa chỉ, ảnh, bio, tiện ích, số sân, bảng giá) | Không | Không | **Toàn quyền (sân được giao)** | Giám sát / hỗ trợ |
| Kích hoạt mở bán cơ sở sau setup (isActive: true) | Không | Không | **Chủ động kích hoạt** | Toàn quyền kiểm soát |
| Quản lý Hợp đồng Đối tác & Gia hạn SaaS | Không | Không | Xem hạn HĐ & liên hệ gia hạn | **Toàn quyền (Tạo/Gia hạn/Dừng)** |
| Giá/sân/booking trung tâm | Đọc công khai | Không ghi | Assigned center | Toàn hệ thống + audit |
| Nhập kho / POS / báo cáo | Không | Không | Assigned center | Toàn hệ thống + audit |
| Gán manager/role/khóa user (Ban user) | Không | Không | Không | Có, audit và kiểm soát self-escalation |
| Viết review | Không | Own + booking hợp lệ (đề xuất) | Own nếu đúng điều kiện | Moderate theo policy |
| Đề xuất Sự kiện, Giải đấu CLB cơ sở | Đọc published | Không | **Soạn thảo đề xuất (DRAFT)** | **Thẩm định & Duyệt xuất bản** |
| News draft/publish | Đọc published | Không | Theo quyền editor được cấp | Quản trị theo policy |
| Notification | Không | Own | Gửi cảnh báo khẩn cấp tại sân | Phát thông báo toàn sàn (Broadcast) |

## Identity business rules

- Identity gộp auth/user, giữ canonical userId. Profile không được tự sửa role, manager assignments hoặc trạng thái khóa.
- Đăng ký, xác minh, login, refresh, logout/revoke tạo thành hành trình quản lý tài khoản và phiên của Identity.
- OAuth dùng state/PKCE và identity mapping theo provider + subject. Không liên kết account chỉ vì email người dùng gửi lên.
- Hash password bằng cơ chế phù hợp; refresh token và client secret lưu dạng hash, không lưu giá trị thô.
- Center manager chỉ thao tác center được giao; lấy assignment từ nguồn tin cậy, tránh nhét danh sách center vô hạn vào token.
- Role trong MVP gồm ba nhóm đã nêu; quyền nhân viên quầy nếu mở rộng được mô hình hóa riêng, tránh cấp quyền center_manager chỉ để cho phép bán hàng.

## POS rules

| ID | Quy tắc | Lỗi phải xử lý |
| --- | --- | --- |
| POS-01 | Quantity bán là số nguyên dương theo đơn vị bán | 400 nếu âm/0/sai đơn vị |
| POS-02 | Quy đổi `totalAdded = quantityImport × unitImportQuantity` do server kiểm | Overflow hoặc thay đổi tỷ lệ đơn vị cần audit |
| POS-03 | Balance theo product + center không âm | 409 nếu không đủ tồn; khóa/conditional update tránh race |
| POS-04 | Sale/items/stock movements/invoice/outbox cùng một transaction | Không có hóa đơn thành công khi trừ tồn thất bại |
| POS-05 | Giá/chiết khấu snapshot từ server và role policy | Không tin totalAmount/unitPrice từ client |
| POS-06 | Cùng actor/route/idempotency key và payload chỉ một sale | Replay cùng saleId; khác payload 409 |
| POS-07 | Void/return là movement bù, không xóa lịch sử tài chính | Cần policy hoàn/đổi và người duyệt trước triển khai |

Commerce quản lý sale, inventory và stock movement trong cùng transaction boundary để kiểm tra tồn kho và ghi hóa đơn nguyên tử. Không dùng lời gọi HTTP giữa các bước trừ tồn và ghi nhận sale như một cách thay thế local transaction.

## Admin use cases và giao diện

| ID | Use case | Luồng/lỗi chính |
| --- | --- | --- |
| AD-01 | Giao quyền manager cho center | Admin chọn user/center; sai role/center không tồn tại bị chặn |
| AD-02 | Quản trị sản phẩm và nhập kho | Form/bảng sản phẩm; validate đơn vị, tiền và center scope |
| AD-03 | Bán hàng và xuất hóa đơn | Chọn sản phẩm, nhập quantity, preview server, confirm cùng key |
| AD-04 | Báo cáo tồn/sale | Bộ lọc trung tâm/thời gian; không lộ center khác |
| AD-05 | Duyệt/ẩn review và publish news | Audit lý do/người thực hiện; giữ lịch sử moderation |
| AD-06 | Tải ảnh center/product/profile | Storage kiểm MIME/size/owner; domain chỉ giữ fileId |
| AD-07 | Onboarding đối tác & Ký HĐ SaaS | Super Admin tạo vỏ trung tâm, gán `managerId`, chọn gói SaaS (3/6/12 tháng) ở trạng thái DRAFT (`isActive: false`) |
| AD-08 | Center Manager tự thiết lập cơ sở (Self-serve) | Manager tự hoàn thiện hotline, địa chỉ, ảnh, bio, tiện ích, số sân, bảng giá và kích hoạt mở bán (`isActive: true`) |
| AD-09 | Quản lý HĐ Đối tác & Thuê bao SaaS | Super Admin gia hạn hợp đồng; tạm dừng hoạt động trung tâm (`isActive: false`) khi đối tác nợ phí hoặc hết hạn |
| AD-10 | Đề xuất & Duyệt Sự kiện / Giải đấu CLB | Center Manager gửi hồ sơ đề xuất (DRAFT); Super Admin thẩm định và bấm duyệt đăng toàn sàn |
| AD-11 | Khóa tài khoản vi phạm (Ban user/bot) | Super Admin khóa/mở khóa tài khoản người dùng vi phạm chính sách hoặc bot spam |

Bộ use case xác định các màn hình quản trị, dữ liệu đầu vào và ngoại lệ cần hỗ trợ; đây là đầu vào cho wireframe, API contract và tổ chức feature ở tuần 5.

## Content và quy tắc dữ liệu

Rating dùng thang 1–5, comment plain text và centerId/userId chuẩn. Thiết kế đề xuất review gắn với user/booking sau sử dụng, kiểm eligibility phía server và lưu audit khi cập nhật. News phân biệt DRAFT/PUBLISHED/ARCHIVED, lưu timestamp ISO để sắp xếp và hiển thị nhất quán.

Các tham số như quyền editor/moderation, thuế/hóa đơn POS, return/refund, loyalty points, inactive/revoke và retention PII thuộc policy của domain owner. UI/API không tự đặt giá trị tài chính hoặc quyền vượt ngoài policy đó.

## Đầu ra tài liệu và bàn giao

- Role/action matrix, quy tắc Identity, 7 POS rules và 6 Admin use cases.
- Điều kiện quyền theo center/owner và mô hình dữ liệu Content ở mức nghiệp vụ.
- Đầu vào liên quan: [schema/RBAC tuần 5](../week-5/W05-N4_data-rbac.md).
