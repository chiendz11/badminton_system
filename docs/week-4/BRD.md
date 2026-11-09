# BRD — Hệ thống badminton_system

## 1. Thông tin và cách sử dụng tài liệu

| Thuộc tính | Nội dung |
| --- | --- |
| Loại tài liệu | Business Requirements Document — Tài liệu yêu cầu nghiệp vụ |
| Phiên bản | 2.0 (Chuẩn hóa mô hình Platform 3 Actor, SaaS Subscription & Vận hành hợp đồng B2B) |
| Ngày lập | 18/10/2026 (Cập nhật lớn: 09/11/2026), múi giờ Việt Nam |
| Trạng thái | Dự thảo chuẩn hóa kiến trúc 3 Actor và vận hành nền tảng B2B SaaS |
| Hệ thống | badminton_system |
| Phạm vi phiên bản | Booking Core, AI service, Content/Rating/News, Identity/RBAC; Web khách hàng và Cổng quản trị Admin dùng chung (Single Admin Portal) |
| Mốc code đối chiếu | main tại commit fbd3d4d538692b8ae383f561165c844fdf9d0bf2 |
| Người quyết định nghiệp vụ | Chủ hệ thống/đại diện vận hành sân; cần chỉ định người phê duyệt cụ thể |
| Nhóm thực hiện | Nhóm phát triển 5 người; phân công cá nhân thực hiện ngoài tài liệu này |

Tài liệu xác định hệ thống giải quyết việc gì, phục vụ ai, quy tắc nào phải được giữ và điều kiện nào dùng để nghiệm thu. Chi tiết endpoint, cấu trúc database và công nghệ nằm trong các tài liệu kỹ thuật được dẫn ở mục 16.

**Yêu cầu nghiệp vụ và trạng thái triển khai là hai thông tin riêng.** Các nhãn sử dụng:

- **Có:** đã tìm thấy xử lý tương ứng trong code tại mốc đối chiếu; vẫn cần nghiệm thu nghiệp vụ.
- **Một phần:** đã có một phần xử lý hoặc còn khác biệt giữa backend và giao diện.
- **Cần chốt:** chưa có quyết định nghiệp vụ hoặc chỉ tiêu được chủ hệ thống phê duyệt.
- **Ngoài phạm vi:** không phải chức năng phải bàn giao trong phiên bản này.

Các mô tả vấn đề kinh doanh là giả định của bài toán cần được xác nhận với người vận hành; chưa có số liệu khảo sát, lưu lượng thực tế, ngân sách hoặc cam kết SLA. Tài liệu không tự đặt ra doanh thu, số lượng khách hàng hay thời hạn triển khai.

## 2. Bối cảnh và vấn đề nghiệp vụ

Hệ thống phục vụ việc tìm và đặt sân cầu lông theo trung tâm, sân cụ thể, ngày và giờ. Hai cách thao tác chính là chọn trực tiếp trên bảng lịch và trao đổi với trợ lý AI bằng tiếng Việt.

Những vấn đề cần giải quyết:

| Mã | Vấn đề | Hệ quả cần tránh |
| --- | --- | --- |
| PB-01 | Nhiều người cùng chọn một khung giờ; trạng thái hiển thị có thể thay đổi trước lúc xác nhận | Hai booking cùng chiếm một sân trong cùng khoảng thời gian |
| PB-02 | Người dùng cần kiểm tra nhiều sân, khung giờ, thời lượng và mức giá | Mất thời gian tìm phương án, dễ chọn sai ngày/giờ hoặc hiểu sai tổng giá |
| PB-03 | Nhóm chơi thường xuyên cần đặt lịch lặp lại qua nhiều ngày | Nhập lặp thủ công, bỏ sót ngày hoặc tạo được một phần lịch dù có ngày bị trùng |
| PB-04 | Yêu cầu trong hội thoại thường thiếu thông tin hoặc thay đổi qua nhiều lượt | AI quên điều kiện cũ, tự suy đoán hoặc đặt phương án chưa được người dùng đồng ý |
| PB-05 | Quản lý cần theo dõi lịch và thay đổi cấu hình sân trong phạm vi được giao | Xem/sửa dữ liệu của trung tâm khác, mất lịch sử hoặc phá vỡ booking đã xác nhận |
| PB-06 | Khi có lỗi, khó biết thao tác đã ghi nhận hay chưa | Gửi lại tạo trùng, báo thành công sai, không truy được nguyên nhân sự cố |

Việc giữ các màn hình booking gốc giúp tiếp tục sử dụng bố cục, bảng giờ và form quen thuộc trong quá trình chuyển nghiệp vụ sang Booking Core mới. Đây là yêu cầu kế thừa giao diện, không bao gồm giữ mọi màn hình của repo nguồn.

## 3. Mục tiêu và cách đo thành công

| Mã mục tiêu | Kết quả nghiệp vụ mong muốn | Cách kiểm chứng |
| --- | --- | --- |
| OBJ-01 | Ghi nhận booking đúng sân/ngày/giờ, không chiếm trùng slot | Nghiệm thu tranh chấp đồng thời; đối chiếu booking và phân bổ slot |
| OBJ-02 | Khách tự tìm, đặt, xem lịch và hủy giữ chỗ tạm thời; khóa hủy booking confirmed cho mọi vai trò (không hỗ trợ hoàn tiền) | Hoàn thành các kịch bản Web, kiểm tra quyền sở hữu và phân quyền RBAC |
| OBJ-03 | Quản lý lập và vận hành lịch sân, gồm lịch cố định | Kiểm tra chuỗi nhiều ngày và phạm vi trung tâm được giao |
| OBJ-04 | Trợ lý AI giữ ngữ cảnh và chỉ đặt khi được xác nhận cuối | Nghiệm thu hội thoại nhiều lượt, thay đổi điều kiện và xác nhận |
| OBJ-05 | Có thể điều tra lỗi và phục hồi yêu cầu chưa rõ kết quả | Theo dõi mã yêu cầu, kiểm tra retry, trạng thái booking và dữ liệu lưu |

Các chỉ số dùng khi chạy thử:

| Chỉ số | Cách hiểu | Mức mục tiêu |
| --- | --- | --- |
| Booking chiếm trùng cùng slot | Hai booking/giữ chỗ còn hiệu lực cùng chiếm một sân và khoảng giờ | 0 trong các ca nghiệm thu bắt buộc; đây là ràng buộc nghiệp vụ |
| Đặt sân khi chưa có xác nhận cuối của người dùng | AI tạo booking confirmed mà thiếu quyền xác nhận hợp lệ | 0 trong các ca nghiệm thu bắt buộc |
| Tỷ lệ hoàn tất đặt sân | Số hành trình đặt thành công / số hành trình hợp lệ đã bắt đầu; cần thống nhất điểm bắt đầu/kết thúc | Cần chốt sau khi có dữ liệu thử nghiệm |
| Thời gian hoàn tất hành trình | Từ lúc bắt đầu tìm đến lúc nhận mã booking; đo riêng Web và AI | Cần chốt; chưa có baseline |
| Tỷ lệ AI hoàn thành nhiệm vụ trên hội thoại thật | Hoàn thành đúng ràng buộc và đúng quyền, dựa trên bộ hội thoại có nhãn | Cần chốt bộ dữ liệu và ngưỡng với chủ hệ thống |
| Hiệu năng và tính sẵn sàng | Độ trễ p95, tỷ lệ lỗi, thời gian phục hồi trên môi trường tải đã thống nhất | Cần chốt tải, môi trường và SLO; không suy ra từ test chức năng |

Kết quả golden dùng provider giả lập chỉ đo hồi quy trên bộ mẫu. Không dùng tỷ lệ đó làm độ chính xác tiếng Việt của model thật hoặc mức thành công thực tế của sản phẩm.

## 4. Bên liên quan và 3 Actor nghiệp vụ cốt lõi

Hệ thống được thiết kế theo mô hình **SaaS Platform kết nối thể thao phong trào**, phân định rõ ranh giới trách nhiệm, thẩm quyền và tương tác giữa 3 Actor chính:

1. **Khách hàng (`user`):**
   - Người chơi có nhu cầu tìm kiếm sân bãi, tra cứu thông tin cơ sở, xem bảng giờ trống theo ngày (05:00–24:00) hoặc tương tác trực tiếp với Trợ lý AI.
   - Thao tác đặt ngày, nhận báo giá chốt tức thời, giữ chỗ 10 phút (`HELD`), tự hủy giữ chỗ sớm qua `DELETE /api/v1/reservations/:id` để nhường slot.
   - Quản lý lịch sử đặt sân cá nhân, ẩn vé đã chơi/hủy, theo dõi biểu đồ thống kê giờ chơi cá nhân.
   - Khi có việc bận không thể đến sân: Sang nhượng slot qua **Chợ Pass Sân (Pass Marketplace)** với cơ chế ký quỹ (Escrow) vì hệ thống khóa tuyệt đối quyền tự hủy booking đã confirmed.

2. **Quản lý trung tâm (`center_manager`):**
   - Đối tác sở hữu/quản lý cụm sân cụ thể, được Super Admin bàn giao quyền vận hành cơ sở thông qua định danh `managerId`.
   - **Tự tay thiết lập & hoàn thiện hồ sơ cơ sở (Self-serve Facility Setup):** Cập nhật địa chỉ chi tiết, hotline liên hệ lễ tân, giờ mở/đóng cửa, viết bio giới thiệu, chọn tiện ích (wifi, bãi đỗ xe, phòng tắm nóng lạnh...), tải logo và album ảnh thực tế mặt sân; thiết lập số lượng sân và cấu hình bảng giá linh hoạt theo giờ vàng / giờ thấp điểm, ngày thường / cuối tuần.
   - **Kích hoạt mở bán cơ sở:** Chủ động kích hoạt mở bán (`isActive: true`) sau khi hoàn tất hồ sơ thiết lập ban đầu để hiển thị công khai trên Web khách hàng.
   - Quản lý cấu hình sân nội bộ (đổi tên sân, thông số mặt sân thảm PVC/gỗ) trong cơ sở được phân công.
   - Tạm khóa / mở lại từng sân khi cần bảo trì, thay lưới (`isActive: false`), hệ thống tự động bảo vệ các slot tương lai đã có người đặt.
   - Tạo lịch cố định (Recurring Series 1–60 ngày) dạng chuỗi nguyên vẹn (atomic transaction) cho các CLB / khách quen.
   - Bảng điều khiển trạng thái sân thời gian thực (Real-time Court Grid 05:00–24:00) phục vụ đón tiếp và check-in khách tại quầy.
   - Xem báo cáo, thống kê lượt đặt và doanh số nội bộ của riêng trung tâm mình.
   - Soạn thảo & gửi hồ sơ đề xuất Sự kiện, Giải đấu CLB, Khuyến mại lớn lên Super Admin để thẩm định và duyệt đăng toàn sàn.
   - Báo cáo các bình luận đánh giá tiêu cực / chơi xấu từ đối thủ và gửi thông báo khẩn cấp đến khách có lịch chơi trong ngày tại sân khi xảy ra sự cố cơ sở (mất điện, dột mưa).

3. **Quản trị viên nền tảng (`super_admin` - Platform Operator):**
   - Đơn vị sở hữu và vận hành sàn công nghệ (Platform Operator), đóng vai trò điều phối hệ sinh thái, không can thiệp vào các hoạt động bán lẻ hay đặt lịch hàng ngày của từng cơ sở.
   - **Onboarding đối tác & Khởi tạo trung tâm (Platform Onboarding):** Tiếp nhận hồ sơ khi đối tác ký kết hợp đồng B2B; khởi tạo vỏ trung tâm ban đầu (Tên trung tâm/pháp nhân, gói thuê bao SaaS) và phân công tài khoản quản trị viên cơ sở (`managerId`); cơ sở khởi tạo ở trạng thái ban đầu `DRAFT` (`isActive: false`) chờ đối tác tự cấu hình; Super Admin không can thiệp gõ thay từng chi tiết địa chỉ, ảnh, bio hay tiện ích của sân.
   - **Quản lý Hợp đồng Đối tác & Thuê bao SaaS (B2B Partner Contracts):** Khởi tạo hợp đồng thuê bao (gói 3 tháng, 6 tháng, 1 năm); gia hạn hợp đồng khi đối tác thanh toán định kỳ; theo dõi thời hạn hiệu lực và công nợ phí phần mềm.
   - **Phân công & Điều chuyển quản lý cơ sở:** Gán và thay đổi `managerId` cho trung tâm khi đối tác thay đổi nhân sự quản lý (Center Manager không có quyền tự đổi người).
   - **Quản lý vòng đời cơ sở (Center Lifecycle):** Kích hoạt hoặc tạm dừng hoạt động trung tâm (`isActive: false`) khi đối tác nợ phí thuê bao hoặc hết hạn hợp đồng chưa gia hạn (Core tự động chặn đặt sân mới).
   - **Thẩm định, duyệt & Đăng tải Sự kiện / Giải đấu CLB:** Tiếp nhận đề xuất từ các Center Manager, kiểm duyệt nội dung/poster và phát hành công khai lên trang chủ toàn sàn (Web/App) để người chơi toàn hệ thống tiếp cận.
   - **Kiểm duyệt Đánh giá (Rating Text Moderation):** Trọng tài độc lập xử lý khiếu nại đánh giá xấu; ẩn/xóa bình luận bôi nhọ, tục tĩu vi phạm tiêu chuẩn cộng đồng.
   - **Truyền thông & Phát thông báo toàn sàn (Broadcast Notification):** Gửi thông báo hệ thống tới toàn bộ người dùng (lịch nghỉ lễ Tết, bảo trì máy chủ, chính sách sàn mới).
   - **Dashboard giám sát vĩ mô toàn sàn:** Báo cáo tổng thể toàn bộ mạng lưới trung tâm, tổng lượt đặt, GMV toàn hệ sinh thái phục vụ đối soát và phân tích tăng trưởng nền tảng.
   - **Quản trị tài khoản & An toàn hệ thống:** Khóa tài khoản người dùng vi phạm chính sách / bot spam slot (Ban user).

### 4.1. Ma trận quyền nghiệp vụ 3 Actor

| Nghiệp vụ / Hành động | Chưa có phiên | user (Khách hàng) | center_manager (Quản lý sân) | super_admin (Vận hành sàn) |
| :--- | :---: | :---: | :---: | :---: |
| **Xem danh mục trung tâm, ảnh, tiện ích, lịch trống công khai** | Có | Có | Có | Có |
| **Giữ chỗ 10p (HELD) & Tự hủy giữ chỗ sớm (DELETE /reservations/:id)** | Không | Booking của mình | Không | Không |
| **Xác nhận đặt ngày (CONFIRMED) & Xem/ẩn lịch sử cá nhân** | Không | Booking của mình | Booking của mình | Booking của mình |
| **Hủy booking CONFIRMED & Hoàn tiền** | Không | **Không (Chặn 403, sang Chợ Pass)** | **Không (Hệ thống không hoàn tiền)** | **Không (Hệ thống không hoàn tiền)** |
| **Sang nhượng slot qua Chợ Pass Sân (Pass Marketplace)** | Không | Toàn quyền (mua / bán) | Không | Giám sát ký quỹ (Escrow) |
| **Sử dụng Trợ lý AI (Drawer / Chatbot) tìm kiếm & hỏi đáp FAQ** | Không | Có | Có | Có |
| **Cấu hình sân nội bộ, bảng giá giờ cao/thấp điểm** | Không | Không | Trung tâm được giao | Không tự ý can thiệp |
| **Tạm khóa / bảo trì từng sân (isActive: false)** | Không | Không | Trung tâm được giao | Không can thiệp lẻ |
| **Tạo lịch cố định nhiều ngày (chuỗi atomic 1–60 ngày)** | Không | Không | Trung tâm được giao | Không can thiệp |
| **Bảng grid trạng thái sân thời gian thực & Check-in đón khách** | Không | Không | Trung tâm được giao | Mọi trung tâm (chế độ xem) |
| **Xem báo cáo doanh số, lượt đặt nội bộ sân mình** | Không | Không | Trung tâm được giao | Không can thiệp nội bộ |
| **Onboarding đối tác & Ký HĐ SaaS (tạo vỏ cơ sở ban đầu)** | Không | Không | Ký HĐ & nhận bàn giao | **Toàn quyền khi ký HĐ B2B** |
| **Thiết lập hồ sơ cơ sở (hotline, địa chỉ, ảnh, bio, tiện ích, số sân)** | Không | Không | **Toàn quyền (sân được giao)** | Giám sát / hỗ trợ |
| **Kích hoạt mở bán cơ sở sau setup (isActive: true)** | Không | Không | **Chủ động kích hoạt** | Toàn quyền kiểm soát |
| **Quản lý Hợp đồng Đối tác & Gia hạn thuê bao SaaS** | Không | Không | Xem hạn HĐ & liên hệ gia hạn | **Toàn quyền (Tạo/Gia hạn/Dừng)** |
| **Gán và điều chuyển người quản lý (managerId)** | Không | Không | Không | **Toàn quyền** |
| **Tạm dừng / Đóng trung tâm hết hạn HĐ (isActive: false)** | Không | Không | Không | **Toàn quyền** |
| **Đề xuất Sự kiện, Giải đấu CLB, Khuyến mại cơ sở** | Không | Không | Soạn thảo & gửi đề xuất | Thẩm định & duyệt |
| **Phê duyệt & Đăng tải Tin tức / Sự kiện lên trang chủ toàn sàn** | Xem & đăng ký | Xem & tham gia | Chờ phê duyệt | **Toàn quyền duyệt & đăng** |
| **Kiểm duyệt Đánh giá (Rating Text Moderation) & xóa bình luận xấu** | Viết đánh giá | Báo cáo khiếu nại | Không tự xóa | **Toàn quyền ẩn / xóa** |
| **Gửi thông báo sự cố cục bộ tới khách trong ngày tại sân** | Nhận thông báo | Không | Gửi khách có lịch hôm nay | Không can thiệp |
| **Phát thông báo toàn hệ thống (Broadcast Notification)** | Nhận thông báo | Không | Nhận thông báo | **Toàn quyền gửi toàn sàn** |
| **Dashboard giám sát vĩ mô toàn sàn & GMV hệ sinh thái** | Không | Không | Không | **Toàn quyền** |
| **Khóa tài khoản vi phạm chính sách / Bot spam slot (Ban)** | Không | Không | Báo cáo vi phạm | **Toàn quyền** |

Vai trò và thông tin hiển thị trong browser không tự cấp quyền. Mọi quyền tác động dữ liệu phải được backend kiểm tra từ danh tính đã xác minh (JWT claims) và quan hệ tài nguyên (`managerId`).

## 5. Phạm vi và Mô hình Vận hành Nền tảng

### 5.1. Trong phạm vi phiên bản hiện tại

Hệ thống triển khai theo mô hình **B2B SaaS Subscription (Phần mềm dịch vụ thu phí thuê bao theo tháng/năm)**, duy trì **1 ứng dụng Web khách hàng** và **1 ứng dụng Admin hợp nhất (`apps/admin`)** phân quyền RBAC:

| Nhóm | Nội dung |
| --- | --- |
| **Danh mục sân & Onboarding** | Quy trình Onboarding 2 bước: Super Admin khởi tạo vỏ trung tâm & HĐ SaaS (Tên cơ sở + gói thuê bao + gán `managerId`) ở trạng thái DRAFT; Center Manager tự tay hoàn thiện hồ sơ vận hành (hotline, địa chỉ, ảnh, bio, tiện ích, số lượng sân, bảng giá) và kích hoạt mở bán (`isActive: true`). |
| **Quản lý Hợp đồng SaaS** | Super Admin quản lý hợp đồng thuê bao đối tác (gói 3/6/12 tháng), ngày bắt đầu/kết thúc, trạng thái thanh toán và gia hạn; tự động/thủ công tạm dừng cơ sở khi quá hạn. |
| **Cấu hình & Vận hành cơ sở** | Center Manager điều chỉnh giá giờ vàng/thấp điểm, ngày thường/cuối tuần; bật/tắt bảo trì từng sân; quản lý grid sân check-in khách. |
| **Đặt sân & Concurrency** | Lịch trống 05:00–24:00, GiST Exclusion Constraint chống race condition; giữ chỗ 10 phút; tự hủy giữ chỗ sớm; khóa hủy booking confirmed. |
| **Lịch cố định (Series)** | Center Manager đặt lịch chuỗi 1–60 ngày cho CLB/khách quen; kiểm tra toàn chuỗi; ghi nhận nguyên vẹn (atomic transaction). |
| **Truyền thông & Đăng tin** | Center Manager đề xuất sự kiện/giải đấu $\rightarrow$ Super Admin thẩm định, duyệt và phát hành lên trang chủ toàn sàn. |
| **Đánh giá & Kiểm duyệt** | Khách hàng đánh giá sao/bình luận; Center Manager báo cáo khiếu nại; Super Admin kiểm duyệt từ ngữ độc hại và ẩn/xóa bình luận bôi nhọ. |
| **Thông báo hệ thống** | Super Admin phát thông báo toàn sàn (Broadcast); Center Manager phát thông báo khẩn cấp cục bộ cho khách có booking trong ngày. |
| **Trợ lý AI** | Drawer trượt Amazon Q-Style, tiếng Việt tự nhiên, LangGraph workflow, đối chiếu lịch Core, hỗ trợ FAQ và consent đặt sân. |
| **Chợ Pass Sân** | Khách hàng đăng bài nhượng slot có cơ chế ký quỹ (Escrow) minh bạch khi không thể đến chơi. |
| **Giao diện hợp nhất** | Web khách hàng kế thừa bố cục booking; Admin portal hợp nhất dùng chung cho cả Center Manager và Super Admin với menu lọc theo vai trò. |

Booking Core là nguồn sự thật duy nhất (Single Source of Truth) quyết định lịch trống, phân bổ slot, quyền tác động booking và giá chốt.

### 5.2. Ngoài phạm vi

- Payment gateway thu hộ / chi hộ tiền đặt sân giữa khách hàng và chủ sân (tiền sân thanh toán trực tiếp tại quầy hoặc chuyển khoản cơ sở; giao dịch phí phần mềm giữa Super Admin và Center Manager là hợp đồng dịch vụ B2B định kỳ).
- Ví điện tử, đối soát ngân hàng tự động T+7/T+15, xuất hóa đơn thuế điện tử tự động.
- Hệ thống chat mạng xã hội thời gian thực giữa người chơi với nhau (chỉ duy trì kênh trợ lý AI và thông báo hệ thống).
- Giải đấu quy mô chuyên nghiệp tính điểm Elo, bốc thăm chia bảng tự động (chỉ hỗ trợ đăng tin tức/sự kiện giải đấu).
- Định vị GPS thời gian thực và tính khoảng cách di chuyển chính xác theo km (khu vực AI xử lý theo quận/tên địa danh).

## 6. Yêu cầu chức năng theo 3 Actor nghiệp vụ

Ưu tiên: **P0** là điều kiện bắt buộc cho luồng đúng và an toàn; **P1** là chức năng cần có trong phạm vi bàn giao; **P2** là cải thiện sau khi luồng chính được nghiệm thu. Trạng thái “Có” đối chiếu với hiện trạng mã nguồn.

### 6.1. Nghiệp vụ Khách hàng (`user`)

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-U01 | Tra cứu danh mục trung tâm, sân, địa chỉ, ảnh thực tế, tiện ích và lịch trống theo ngày (05:00–24:00) | P1 | Có |
| FR-U02 | Hiển thị mức giá minh bạch theo ngày thường/cuối tuần và khung giờ; giá chốt do Core tính từ dữ liệu tin cậy | P0 | Có |
| FR-U03 | Khách chọn một hoặc nhiều sân/slot cùng trung tâm, cùng ngày, xem tóm tắt rồi xác nhận đặt | P0 | Có |
| FR-U04 | Giữ chỗ có hạn 10 phút (`HELD`), ngăn chiếm trùng slot và giải phóng giữ chỗ quá hạn/hủy | P0 | Có |
| FR-U05 | Khách hàng tự hủy giữ chỗ tạm thời (`HELD`) qua `DELETE /api/v1/reservations/:id` để giải phóng slot ngay lập tức | P0 | Có |
| FR-U06 | Bảo vệ chống trùng lặp (Idempotency): Gửi lại cùng mã yêu cầu trả cùng booking confirmed, không tạo đơn mới | P0 | Có ở Core/Gateway; Web đặt ngày cần key ổn định |
| FR-U07 | Chủ booking xem lịch sử cá nhân, lọc trạng thái, xem chi tiết và biểu đồ thống kê giờ chơi cá nhân | P1 | Có |
| FR-U08 | Khóa hủy booking `CONFIRMED`: Hệ thống từ chối mọi yêu cầu hủy confirmed với HTTP 403 Forbidden do không hỗ trợ hoàn tiền; khách hàng được ẩn vé đã kết thúc/hủy khỏi lịch cá nhân | P0 | Có |
| FR-U09 | Đăng bài sang nhượng slot trên Chợ Pass Sân (Pass Marketplace) có Escrow khi không thể đến chơi | P1 | Có ở tầng kiến trúc & tri thức AI |
| FR-U10 | Tương tác Trợ lý AI (Drawer / Chatbot) tiếng Việt: Thu thập điều kiện, gợi ý slot, giải đáp FAQ, consent đặt sân và khôi phục hội thoại | P1 | Có |

### 6.2. Nghiệp vụ Quản lý trung tâm (`center_manager`)

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-M01 | Tự hoàn thiện hồ sơ cơ sở (Self-serve Setup): Cập nhật hotline, địa chỉ chi tiết, link Google Maps, giờ mở/đóng cửa, bio, tiện ích, tải ảnh/logo, thiết lập số lượng sân (`totalCourts`) và kích hoạt mở bán (`isActive: true`) | P0 | Có (`PATCH /centers/:id` hỗ trợ đủ fields) |
| FR-M02 | Quản lý cấu hình sân nội bộ (đổi tên sân, thông số mặt sân thảm/gỗ) trong cơ sở được phân công | P1 | Có |
| FR-M03 | Thiết lập bảng giá linh hoạt theo giờ vàng / giờ thấp điểm, ngày thường / cuối tuần của trung tâm mình | P0 | Có |
| FR-M04 | Tạm khóa / bảo trì từng sân (`isActive: false`) khi có sự cố kỹ thuật; Core chặn đóng sân nếu còn allocation tương lai | P0 | Có |
| FR-M05 | Tạo lịch cố định (Recurring Series 1–60 ngày) cho CLB / khách quen; kiểm tra khả dụng toàn chuỗi và ghi nhận nguyên vẹn (atomic) | P1 | Có |
| FR-M06 | Bảng điều khiển trạng thái sân thời gian thực (Real-time Court Grid 05:00–24:00) phục vụ đón tiếp và check-in khách tại quầy | P1 | Có |
| FR-M07 | Báo cáo doanh số & thống kê lượt đặt nội bộ của riêng trung tâm mình; không xem hoặc can thiệp dữ liệu trung tâm khác | P1 | Có |
| FR-M08 | Soạn thảo & gửi hồ sơ đề xuất Sự kiện, Giải đấu CLB, Khuyến mại cơ sở lên Super Admin để thẩm định và duyệt đăng toàn sàn | P2 | Có baseline từ `new_service` & `Competition.jsx` |
| FR-M09 | Báo cáo đánh giá tiêu cực / chơi xấu từ đối thủ lên Super Admin; gửi thông báo sự cố cục bộ đến khách có booking trong ngày | P2 | Có baseline từ `rating_service` & `notification_service` |

### 6.3. Nghiệp vụ Quản trị viên nền tảng (`super_admin` - Platform Operator)

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-A01 | Onboarding đối tác & Ký hợp đồng B2B: Khởi tạo vỏ trung tâm, thiết lập gói thuê bao SaaS ban đầu và phân công `managerId` ở trạng thái DRAFT (`isActive: false`) | P0 | Có (`createCenter` chỉ cho phép `super_admin`) |
| FR-A02 | Giám sát truyền thông & Hỗ trợ cơ sở: Thẩm định hình ảnh/nội dung cơ sở, hỗ trợ kỹ thuật; Center Manager là đầu mối tự tải ảnh và cập nhật thông tin sân mình | P1 | Có |
| FR-A03 | Quản lý Hợp đồng Đối tác B2B (SaaS Contracts): Tạo hợp đồng thuê bao (3/6/12 tháng), gia hạn hợp đồng, quản lý ngày bắt đầu/kết thúc và công nợ phí phần mềm | P1 | Kiến trúc SaaS & Tab Contracts trên Admin |
| FR-A04 | Phân công & điều chuyển người quản lý cơ sở (`managerId`) cho trung tâm; Center Manager không có quyền tự đổi người | P0 | Có (`assertCenterManager` và `updateCenter` chặn cứng) |
| FR-A05 | Quản lý vòng đời cơ sở: Kích hoạt hoặc tạm dừng hoạt động trung tâm (`isActive: false`) khi đối tác nợ phí hoặc hết hạn HĐ | P0 | Có |
| FR-A06 | Thẩm định, phê duyệt và đăng tải Sự kiện / Giải đấu CLB / Tin tức toàn sàn lên trang chủ Web/App | P2 | Có baseline `content-service` / `@Roles('super_admin')` |
| FR-A07 | Kiểm duyệt đánh giá (Text Moderation): Trọng tài độc lập xử lý khiếu nại, ẩn/xóa bình luận bôi nhọ, tục tĩu vi phạm tiêu chuẩn cộng đồng | P2 | Có baseline `content-service` ratings moderation |
| FR-A08 | Dashboard giám sát vĩ mô toàn sàn: Báo cáo tổng thể toàn bộ mạng lưới trung tâm, tổng lượt đặt, GMV toàn hệ sinh thái | P1 | Có baseline `Report.jsx` & telemetry |
| FR-A09 | Quản trị an toàn tài khoản: Khóa tài khoản người dùng vi phạm chính sách / bot spam slot (Ban user); phát thông báo toàn sàn (Broadcast) | P1 | Có |

### 6.4. Tích hợp và bảo đảm kiến trúc hệ thống

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-SYS01 | Bảo vệ thao tác bằng JWT xác minh danh tính, phân quyền RBAC và kiểm tra quan hệ tài nguyên cơ sở (`managerId`) | P0 | Có (`api-gateway` và `booking-core`) |
| FR-SYS02 | Mã đối chiếu yêu cầu (`X-Request-Id`), logs có cấu trúc JSON, Prometheus metrics, healthcheck và transactional outbox | P1 | Có đầy đủ |
| FR-SYS03 | Duy trì 1 ứng dụng Admin hợp nhất (`apps/admin`) phân quyền menu theo vai trò (`super_admin` và `center_manager`) | P1 | Có trong `Dashboard.jsx` và RBAC context |

## 7. Quy tắc nghiệp vụ

| Mã | Quy tắc |
| --- | --- |
| BR-01 | Đơn vị đặt sân là 60 phút, bắt đầu vào giờ tròn. AI phải hỏi lại khi khách yêu cầu 90 phút hoặc 19:30; không tự làm tròn. |
| BR-02 | Với yêu cầu AI “2 tiếng”, phải có 2 slot liên tiếp của cùng một sân. Luồng chọn trực tiếp có thể chọn nhiều sân/slot rời; mỗi slot vẫn dài 60 phút. |
| BR-03 | Ngày/giờ dùng múi giờ Việt Nam; chỉ nhận slot chưa bắt đầu và nằm trọn trong giờ mở cửa của trung tâm. Không đặt xuyên qua ngày khác trong một booking theo ngày. |
| BR-04 | Core cho đặt từ hôm nay tới 90 ngày tới. Bảng giờ UI gốc hiện là 05:00–24:00; phạm vi ngày/giờ UI chưa hoàn toàn khớp khả năng Core, xem GAP-03. |
| BR-05 | Ngày thường và cuối tuần có thể có giá khác nhau; cuối tuần là thứ bảy/chủ nhật. Bảng giá phải phủ đủ giờ mở cửa, không chồng lấn hoặc bỏ khoảng trống. |
| BR-06 | Giá dùng VND nguyên; Core tính tổng và giảm giá từ dữ liệu tin cậy. Các tỷ lệ giảm được cộng, không nhân nối tiếp; tổng tiền sau giảm được làm tròn về VND nguyên. Không nhận giá/điểm tự khai báo từ browser làm giá chốt. |
| BR-07 | Chính sách kế thừa: từ 2 sân khác nhau giảm thêm 5%; loyalty từ 2.000 điểm giảm 5%, từ 4.000 giảm 10%. Hai mức loyalty không cộng với nhau; cộng thêm giảm nhiều sân thì tối đa 15%. Điểm đến từ danh tính đã ký; hệ thống không tự tích điểm hay xác minh một chương trình thành viên riêng. Cần phê duyệt tiếp tục chính sách ở D-02. |
| BR-08 | Báo giá giữ chỗ được chốt tại lúc reserve; sửa bảng giá sau đó không thay giá của giữ chỗ/booking đã chốt. Kết quả tìm kiếm trước reserve chỉ là thông tin tại thời điểm tìm. |
| BR-09 | Mặc định giữ chỗ 300 giây; cấu hình hiện cho phép 30–900 giây. Thời hạn luôn bị cắt ở giờ bắt đầu slot đầu tiên. Mỗi actor tối đa 5 giữ chỗ đang hoạt động. |
| BR-10 | Giữ chỗ còn hạn và booking confirmed đều chiếm slot. Tại một thời điểm, không được có hai phân bổ còn hiệu lực chồng lên cùng sân/giờ. |
| BR-11 | Xác nhận lần đầu chỉ áp dụng cho giữ chỗ HELD còn hạn; gửi lại xác nhận đã thành công trả booking cũ theo BR-12. Giữ chỗ hết hạn bị từ chối, giải phóng slot và yêu cầu chọn lại. |
| BR-12 | Cùng actor, cùng mã yêu cầu và cùng nội dung phải cho cùng kết quả; dùng mã cũ cho nội dung khác phải bị từ chối. Đổi ý định đặt thì dùng mã mới. |
| BR-13 | Quy tắc hủy nghiêm ngặt (Strict Cancellation Policy): Hệ thống KHÔNG hỗ trợ nghiệp vụ hủy booking đã `CONFIRMED` cho bất kỳ vai trò nào (`user`, `center_manager`, `super_admin`) do hệ thống không hỗ trợ nghiệp vụ hoàn tiền (refund) phức tạp. Mọi yêu cầu gọi `POST /api/v1/bookings/:id/cancel` đều bị từ chối với mã lỗi HTTP 403 Forbidden. Khách hàng muốn chuyển nhượng slot phải đăng bán qua Chợ Pass Sân (Pass Marketplace). Khách hàng chỉ có thể tự hủy giữ chỗ tạm thời (`HELD` 10 phút khi chưa thanh toán) qua `DELETE /api/v1/reservations/:id` để giải phóng slot ngay lập tức. |
| BR-14 | “Xóa” lịch cá nhân là ẩn đối với chủ booking sau khi booking đã hủy hoặc toàn bộ giờ chơi đã kết thúc. Không xóa cứng booking và dấu nghiệp vụ cần lưu; phân bổ slot có thể được giải phóng khi hủy hoặc hết hạn. |
| BR-15 | Lịch cố định gồm 1–60 ngày có lịch, trong giới hạn đặt trước; tối đa 8 sân mỗi ngày theo hợp đồng Core. Có thể chọn sân/giờ khác nhau theo ngày. Bất kỳ ngày nào xung đột thì toàn bộ lần tạo chuỗi bị hoàn tác. |
| BR-16 | Tạm đóng trung tâm/sân hoặc giảm số sân không được làm mất phân bổ tương lai còn hiệu lực. “Xóa trung tâm” của UI gốc thực hiện ngừng hoạt động, không xóa hồ sơ cũ. |
| BR-17 | AI không tự nới ngày, thời lượng, ngân sách cứng hoặc cửa sổ bắt đầu. Chỉ nới giờ ưu tiên/khu vực khi đã được đánh dấu là ưu tiên mềm. |
| BR-18 | Khu vực AI hiện so theo tên/địa chỉ, không có bằng chứng về km hoặc “gần nhất”. Mặc định chỉ kiểm tra tối đa 5 trung tâm khớp và trả tối đa 5 phương án; không tuyên bố đã tìm hết catalogue. |
| BR-19 | “Giờ bắt đầu chậm nhất 20:30” giới hạn giờ bắt đầu, không bắt buộc kết thúc trước 20:30. Thời điểm kết thúc vẫn phải nằm trong giờ mở cửa. Cần diễn đạt rõ trên tóm tắt để khách xác nhận. |
| BR-20 | Thay đổi điều kiện, lựa chọn hết hạn hoặc giá chốt thay đổi phải làm mất hiệu lực xác nhận AI cũ. Nếu giá mới vượt ngân sách cứng thì không đặt; nếu còn phù hợp thì xin xác nhận lại. |
| BR-21 | Ý định do model suy ra không tự cấp quyền đặt. AI phải có lựa chọn và bằng chứng xác nhận cuối còn hiệu lực; quyền ghi vẫn do backend thực thi. |
| BR-22 | Confirmed là trạng thái đặt sân; không đại diện cho thanh toán, hóa đơn tài chính, khách đã đến sân hoặc hoàn thành buổi chơi. |

Ví dụ giá theo baseline: đặt 2 sân, mỗi sân 2 slot, mỗi slot 80.000đ thì giá gốc là 320.000đ. Nếu actor có 4.000 điểm loyalty hợp lệ, tổng giảm là 10% + 5% = 15%, tiền giảm 48.000đ và tổng giá chốt 272.000đ. Ví dụ không thể hiện việc đã thanh toán và không tự áp dụng cho khách được quản lý đặt hộ khi chưa có lookup điểm.

### 7.1. Trạng thái nghiệp vụ

| Đối tượng | Trạng thái | Ý nghĩa/chuyển trạng thái |
| --- | --- | --- |
| Giữ chỗ | HELD | Đang giữ slot, chờ xác nhận trong thời hạn |
| Giữ chỗ | CONFIRMED | Đã xác nhận và có booking tương ứng |
| Giữ chỗ | CANCELLED | Đã bỏ giữ chỗ hoặc hủy booking liên quan; slot được giải phóng |
| Giữ chỗ | EXPIRED | Quá hạn; không được xác nhận lại |
| Booking | CONFIRMED | Đơn đặt sân được Core ghi nhận |
| Booking | CANCELLED | Đơn đã hủy; slot được giải phóng; giữ hồ sơ |
| Hiển thị lịch cá nhân | Hiện/ẩn | Thuộc tính hiển thị riêng, không phải trạng thái thanh toán hoặc xóa booking |

Sau khi đã confirm, booking không thể hủy bởi bất kỳ ai (kể cả quản lý hay quản trị viên) do hệ thống không hỗ trợ nghiệp vụ hoàn tiền; khách hàng có nhu cầu sang nhượng slot phải đăng bài qua Chợ Pass Sân. Thao tác bỏ giữ chỗ (`DELETE /api/v1/reservations/:id`) chỉ áp dụng khi giữ chỗ đang ở trạng thái `HELD` (trong vòng 10 phút chưa thanh toán). Hội thoại AI lưu trạng thái kế hoạch/lựa chọn/xác nhận/biên nhận riêng, không phải nguồn thay thế trạng thái booking tại Core.

## 8. Luồng nghiệp vụ chính

### UC-01 — Tìm và đặt sân trực tiếp

**Tác nhân:** khách có phiên hợp lệ. **Liên quan:** FR-01, FR-02, FR-05, FR-06, FR-07.

1. Khách xem trung tâm, chọn ngày và tải lịch trống.
2. Khách chọn sân/slot; giao diện hiển thị thời lượng và giá dự kiến.
3. Khách xem tóm tắt rồi xác nhận trên modal.
4. Gateway yêu cầu Core giữ chỗ và xác nhận; Core kiểm tra lại quyền, thời gian, giá và slot trong lúc ghi dữ liệu.
5. Thành công: trả mã booking confirmed, cập nhật lịch và cho khách xem lịch sử.

**Ngoại lệ:** slot vừa bị người khác lấy thì báo xung đột và tải lại lịch; giữ chỗ hết hạn thì chọn lại; mất kết quả thì phải tra cứu/gửi lại đúng ý định với cùng mã yêu cầu. Lịch trống lúc xem không phải cam kết giữ sân. Điểm gửi lại từ Web còn thiếu ở GAP-02.

### UC-02 — Xem, quản lý lịch cá nhân và quy trình hủy giữ chỗ / booking

**Tác nhân:** chủ booking (khách hàng); người quản lý trung tâm (`center_manager`); quản trị viên (`super_admin`). **Liên quan:** FR-08, FR-09, FR-19.

1. Khách mở lịch sử, lọc theo điều kiện được hỗ trợ và chọn booking của mình.
2. Với giữ chỗ tạm thời (`HELD` trong 10 phút chưa thanh toán), khách có thể tự hủy giữ chỗ để giải phóng slot (`DELETE /api/v1/reservations/:id`).
3. Với booking đã `CONFIRMED`:
   - Bất kỳ ai gửi yêu cầu hủy booking đã xác nhận (kể cả `user`, `center_manager`, `super_admin`, trực tiếp qua API hoặc qua Chatbot AI): Hệ thống **từ chối với mã lỗi HTTP 403 Forbidden**, thông báo rõ: *"Booking đã xác nhận không thể tự hủy. Bạn vui lòng sử dụng tính năng Chợ Pass sân hoặc liên hệ quản lý trung tâm."* Chatbot tự động hướng dẫn người dùng sang quy trình đăng bài Chợ Pass Sân (`pass-booking-rules`). Không hỗ trợ hủy và hoàn tiền.
4. Với booking đã ở trạng thái `CANCELLED` (do timeout giữ chỗ) hoặc đã kết thúc toàn bộ giờ chơi, khách có thể xác nhận ẩn khỏi lịch cá nhân (giữ nguyên hồ sơ lưu trữ và kiểm toán).

**Ngoại lệ:** Mọi yêu cầu hủy booking đã CONFIRMED đều nhận lỗi HTTP 403 Forbidden; hệ thống không hỗ trợ hoàn tiền trực tiếp tự động.

### UC-03 — Tạo lịch cố định

**Tác nhân:** quản lý trung tâm hoặc quản trị. **Liên quan:** FR-10, FR-11.

1. Chọn trung tâm thuộc quyền quản lý và khách từ danh sách host cung cấp.
2. Chọn ngày bắt đầu, các thứ, thời gian và sân; xem các ngày phát sinh trong phạm vi hỗ trợ của màn hình.
3. Kiểm tra khả dụng cho toàn bộ các ngày sẽ gửi; rà soát từng lựa chọn và tổng giá.
4. Xác nhận gửi toàn bộ chuỗi với mã yêu cầu ổn định.
5. Core kiểm tra lại mọi occurrence và ghi cả chuỗi trong cùng một transaction.

**Kết quả:** hoặc tạo toàn bộ, hoặc không tạo booking nào trong lần tạo chuỗi nếu có xung đột. Không tự bỏ ngày trùng rồi báo đã tạo đủ lịch. Directory khách bên ngoài chưa có thì UI không tự tạo tài khoản thay thế.

### UC-04 — Tìm và đặt sân bằng AI

**Tác nhân:** chủ hội thoại có phiên hợp lệ. **Liên quan:** FR-12 đến FR-18.

Ví dụ nhu cầu: “Mai khoảng 19 giờ, chơi 2 tiếng, gần Cầu Giấy, tổng dưới 300 nghìn.”

1. AI trích điều kiện; hỏi ngày/giờ/thời lượng nếu thiếu và làm rõ thời lượng/giờ không phù hợp slot 60 phút.
2. Người dùng bổ sung hoặc sửa một phần yêu cầu; các điều kiện khác được giữ lại.
3. AI đọc lịch/giá từ Core, tìm đủ số slot liên tiếp cùng sân, lọc theo điều kiện bắt buộc và xếp phương án.
4. Nếu không có kết quả, AI giải thích và xin điều chỉnh điều kiện cứng; chỉ tự tìm lại trong giới hạn ưu tiên mềm đã cho phép.
5. Người dùng chọn một phương án; hệ thống hiển thị tóm tắt và yêu cầu xác nhận cuối. Bước chọn chưa giữ/đặt sân.
6. Sau xác nhận cuối hợp lệ, AI yêu cầu Core reserve/confirm, kiểm tra báo giá và nhận biên nhận.
7. Chỉ khi Core xác nhận thành công mới hiển thị mã booking. Khi tải lại trang, người dùng có thể khôi phục hội thoại và kết quả đã lưu.

**Ngoại lệ:** đổi điều kiện thì chọn/xác nhận cũ mất hiệu lực; giá thay đổi thì xin xác nhận lại; slot bị lấy thì tìm lại; timeout thì phục hồi yêu cầu cũ để xác định kết quả. Tin nhắn “hủy” trong hội thoại có thể hủy kế hoạch/lựa chọn, không mặc nhiên thực hiện hủy một booking đã confirmed; khách dùng luồng hủy booking hiện có.

### UC-05 — Center Manager tự thiết lập cơ sở (Self-serve Setup), cấu hình sân và bảng giá

**Tác nhân:** người quản lý trung tâm (`center_manager`). **Liên quan:** FR-M01, FR-M02, FR-M03, FR-M04.

1. **Tiếp nhận cơ sở:** Center Manager đăng nhập cổng Admin, mở cơ sở vừa được Super Admin bàn giao (đang ở trạng thái ban đầu `DRAFT` / `isActive: false`).
2. **Tự hoàn thiện thông tin & tư liệu:** Nhập số hotline lễ tân đón khách, địa chỉ chi tiết, link Google Maps chỉ đường, giờ mở cửa và giờ đóng cửa (`openMinute`, `closeMinute`); soạn thảo bio giới thiệu cơ sở; tích chọn danh mục tiện ích sẵn có (wifi, phòng tắm nước nóng, bãi gửi ô tô, cho thuê vợt). Tải logo đại diện và album ảnh chụp thực tế mặt sân.
3. **Khai báo số sân & cấu hình sân:** Nhập số lượng sân ban đầu (`totalCourts`), tùy chỉnh tên hiển thị từng sân (Sân 1, Sân 2, Sân VIP) và thông số mặt sân (thảm PVC tiêu chuẩn BWF / sàn gỗ).
4. **Thiết lập bảng giá linh hoạt:** Cài đặt giá giờ chuẩn, giá giờ vàng (cao điểm chiều tối) và giờ thấp điểm, phân tách rõ khung giá ngày thường và cuối tuần.
5. **Kích hoạt mở bán (Go-Live):** Sau khi hoàn tất danh mục kiểm tra tối thiểu (có địa chỉ, số hotline, ít nhất 1 sân và bảng giá), Center Manager gạt nút **[Kích hoạt mở bán]** (`isActive: true`). Cơ sở lập tức xuất hiện công khai trên Web khách hàng để nhận đặt lịch.
6. **Vận hành & bảo trì thường nhật:** Khi cần thay lưới hoặc bảo dưỡng định kỳ, Center Manager chuyển trạng thái sân sang `isActive: false`. Backend Booking Core kiểm tra: nếu sân đang có allocation tương lai còn hiệu lực thì từ chối (HTTP 409 Conflict) để bảo vệ quyền lợi của khách hàng đã đặt; nếu không có tranh chấp thì cho phép tạm khóa.
7. Báo giá của các booking/giữ chỗ đã chốt trước thời điểm cập nhật bảng giá được giữ nguyên vẹn (Price Snapshot).

### UC-06 — Super Admin Onboarding trung tâm & Quản lý Hợp đồng Đối tác B2B (SaaS Contracts)

**Tác nhân:** quản trị viên nền tảng (`super_admin` - Platform Operator). **Liên quan:** FR-A01, FR-A02, FR-A03, FR-A04, FR-A05.

1. **Khởi tạo đối tác & Hợp đồng B2B (Bước 1 Onboarding):** Sau khi đối tác ký kết hợp đồng hợp tác dịch vụ, Super Admin vào tab "Quản lý Hợp đồng Đối tác", bấm **[+ Ký mới / Tạo Hợp đồng]**.
2. **Thiết lập thông số hợp đồng SaaS:** Super Admin nhập thông tin định danh cốt lõi: Tên pháp nhân / tên thương hiệu cơ sở, chọn gói thuê bao (3 tháng, 6 tháng, 1 năm), hệ thống tự động xác định ngày bắt đầu và ngày kết thúc hợp đồng; chọn tài khoản đối tác (`center_manager`) để gán quyền quản lý qua `managerId`.
3. **Bàn giao quyền cho cơ sở (DRAFT):** Trung tâm được khởi tạo với trạng thái ban đầu là `DRAFT` (`isActive: false`). Hệ thống phân công cơ sở cho Center Manager để đối tác tự tay cấu hình chi tiết (theo UC-05). Super Admin không phải làm thay các công việc nhập ảnh, bio, tiện ích hay bảng giá.
4. **Gia hạn hợp đồng & Xử lý nợ phí:** Khi đối tác thanh toán phí duy trì định kỳ, Super Admin bấm **[Gia hạn hợp đồng]** để cộng thêm thời gian hiệu lực. Nếu đối tác quá hạn nợ phí hoặc hết hạn hợp đồng chưa tái ký, Super Admin gạt nút **Tạm dừng hoạt động** (`isActive: false`), Booking Core lập tức khóa chức năng đặt sân mới của cơ sở này; Center Manager không thể tự gạt mở lại nếu chưa gia hạn hợp đồng.
5. **Điều chuyển nhân sự:** Khi chủ sân thay đổi người quản lý, chỉ Super Admin mới có quyền gán lại `managerId` mới cho trung tâm (Center Manager bị từ chối đổi quyền).

### UC-07 — Đề xuất, Duyệt và Đăng tải Sự kiện / Giải đấu CLB toàn sàn

**Tác nhân:** người quản lý trung tâm (`center_manager`) đề xuất; quản trị viên (`super_admin`) thẩm định và duyệt. **Liên quan:** FR-M07, FR-A06.

1. Center Manager lập kế hoạch tổ chức giải đấu nội bộ hoặc sự kiện giao lưu tại cơ sở; soạn thảo hồ sơ (tiêu đề, thể lệ, poster ảnh, thời gian, giải thưởng) và bấm gửi đề xuất sự kiện lên Super Admin.
2. Yêu cầu chuyển sang trạng thái chờ duyệt (Pending Review). Center Manager không thể tự ý phát hành trực tiếp lên trang chủ.
3. Super Admin nhận thông báo, kiểm tra tính pháp lý, tính thẩm mỹ của banner và văn phong bài viết.
4. Nếu đạt chuẩn: Super Admin bấm **[Phê duyệt & Đăng tải]**. Bài viết / sự kiện lập tức xuất hiện tại mục Tin tức & Sự kiện trên trang chủ Web/App cho toàn bộ người chơi toàn sàn theo dõi và đăng ký. Nếu chưa đạt: Super Admin phản hồi lý do yêu cầu cơ sở chỉnh sửa lại.

### UC-08 — Kiểm duyệt Đánh giá xấu & Phát thông báo hệ thống

**Tác nhân:** khách hàng (`user`), quản lý trung tâm (`center_manager`), quản trị viên (`super_admin`). **Liên quan:** FR-M08, FR-A07, FR-A09.

1. **Xử lý khiếu nại đánh giá:** Khách chơi xong gửi đánh giá sao và bình luận về cơ sở. Nếu xuất hiện bình luận vu khống, chửi bới ác ý từ đối thủ, Center Manager bấm nút **[Báo cáo khiếu nại]** gửi lên Super Admin. Super Admin sử dụng công cụ kiểm duyệt độc lập (Text Moderation), xác minh và thực hiện ẩn/xóa bình luận độc hại khỏi hệ thống.
2. **Phát thông báo toàn sàn (Broadcast):** Khi cần bảo trì máy chủ hoặc cập nhật chính sách Chợ Pass sân mới, Super Admin soạn thông báo và phát hành toàn hệ thống tới tất cả người dùng Web/App.
3. **Phát thông báo sự cố sân cục bộ:** Khi trung tâm gặp sự cố bất khả kháng (mất điện, dột nước), Center Manager vào trang trung tâm mình bấm **[Gửi thông báo khẩn cấp]**. Hệ thống tự động lọc danh sách khách hàng có booking trong ngày tại cơ sở đó để gửi cảnh báo sớm.

## 9. Dữ liệu nghiệp vụ và nguồn sự thật

| Nhóm dữ liệu | Nội dung cần quản lý | Nguồn quyết định |
| --- | --- | --- |
| Trung tâm/sân | Thông tin địa điểm, người quản lý được gán, giờ mở cửa, trạng thái sân | Booking Core |
| Bảng giá/báo giá | Khung giá theo ngày/giờ; giá gốc, giảm giá và tổng giá tại lúc chốt | Booking Core |
| Giữ chỗ/phân bổ | Chủ giữ chỗ, sân/slot, thời hạn, trạng thái và mã yêu cầu | Booking Core |
| Booking/chuỗi lịch | Người đặt/khách được đặt hộ, ngày/slot, trạng thái, giá chốt, quan hệ chuỗi và ẩn lịch | Booking Core |
| Danh tính/loyalty | ID, vai trò, điểm tin cậy nếu có; phiên và danh sách khách/quản lý được cấp ngoài | Host/Identity bên ngoài; Core xác minh phần danh tính nhận được |
| Hội thoại AI | Nội dung hội thoại, điều kiện, lựa chọn, xác nhận, yêu cầu đang xử lý, checkpoint và biên nhận tham chiếu | AI service; trạng thái booking cuối vẫn từ Core |
| Dấu sự kiện vận hành | Sự kiện booking đã ghi nhận, request ID, log và chỉ số hệ thống | Core/Gateway/AI theo trách nhiệm tương ứng |

Các ID bên ngoài chỉ là tham chiếu; chưa có đồng bộ hồ sơ khách hàng hoặc dữ liệu MongoDB của hệ thống cũ. Dữ liệu demo/fixture chỉ phục vụ phát triển và kiểm thử, tách biệt với dữ liệu vận hành.

Lưu hội thoại trong database không đồng nghĩa được phép ghi toàn bộ nội dung vào log hoặc gửi mọi dữ liệu cho model. Nội dung cấp cho LLM phải giới hạn theo nhu cầu trích điều kiện; không bao gồm token, secret hoặc quyền ghi tự do.

## 10. Yêu cầu chất lượng và vận hành

| Mã | Yêu cầu nghiệp vụ về chất lượng | Cách đánh giá/trạng thái |
| --- | --- | --- |
| NFR-01 | Dữ liệu booking nhất quán; slot không bị chiếm trùng; chuỗi cố định không được ghi nửa chừng | Integration/UAT đồng thời, rollback và đối chiếu database; đã có xử lý/kiểm thử |
| NFR-02 | Khôi phục thao tác lặp hoặc mất response mà không báo thành công sai | Kiểm thử cùng mã yêu cầu, mất response và replay; còn GAP-02 trên Web đặt ngày |
| NFR-03 | Khách chỉ tác động tài nguyên thuộc quyền; quản lý chỉ tác động trung tâm được giao; hội thoại chỉ thuộc owner | Kiểm thử token thiếu/sai/hết hạn, role, đổi ID và truy cập chéo; cấp phiên thực tế còn GAP-01 |
| NFR-04 | Đặt trực tiếp vẫn dùng được khi AI/model lỗi, miễn Core/Gateway và phiên còn hoạt động | Nghiệm thu riêng luồng Web khi AI không sẵn sàng; cần xác nhận trên môi trường chạy thử |
| NFR-05 | Các yêu cầu quá thời hạn có kết quả lỗi rõ ràng; AI không treo vô hạn hoặc tự xác nhận | Đã có timeout/deadline; thời gian phản hồi p95 và tải mục tiêu chưa được chốt |
| NFR-06 | Có thể nhận biết dịch vụ/DB không sẵn sàng, tra cứu một yêu cầu và đo lỗi/độ trễ/xung đột | Đã có health, metrics, JSON logs và request ID; dashboard/alerting runtime còn thiếu |
| NFR-07 | Không ghi token/key vào source, log hoặc dữ liệu hội thoại; truy cập transcript và metrics được kiểm soát | Đối chiếu redaction/owner/monitoring token; retention và quyền vận hành cần phê duyệt |
| NFR-08 | Có quy trình sao lưu/khôi phục booking và hội thoại phù hợp mức mất dữ liệu/thời gian phục hồi chấp nhận được | RPO/RTO, lịch backup và bằng chứng diễn tập: cần chốt, chưa nghiệm thu |
| NFR-09 | Giao diện booking gốc còn sử dụng được trên kích thước màn hình mục tiêu, lỗi/giá/trạng thái đọc rõ | Component tests và UAT trình duyệt; browser/device hỗ trợ chính thức cần chốt |
| NFR-10 | Mỗi thay đổi có kiểm tra phù hợp trước merge và có thể truy về phiên bản đã bàn giao | Có CI lint/typecheck/unit/contract/integration/build và scan backend; không đồng nghĩa đã có CD hoặc kiểm thử tải |

Logs/metrics sẵn có là nền tảng để giám sát, không phải bằng chứng đã triển khai Prometheus/Grafana/Loki trong môi trường vận hành. Outbox đã lưu sự kiện cùng giao dịch booking; chưa có publisher/broker/consumer để gửi thông báo ra ngoài. Chỉ tiêu phát event chỉ được đặt khi phần tích hợp đó được bổ sung vào phạm vi.

## 11. Phụ thuộc và giả định

| Mã | Phụ thuộc/giả định | Ảnh hưởng nếu chưa đáp ứng |
| --- | --- | --- |
| DEP-01 | Có host/Identity cấp token hợp lệ và session cho Web/Admin; danh tính đáng tin cậy | Người dùng chỉ xem phần công khai, chưa có hành trình xác thực đầy đủ để đặt/quản lý |
| DEP-02 | Host cấp directory khách và người quản lý cho các form liên quan | Dropdown có thể trống; không có nghiệp vụ tự tạo user trong Core |
| DEP-03 | Trung tâm, sân, giờ mở cửa và bảng giá được người có quyền cấu hình chính xác | Tìm kiếm/báo giá phản ánh dữ liệu nhập sai hoặc không có slot hợp lệ |
| DEP-04 | Core và database hoạt động, thời gian hệ thống đúng múi giờ/quy ước | Không thể cam kết tìm/đặt và hết hạn giữ chỗ đúng |
| DEP-05 | Khi dùng model thật, provider hỗ trợ cấu trúc dữ liệu cần thiết và có kết nối/hạn mức phù hợp | Luồng AI có thể lỗi hoặc chậm; fake provider chỉ phù hợp kiểm thử/demo |
| DEP-06 | Có môi trường chạy thử đại diện và người đại diện nghiệp vụ tham gia UAT | Chưa thể chốt hiệu năng, chất lượng hội thoại hoặc phát hành thực tế |
| DEP-07 | Chính sách giá, hủy và quyền quản lý trong bản này được chủ hệ thống chấp thuận | Code hiện tại chỉ là baseline để thảo luận, chưa thay cho phê duyệt nghiệp vụ |

Chưa có tích hợp kiểm tra sự tồn tại/trạng thái tài khoản khách ở Identity khi quản lý đặt hộ. Loyalty của khách được đặt hộ chưa có lookup độc lập; code hiện không tự áp điểm của người quản lý cho khách. Đây là giới hạn tích hợp cần thống nhất khi vận hành thật.

## 12. Tiêu chí nghiệm thu nghiệp vụ

Các tình huống dưới đây là bộ UAT tối thiểu. Một ca có test tự động tương ứng vẫn cần được đối chiếu đúng môi trường, dữ liệu, quyền và kết quả mong đợi. Không đánh dấu toàn bộ BRD “đã nghiệm thu” chỉ vì CI xanh.

| Mã | Yêu cầu liên quan | Tình huống | Kết quả chấp nhận |
| --- | --- | --- | --- |
| AC-01 | FR-01, FR-02 | Khách chưa có phiên mở catalogue/chi tiết và xem lịch một ngày | Xem được dữ liệu công khai; không lộ tên/ID người đặt trong lịch công khai |
| AC-02 | FR-02, FR-05, FR-06 | Khách xác nhận sân còn trống, 19:00–21:00 | Core ghi đúng 2 slot 60 phút của lựa chọn, trả mã confirmed và giá đã chốt |
| AC-03 | FR-06 | Hai khách cùng gửi yêu cầu chiếm cùng một slot | Chỉ một phân bổ còn hiệu lực thành công; yêu cầu còn lại bị từ chối xung đột |
| AC-04 | FR-06 | Xác nhận một giữ chỗ đã hết hạn, hoặc để worker dọn hết hạn | Không tạo booking confirmed; slot được giải phóng và có thể được đặt lại |
| AC-05 | FR-07 | Gửi lại cùng mã/nội dung; sau đó dùng mã đó cho nội dung khác | Cùng ý định trả cùng booking; nội dung khác bị từ chối; phải kiểm tra xuyên Web, không chỉ API |
| AC-06 | FR-08, FR-09 | Chủ booking xem lịch/thống kê; hủy giữ chỗ HELD; mọi vai trò hủy booking CONFIRMED bị chặn 403 | Trạng thái/lịch cập nhật đúng; gọi hủy booking confirmed nhận 403 kèm hướng dẫn Chợ Pass; ẩn không xóa hồ sơ nghiệp vụ |
| AC-07 | FR-09, FR-19 | Quản lý hoặc admin cố gắng hủy booking CONFIRMED | Bị từ chối HTTP 403 Forbidden; hệ thống không hỗ trợ hủy và hoàn tiền đối với confirmed booking |
| AC-08 | FR-03, FR-04, FR-10, FR-19 | Quản lý trung tâm A sửa/xem dữ liệu A rồi thử dữ liệu B | Chỉ A được phép; việc tạo trung tâm/đổi quản lý dành cho super_admin |
| AC-09 | FR-11 | Tạo chuỗi nhiều ngày, một ngày giữa chuỗi đã bị chiếm | Không có booking mới nào của lần tạo chuỗi bị ghi dở; trường hợp không trùng tạo đủ các ngày |
| AC-10 | FR-02, FR-04 | Đổi giá sau khi một hold đã được chốt; thử đóng sân đang có phân bổ tương lai | Giá chốt cũ giữ nguyên; thay đổi trạng thái gây mất phân bổ bị từ chối |
| AC-11 | FR-12, FR-13 | Hội thoại thiếu ngày, sau đó bổ sung và chỉ đổi ngân sách; yêu cầu 90 phút/19:30 | Hỏi thêm đúng phần thiếu, giữ điều kiện khác; không tự làm tròn slot |
| AC-12 | FR-14 | Yêu cầu 2 tiếng, tổng ngân sách cố định; có phương án ghép 2 sân nhưng không có 2 giờ liên tiếp cùng sân | Không đề xuất phương án ghép sai; không tự vượt giá trần hoặc đổi ngày |
| AC-13 | FR-15, FR-16, FR-21 | Chỉ tìm/chọn một phương án; tiếp đó mới xác nhận cuối | Chưa có hold/booking trước xác nhận cuối; sau xác nhận hợp lệ mới có biên nhận Core; UI booking gốc vẫn còn |
| AC-14 | FR-13, FR-17 | Đổi điều kiện, giá thay đổi hoặc slot bị người khác lấy trước xác nhận | Xác nhận cũ không dùng lại được; xin xác nhận giá mới hoặc tìm lại; không báo thành công sai |
| AC-15 | FR-17, FR-18 | Mất response sau khi Core đã ghi booking, tải lại và gửi lại cùng mã lượt | Khôi phục đúng kết quả, không tạo booking thứ hai |
| AC-16 | FR-18, FR-19 | Actor khác, kể cả admin, thử đọc/ghi hội thoại không thuộc mình | Bị từ chối; owner vẫn khôi phục được hội thoại/checkpoint |
| AC-17 | FR-20, FR-SYS02 | Gây lỗi kết nối/timeout trong môi trường kiểm thử | Có mã đối chiếu, log/metric phù hợp; không lộ secret/transcript trong log; không thông báo đặt thành công |
| AC-18 | FR-U01, FR-M04 | Chọn ngày/giờ sát biên UI và giới hạn Core, xem preview rồi tạo lịch | UI/API/preview cùng tuân theo phạm vi đã chốt; đây là ca cần hoàn thiện GAP-03 |
| AC-19 | FR-A01, FR-M01, FR-A04 | Onboarding 2 bước và phân công quản lý cơ sở | Super Admin khởi tạo trung tâm & HĐ SaaS và gán managerId; Center Manager tự cập nhật chi tiết profile, ảnh, bio, tiện ích, số sân, bảng giá và kích hoạt mở bán; Center Manager thử đổi managerId bị từ chối HTTP 403 Forbidden |
| AC-20 | FR-A03, FR-A05 | Quản lý hợp đồng SaaS và tạm dừng trung tâm hết hạn / nợ phí | Super Admin gia hạn hợp đồng thành công; khi cơ sở chuyển isActive: false do nợ phí, Core chặn đứng mọi luồng đặt sân mới |
| AC-21 | FR-M07, FR-A06 | Đề xuất và phê duyệt sự kiện / giải đấu CLB toàn sàn | Center Manager gửi đề xuất sự kiện; bài viết ở trạng thái chờ duyệt và chỉ xuất hiện công khai trên trang chủ sau khi Super Admin bấm duyệt |

**Điều kiện chấp nhận bản bàn giao:** chủ hệ thống xác nhận phạm vi và các quyết định ảnh hưởng P0; các ca liên quan P0 đạt trên môi trường UAT; thiếu hụt P1 có kế hoạch và người chấp thuận; có bằng chứng kiểm thử và danh sách giới hạn còn lại. Phê duyệt chạy production cần thêm DEP-01/02, NFR-05/07/08 và phương án vận hành, không gộp với nghiệm thu demo.

## 13. Khoảng trống so với yêu cầu và mức độ sẵn sàng

| Mã | Hiện trạng xác minh | Việc cần hoàn thiện/chốt | Mức ảnh hưởng |
| --- | --- | --- | --- |
| GAP-01 | Có xác minh token và phân quyền, chưa có Identity/login/refresh trong repo; UI nhận session/directory từ host | Cung cấp và nghiệm thu tích hợp host trước khi chạy với khách thật; không tự mở rộng thành service Identity trong BRD này | P0 cho vận hành thực tế |
| GAP-02 | Hàm Web đặt ngày nhận idempotencyKey nhưng chưa gắn vào header POST; Gateway tạo key mới khi thiếu header | Gửi key ổn định từ Web cho cùng ý định và nghiệm thu AC-05; không kết luận chống tạo trùng đầu-cuối chỉ từ test API. Admin lịch cố định đã gửi header | P0 cho retry đầu-cuối |
| GAP-03 | Core có horizon 90 ngày/giờ cấu hình; date picker Web giới hạn khoảng một tháng, bảng giờ gốc 05–24; preview lịch cố định của adapter dùng cửa sổ 31 ngày | Chốt phạm vi ngày/giờ chung và đồng bộ UI/preview/API; không công bố UI đã hỗ trợ toàn bộ khả năng Core | P1, ảnh hưởng phạm vi thao tác |
| GAP-04 | Có golden giả lập và scenario provider thật giới hạn; chưa có đánh giá hội thoại thật đủ đại diện | Xây bộ đánh giá tiếng Việt, mức đạt và quy trình kiểm tra model trước khi đổi model/phát hành | P1 cho chất lượng AI |
| GAP-05 | Đã có logs/metrics/health/outbox; chưa có stack monitoring, publisher và quy trình backup/restore được nghiệm thu | Chốt nhu cầu vận hành; triển khai phần cần cho chạy thật. Publisher/thông báo chỉ làm khi được bổ sung phạm vi | P1; không phải cam kết chức năng thông báo |
| GAP-06 | Chưa có mục tiêu tải, SLO, RPO/RTO, retention và danh sách thiết bị hỗ trợ được phê duyệt | Chủ hệ thống/người vận hành chốt tiêu chí và tổ chức đo/diễn tập | Cần chốt trước production |

GAP-02 được đối chiếu trực tiếp trong [client đặt ngày Web](../../apps/web/src/features/booking/api/booking_service/rest/booking.js), [HTTP transport Web](../../apps/web/src/shared/api/http.js) và [Gateway booking adapter](../../services/api-gateway/src/modules/booking/booking-adapter.ts). GAP-03 đối chiếu [date picker](../../apps/web/src/features/booking/ui/datepicker.jsx) và cùng adapter. BRD ghi nhận khoảng trống; việc lập tài liệu không sửa code các luồng đó.

## 14. Quyết định nghiệp vụ còn mở

| Mã | Quyết định cần xác nhận | Baseline/đề xuất để xem xét | Người quyết định |
| --- | --- | --- | --- |
| D-01 | AI chỉ tư vấn hay được thực thi đặt sân? | Code hiện tại và kế hoạch hội thoại cho phép gọi Core sau xác nhận cuối. Tài liệu kiến trúc v2 trước đó đề xuất read-only. BRD mô tả baseline đang có, không coi khác biệt này đã được phê duyệt | Chủ hệ thống |
| D-02 | Chính sách hủy booking và Chợ Pass sân | ĐÃ CHỐT: Không cho phép bất kỳ vai trò nào (`user`, `center_manager`, `super_admin`) hủy booking đã CONFIRMED do hệ thống không hỗ trợ hoàn tiền (Core chặn 403 Forbidden); chuyển sang mô hình Chợ Pass Sân (Pass Marketplace) có Escrow; chỉ người dùng được hủy giữ chỗ tạm thời HELD trong 10 phút (`DELETE /reservations/:id`). | Chủ hệ thống / Đã phê duyệt |
| D-03 | Phạm vi ngày/giờ chính thức mà Web/Admin phải hỗ trợ | Khả năng Core tới 90 ngày; giao diện/preview đang hẹp hơn, cần quyết định thống nhất trước nghiệm thu | Chủ hệ thống và nhóm sản phẩm |
| D-04 | Nguồn danh tính, directory khách/quản lý và quy trình cấp/thu hồi quyền | Host/Identity bên ngoài; không sử dụng demo session làm tài khoản khách thật | Chủ hệ thống và phụ trách tích hợp |
| D-05 | Chỉ tiêu vận hành, chi phí LLM và chính sách dữ liệu | Chốt tải, SLO, RPO/RTO, thời gian lưu hội thoại, người được truy cập dữ liệu và hạn mức sử dụng model | Chủ hệ thống/người vận hành |
| D-06 | Thời hạn, ngân sách, người nghiệm thu và các mốc bàn giao | Chưa được cung cấp; không lấy lịch 8 tuần trong kế hoạch tham khảo làm cam kết dự án mới | Chủ hệ thống/nhóm phát triển |
| D-07 | Mô hình kinh doanh & Vận hành Nền tảng (Platform Monetization) | ĐÃ CHỐT: Áp dụng mô hình B2B SaaS Subscription (phần mềm dịch vụ thu phí thuê bao theo tháng/năm thu từ đối tác quản lý cơ sở). Không làm trung gian thu hộ/chi hộ tiền đặt sân giữa khách và chủ sân; quản lý vòng đời hợp đồng B2B gắn liền trực tiếp với trạng thái trung tâm trong Core; duy trì 1 ứng dụng Admin hợp nhất (`apps/admin`) phân quyền RBAC. | Chủ hệ thống / Đã phê duyệt |

Các thay đổi D-01/02/03 cần cập nhật yêu cầu, quy tắc và ca nghiệm thu liên quan trước khi triển khai. Nếu chọn AI read-only, FR-16 và luồng UC-04 phải được thay đổi có chủ đích; không chỉ sửa câu chữ trong tài liệu.

## 15. Thứ tự hoàn thiện và bàn giao

| Giai đoạn | Phạm vi bàn giao | Điều kiện kết thúc |
| --- | --- | --- |
| 1. Chốt baseline nghiệp vụ | BRD, phạm vi Core/AI, vai trò, chính sách đặt/hủy/giá, danh sách quyết định còn mở | Có chủ thể phê duyệt và quyết định cho các yêu cầu P0 |
| 2. Nghiệm thu luồng chính | Booking trực tiếp, lịch cố định, AI, lịch sử và phân quyền; xử lý GAP-02/03 theo phạm vi chốt | Các ca UAT tương ứng đạt, CI đạt và giữ đúng UI gốc |
| 3. Chạy thử với người dùng đại diện | Session/directory thật, cấu hình trung tâm đúng, provider AI và bộ hội thoại đánh giá | Có phản hồi thực tế, kết quả đo và danh sách lỗi được phân loại |
| 4. Chuẩn bị vận hành | Secret/môi trường, monitoring, backup/restore, hỗ trợ sự cố và chính sách dữ liệu | Đạt checklist vận hành do người phụ trách phê duyệt; không coi Compose demo là production |

Không gán ngày kết thúc, ngân sách hoặc phân công tên người khi chưa có dữ liệu. Nhóm 5 người có thể chia công việc theo Booking Core, AI, Web/Admin, tích hợp và chất lượng/vận hành; đây là gợi ý tổ chức, không phải thay đổi quyền repository hoặc phân công chính thức.

## 16. Truy vết yêu cầu và tài liệu tham chiếu

### 16.1. Liên kết mục tiêu, chức năng và nghiệm thu

| Mục tiêu | Yêu cầu chức năng | Quy tắc trọng tâm | Nghiệm thu |
| --- | --- | --- | --- |
| OBJ-01 | FR-02, FR-04, FR-05, FR-06, FR-07, FR-09 | BR-01–16 | AC-02–05, AC-09–10 |
| OBJ-02 | FR-01, FR-05, FR-08, FR-09, FR-19, FR-21 | BR-03, BR-12–14, BR-22 | AC-01–02, AC-05–07, AC-13, AC-18 |
| OBJ-03 | FR-03, FR-04, FR-10, FR-11 | BR-05, BR-08, BR-15–16 | AC-08–10, AC-18 |
| OBJ-04 | FR-12–18 | BR-01–02, BR-17–21 | AC-11–16 |
| OBJ-05 | FR-07, FR-17–20 | BR-09–14, BR-20–22 | AC-04–05, AC-07–08, AC-14–17 |

### 16.2. Nguồn trong repository

| Tài liệu/nguồn | Nội dung đối chiếu |
| --- | --- |
| [README](../../README.md) | Phạm vi ứng dụng và cách chạy; phần mô tả nhánh trong README có thể phản ánh lịch sử trước merge |
| [BOOKING_CORE](BOOKING_CORE.md) | Quy tắc đặt sân, giữ chỗ, giá, phân quyền và transaction |
| [API_GATEWAY](API_GATEWAY.md) | Giữ hợp đồng UI gốc, danh tính, quyền và giới hạn adapter |
| [AI_SERVICE](AI_SERVICE.md) | Hội thoại, ràng buộc, xác nhận cuối, phục hồi, tìm kiếm và giới hạn AI |
| [LEGACY_UI](LEGACY_UI.md), [provenance](legacy-ui-provenance.json) | Nguồn và phạm vi màn hình Web/Admin được giữ |
| [ARCHITECTURE](ARCHITECTURE.md) | Ranh giới sở hữu dữ liệu và trách nhiệm các thành phần |
| [MONITORING](MONITORING.md) | Instrumentation hiện có và các thành phần vận hành chưa triển khai |
| [VALIDATION](VALIDATION.md), [CI](CI.md) | Bằng chứng kiểm tra và cách chạy gate; không thay thế biên bản UAT |
| [Domain Core](../../services/booking-core/src/common/domain/calendar.ts), [Reservations](../../services/booking-core/src/modules/reservations/reservations.service.ts), [Booking commands](../../services/booking-core/src/modules/bookings/bookings-command.service.ts) | Thời gian, giới hạn, giữ chỗ, xác nhận/hủy/ẩn |
| [Domain AI](../../services/ai-service/app/domain.py), [Conversation service](../../services/ai-service/app/service.py) | Kiểm tra điều kiện, tìm phương án, quyền xác nhận và phục hồi hội thoại |

Khi tài liệu mô tả chưa khớp code, cột hiện trạng và GAP phải nêu khác biệt, không tự sửa yêu cầu để hợp thức hóa một thiếu hụt triển khai. Đổi quy tắc kinh doanh vẫn cần chủ thể có thẩm quyền chấp thuận.

### 16.3. Nguồn và quyết định trong trao đổi dự án

- Repo nguồn: [Badminton_manager_microservices tại commit 484d381e873f513ed4faa4413407502112f4885d](https://github.com/chiendz11/Badminton_manager_microservices/tree/484d381e873f513ed4faa4413407502112f4885d), dùng để kế thừa UI và nghiệp vụ liên quan.
- Quyết định phạm vi mới nhất trong trao đổi: chỉ giữ Booking Core và AI; giữ UI booking gốc, loại pass/payment/login và các miền UI/API ngoài phạm vi.
- Tài liệu người dùng cung cấp: Ke_hoach_Chatbot_Conversational_Planning_Execution.md, dùng cho hành trình hội thoại/lập kế hoạch/thực thi; các ví dụ slot 30 phút được thay bằng 60 phút.
- Tài liệu người dùng cung cấp: kien_truc_va_trien_khai_badminton_manager_v2.md, dùng tham chiếu ranh giới và định hướng kiến trúc; không nhập toàn bộ các service đề xuất vào phạm vi bản này. Khác biệt AI read-only được giữ thành D-01.
- Hai tài liệu người dùng cung cấp nằm ngoài repository tại thời điểm lập BRD. Nội dung hướng dẫn/lộ trình trong đó được xem là tài liệu tham khảo, không tự tạo thêm yêu cầu triển khai hoặc cam kết kinh doanh.

## 17. Thuật ngữ

| Thuật ngữ | Ý nghĩa trong BRD |
| --- | --- |
| BRD | Tài liệu yêu cầu nghiệp vụ, nêu nhu cầu, phạm vi, quy tắc và tiêu chí chấp nhận |
| Booking Core | Khối nghiệp vụ trung tâm/sân/giá/lịch trống/giữ chỗ/booking và nguồn sự thật của lịch đặt |
| Slot | Một khoảng chơi dài 60 phút tại một sân vào một ngày |
| Reservation/hold | Giữ chỗ tạm có hạn, chưa phải booking confirmed |
| Booking confirmed | Đơn đặt sân đã được hệ thống ghi nhận; không chứng minh đã trả tiền |
| Lịch cố định/series | Nhóm booking nhiều ngày được tạo theo một yêu cầu của quản lý |
| Quote | Báo giá gồm giá gốc, giảm giá và tổng giá; được chốt khi giữ chỗ |
| Idempotency | Gửi lại cùng một ý định với cùng mã yêu cầu không tạo thêm kết quả nghiệp vụ |
| Điều kiện cứng/mềm | Điều kiện bắt buộc phải giữ / ưu tiên được phép điều chỉnh trong giới hạn đã đồng ý |
| Xác nhận cuối/consent | Đồng ý cho hệ thống đặt phương án cụ thể đang còn hiệu lực |
| Checkpoint | Trạng thái hội thoại được lưu để tiếp tục/khôi phục xử lý |
| Outbox | Dấu sự kiện ghi cùng giao dịch booking, chờ tích hợp phát ra ngoài nếu có |
| UAT | Kiểm thử chấp nhận bởi người đại diện nghiệp vụ/người dùng |
| SLO | Mục tiêu chất lượng vận hành được thống nhất; chưa có giá trị được phê duyệt trong BRD này |
| RPO/RTO | Mức mất dữ liệu tối đa/thời gian phục hồi chấp nhận được, cần xác định cho môi trường chạy thật |

## 18. Phê duyệt và kiểm soát thay đổi

| Vai trò phê duyệt | Họ tên | Kết quả/ngày phê duyệt |
| --- | --- | --- |
| Chủ hệ thống/đại diện nghiệp vụ | Chưa chỉ định | Chờ xem xét |
| Đại diện vận hành trung tâm | Chưa chỉ định | Chờ xem xét |
| Đại diện phát triển/kiểm thử | Chưa chỉ định | Chờ xem xét |
| Người phụ trách vận hành/dữ liệu | Chưa chỉ định | Chờ xem xét |

Mỗi lần đổi phạm vi, slot, giá, chính sách hủy, quyền hoặc khả năng ghi booking của AI phải cập nhật phiên bản BRD, mã yêu cầu/quy tắc/ca nghiệm thu bị ảnh hưởng và kết quả phê duyệt. Thay đổi tài liệu không tự triển khai chức năng, di chuyển dữ liệu hoặc thay đổi cấu hình production.

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| 1.0 | 18/10/2026 | Lập BRD theo baseline Booking Core + AI, UI gốc, quy tắc slot 60 phút; ghi riêng khoảng trống và quyết định chưa chốt |
| 1.1 | 09/11/2026 | Chuẩn hóa chính sách hủy booking nghiêm ngặt (Strict Cancellation Policy): Chặn 403 Forbidden cho mọi vai trò, chỉ giữ hủy giữ chỗ HELD cho user |
| 2.0 | 09/11/2026 | Tái cấu trúc toàn diện theo 3 Actor nghiệp vụ (user, center_manager, super_admin); bổ sung mô hình kinh doanh B2B SaaS Subscription (Hợp đồng thuê bao cơ sở); chuẩn hóa quy trình thẩm định duyệt Sự kiện / Giải đấu CLB và Thông báo hệ thống |
