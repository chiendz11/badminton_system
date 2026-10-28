# BRD — Hệ thống badminton_system

## 1. Thông tin và cách sử dụng tài liệu

| Thuộc tính | Nội dung |
| --- | --- |
| Loại tài liệu | Business Requirements Document — Tài liệu yêu cầu nghiệp vụ |
| Phiên bản | 1.0 |
| Ngày lập | 18/10/2026, múi giờ Việt Nam |
| Trạng thái | Dự thảo để chủ hệ thống và nhóm phát triển xem xét; chưa phải biên bản nghiệm thu |
| Hệ thống | badminton_system |
| Phạm vi phiên bản | Booking Core và AI service; Web/Admin kế thừa giao diện booking từ repo gốc; API Gateway phục vụ tích hợp |
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
| OBJ-02 | Khách tự tìm, đặt, xem và hủy lịch thuộc quyền của mình | Hoàn thành các kịch bản Web và kiểm tra quyền sở hữu |
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

## 4. Bên liên quan và vai trò

| Bên liên quan | Trách nhiệm/lợi ích |
| --- | --- |
| Chủ hệ thống/đại diện nghiệp vụ | Chốt phạm vi, chính sách giá/hủy, chỉ tiêu chất lượng và phê duyệt nghiệm thu |
| Khách đặt sân | Tìm khung giờ phù hợp, xác nhận lựa chọn, theo dõi lịch và hủy theo quy định |
| Quản lý trung tâm | Quản lý lịch, sân và bảng giá của trung tâm được phân công; tạo lịch cố định cho khách |
| Quản trị hệ thống | Quản lý các trung tâm, phân công quản lý và thực hiện quyền quản trị toàn hệ thống |
| Nhóm phát triển/kiểm thử | Xây dựng, kiểm tra yêu cầu, ghi nhận thiếu hụt và duy trì hợp đồng tích hợp |
| Người vận hành kỹ thuật | Quản lý môi trường, theo dõi lỗi, sao lưu/khôi phục và bảo vệ dữ liệu |
| Hệ thống cấp danh tính bên ngoài | Cấp phiên/token và thông tin chọn khách/quản lý; chưa được triển khai thành Identity service trong repo này |
| Nhà cung cấp LLM | Cung cấp khả năng xử lý ngôn ngữ; không quyết định quyền hoặc nguồn sự thật về lịch sân |

### 4.1. Ma trận quyền nghiệp vụ

Tên vai trò hiện tại: khách đã có phiên là **user**, quản lý là **center_manager**, quản trị là **super_admin**.

| Thao tác | Chưa có phiên | user | center_manager | super_admin |
| --- | --- | --- | --- | --- |
| Xem danh sách trung tâm và lịch trống công khai | Có | Có | Có | Có |
| Đặt ngày, xem/hủy/ẩn lịch cá nhân | Không | Booking của mình | Booking của mình | Booking của mình |
| Đọc lịch/booking phục vụ quản lý | Không | Không | Trung tâm được giao | Mọi trung tâm |
| Sửa thông tin trung tâm, sân, bảng giá | Không | Không | Trung tâm được giao, trừ đổi người quản lý | Mọi trung tâm |
| Tạo trung tâm/phân công quản lý | Không | Không | Không | Có |
| Tạo lịch cố định cho khách | Không | Không | Trung tâm được giao | Mọi trung tâm |
| Hủy booking theo quyền quản lý, trước giờ bắt đầu | Không | Chỉ booking của mình | Trung tâm được giao | Mọi trung tâm |
| Dùng AI để tìm/đặt cho chính mình | Không | Có | Có | Có |
| Đọc/ghi hội thoại AI của người khác | Không | Không | Không | Không |

Vai trò và thông tin hiển thị trong browser không tự cấp quyền. Mọi quyền tác động dữ liệu phải được backend kiểm tra từ danh tính đã xác minh và quan hệ với tài nguyên.

## 5. Phạm vi

### 5.1. Trong phạm vi phiên bản hiện tại

| Nhóm | Nội dung |
| --- | --- |
| Danh mục sân | Trung tâm, sân, địa chỉ/thông tin mô tả, tiện ích, trạng thái hoạt động, giờ mở cửa và bảng giá |
| Đặt sân theo ngày | Lịch trống, chọn sân/slot, báo giá, giữ chỗ có hạn, xác nhận, tra cứu và hủy |
| Lịch cố định | Quản lý chọn khách và lịch nhiều ngày; kiểm tra toàn chuỗi; tạo toàn bộ hoặc từ chối toàn bộ |
| Lịch sử/thống kê booking | Xem/lọc lịch cá nhân, thống kê hoạt động, ẩn booking đủ điều kiện; quản lý xem booking theo quyền |
| Trợ lý AI | Tiếng Việt nhiều lượt, thu thập điều kiện, tìm phương án từ Core, lập lại kế hoạch, chọn, xác nhận cuối và lấy biên nhận |
| Giao diện | Giữ JSX/CSS/bố cục booking gốc của Web/Admin; thêm trang AI theo kế hoạch hội thoại |
| Kiểm soát và vận hành | Kiểm tra quyền, bảo vệ thao tác lặp, lưu dấu sự kiện nghiệp vụ, logs/metrics/health và kiểm thử |
| Tích hợp | Gateway nối Web/Admin với Booking Core và AI; AI gọi API Core theo danh sách công cụ cho phép |

Booking Core là nơi quyết định lịch trống, quyền tác động booking và giá cuối. AI lưu hội thoại/trạng thái xử lý riêng; không trực tiếp sửa database booking.

### 5.2. Ngoài phạm vi

- Pass/nhượng sân, chuyển quyền sở hữu booking, marketplace và hoàn tiền.
- Payment gateway, thu tiền, ví, đối soát, hóa đơn thuế và xác nhận đã thanh toán.
- Đăng ký/đăng nhập, OAuth, quên mật khẩu, refresh/logout/revocation và hệ thống quản lý tài khoản độc lập.
- Kho hàng, bán hàng, báo cáo thương mại; tin tức, đánh giá; bạn bè/chat xã hội; thông báo email/SMS/push.
- Storage service và upload ảnh; dữ liệu ảnh có sẵn chỉ là metadata/tài nguyên phục vụ giao diện.
- Giải đấu, thời tiết, định vị GPS và tính khoảng cách thực tế.
- Fine-tune model, RAG/FAQ có nguồn tri thức riêng, vector database và thuật toán tối ưu mới.
- Di chuyển database/người dùng thật từ repo cũ; seed demo không phải migration dữ liệu kinh doanh.
- Cam kết đã triển khai production hoặc đã có một stack monitoring hoàn chỉnh.

Màn hình Admin có tên kế thừa “Đơn hàng/Hóa đơn” chỉ quản lý booking và giá trị đặt sân. Booking confirmed không đồng nghĩa đã thu tiền; tổng giá booking không được trình bày như doanh thu đã thu.

## 6. Yêu cầu chức năng

Ưu tiên: **P0** là điều kiện bắt buộc cho luồng đúng và an toàn; **P1** là chức năng cần có trong phạm vi bàn giao; **P2** là cải thiện sau khi luồng chính được nghiệm thu. Trạng thái “Có” không tự thay thế quyết định nghiệm thu.

### 6.1. Catalogue, giá và quản lý trung tâm

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-01 | Người dùng xem danh sách/chi tiết trung tâm, sân, thông tin địa điểm, tiện ích và lịch trống theo ngày | P1 | Có |
| FR-02 | Hiển thị mức giá theo ngày thường/cuối tuần và khung giờ; giá chốt phải do Core tính từ dữ liệu tin cậy | P0 | Có |
| FR-03 | Quản trị tạo trung tâm và phân công quản lý; quản lý sửa cấu hình trong phạm vi được giao | P1 | Có; directory danh tính do host cấp |
| FR-04 | Quản lý số sân/trạng thái/giá và bảo vệ những booking còn hiệu lực khi thay đổi cấu hình | P0 | Có; cần giữ UI và giờ cấu hình nhất quán, xem GAP-03 |

### 6.2. Booking và lịch cá nhân

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-05 | Khách chọn một hoặc nhiều sân/slot cùng trung tâm, cùng ngày, xem tóm tắt rồi xác nhận đặt | P0 | Có |
| FR-06 | Giữ chỗ có hạn, ngăn chiếm trùng và giải phóng giữ chỗ hết hạn/hủy | P0 | Có ở Core; Web trực tiếp reserve rồi confirm trong một lần xác nhận, không có màn hình hold riêng |
| FR-07 | Một ý định đặt được gửi lại với cùng mã yêu cầu phải trả cùng kết quả, không tạo đơn mới | P0 | Một phần; Core/Gateway và AI hỗ trợ, client đặt ngày còn GAP-02 |
| FR-08 | Chủ booking xem lịch sử, lọc, xem chi tiết và thống kê booking của mình | P1 | Có |
| FR-09 | Hủy booking trước giờ bắt đầu; giải phóng lịch; cho phép ẩn booking đã hủy/đã kết thúc nhưng giữ hồ sơ nghiệp vụ | P0 | Có |
| FR-10 | Quản lý xem booking và trạng thái sân thuộc trung tâm được giao; quản trị xem toàn bộ | P1 | Có |
| FR-11 | Quản lý tạo lịch cố định cho khách từ directory host, xem lịch khả dụng và tạo chuỗi nguyên vẹn | P1 | Có; giới hạn preview/UI cần thống nhất theo GAP-03 |

### 6.3. Trợ lý hội thoại

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-12 | Nhận tiếng Việt, trích ngày, giờ/khoảng giờ bắt đầu, thời lượng, khu vực và tổng ngân sách; hỏi lại thông tin thiếu/mơ hồ | P1 | Có; chất lượng model thật còn cần đánh giá |
| FR-13 | Giữ điều kiện không đổi qua nhiều lượt; cho sửa/bỏ điều kiện; vô hiệu lựa chọn/xác nhận cũ khi yêu cầu thay đổi | P0 | Có |
| FR-14 | Tìm phương án dựa trên lịch/giá của Core; phân biệt điều kiện bắt buộc và ưu tiên có thể nới | P0 | Có; có giới hạn số trung tâm được tìm |
| FR-15 | Trình bày sân/ngày/giờ/thời lượng/tổng giá; chọn phương án chỉ mở bước xác nhận, chưa tạo giữ chỗ hoặc booking | P0 | Có |
| FR-16 | Chỉ đặt sau xác nhận cuối hợp lệ; chỉ báo thành công khi Core trả booking confirmed và mã booking | P0 | Có theo code hiện tại; chính sách AI cần chốt ở D-01 |
| FR-17 | Khi xung đột, đổi giá hoặc timeout, phản hồi đúng trạng thái; không âm thầm thay điều kiện hoặc tạo đơn khác | P0 | Có; cần nghiệm thu thêm với provider thật |
| FR-18 | Lưu và khôi phục hội thoại/yêu cầu chưa rõ kết quả; chỉ chủ hội thoại được đọc/ghi lịch sử và trace | P0 | Có; chính sách lưu giữ chưa chốt |

### 6.4. Tích hợp và vận hành

| Mã | Yêu cầu | Ưu tiên | Trạng thái đối chiếu |
| --- | --- | --- | --- |
| FR-19 | Bảo vệ thao tác bằng danh tính đã xác minh, vai trò và quyền sở hữu/phân công trung tâm | P0 | Có phần xác minh/quyền; cấp và quản lý phiên nằm ngoài repo, xem GAP-01 |
| FR-20 | Có mã đối chiếu yêu cầu, logs/metrics/health và dấu sự kiện booking phục vụ điều tra sự cố | P1 | Có instrumentation/outbox; chưa có stack monitoring hoặc publisher |
| FR-21 | Giữ giao diện booking gốc trong Web/Admin, chỉ hiện chức năng thuộc Booking Core và AI | P1 | Có; nguồn UI ghi trong legacy-ui-provenance.json |

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
| BR-13 | Booking confirmed chỉ được hủy trước slot bắt đầu sớm nhất. Chủ booking hoặc quản lý có quyền tài nguyên mới được hủy; không có phí hủy/hoàn tiền trong phiên bản này. |
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

Sau khi đã confirm, việc hủy booking dùng nghiệp vụ hủy booking. Không dùng thao tác bỏ giữ chỗ để thay thế. Hội thoại AI lưu trạng thái kế hoạch/lựa chọn/xác nhận/biên nhận riêng, không phải nguồn thay thế trạng thái booking tại Core.

## 8. Luồng nghiệp vụ chính

### UC-01 — Tìm và đặt sân trực tiếp

**Tác nhân:** khách có phiên hợp lệ. **Liên quan:** FR-01, FR-02, FR-05, FR-06, FR-07.

1. Khách xem trung tâm, chọn ngày và tải lịch trống.
2. Khách chọn sân/slot; giao diện hiển thị thời lượng và giá dự kiến.
3. Khách xem tóm tắt rồi xác nhận trên modal.
4. Gateway yêu cầu Core giữ chỗ và xác nhận; Core kiểm tra lại quyền, thời gian, giá và slot trong lúc ghi dữ liệu.
5. Thành công: trả mã booking confirmed, cập nhật lịch và cho khách xem lịch sử.

**Ngoại lệ:** slot vừa bị người khác lấy thì báo xung đột và tải lại lịch; giữ chỗ hết hạn thì chọn lại; mất kết quả thì phải tra cứu/gửi lại đúng ý định với cùng mã yêu cầu. Lịch trống lúc xem không phải cam kết giữ sân. Điểm gửi lại từ Web còn thiếu ở GAP-02.

### UC-02 — Xem, hủy và ẩn booking cá nhân

**Tác nhân:** chủ booking; người quản lý có thể hủy theo quyền tài nguyên nhưng không ẩn lịch cá nhân của khách. **Liên quan:** FR-08, FR-09, FR-19.

1. Khách mở lịch sử, lọc theo điều kiện được hỗ trợ và chọn booking.
2. Nếu chưa tới giờ bắt đầu, khách yêu cầu hủy và xác nhận thao tác.
3. Core hủy booking, giải phóng slot và lưu dấu sự kiện; danh sách phản ánh trạng thái mới.
4. Với booking đã hủy hoặc đã kết thúc toàn bộ giờ chơi, khách có thể xác nhận ẩn khỏi lịch cá nhân.

**Ngoại lệ:** sai chủ/quyền thì từ chối; booking đã bắt đầu thì không cho hủy theo chính sách hiện tại. Không phát sinh thu tiền hoặc hoàn tiền.

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

### UC-05 — Thay đổi trung tâm, sân và bảng giá

**Tác nhân:** quản lý có quyền trung tâm hoặc quản trị. **Liên quan:** FR-02, FR-03, FR-04.

1. Người quản lý mở form gốc, sửa thông tin/sân/bảng giá.
2. Backend kiểm tra quyền và tính đầy đủ/hợp lệ của bảng giá.
3. Nếu thay đổi làm đóng/mất sân có phân bổ tương lai còn hiệu lực, hệ thống từ chối và nêu lý do.
4. Với thay đổi hợp lệ, cập nhật nhất quán; báo giá đã chốt trước đó được giữ nguyên.

Chỉ quản trị được tạo trung tâm hoặc đổi người quản lý. Phiên bản này không có bước upload ảnh; chỉnh thông tin không được làm mất metadata ảnh cũ.

### UC-06 — Tiếp nhận sự cố và phục hồi

**Tác nhân:** khách, quản lý và người vận hành. **Liên quan:** FR-07, FR-17, FR-20.

1. UI trả kết quả hoặc lỗi có mã yêu cầu để đối chiếu.
2. Nếu chưa rõ đã đặt thành công hay chưa, người dùng kiểm tra lịch/biên nhận và gửi lại cùng yêu cầu; không tạo một ý định đặt khác ngay.
3. Người vận hành dùng request ID để đối chiếu log của Gateway/AI/Core và tình trạng kết nối database.
4. Khi xác định kết quả, trả đúng mã booking/trạng thái hoặc cho phép chọn lại nếu chưa có booking hợp lệ.

Không thông báo đặt thành công dựa riêng vào lời model, HTTP timeout hoặc một giữ chỗ chưa confirmed.

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
| AC-06 | FR-08, FR-09 | Chủ booking xem lịch/thống kê, hủy trước giờ bắt đầu và ẩn sau hủy | Trạng thái/lịch cập nhật đúng; ẩn không xóa hồ sơ nghiệp vụ; không phát sinh hoàn tiền |
| AC-07 | FR-09, FR-19 | Khách đổi ID để đọc/hủy/ẩn booking người khác; hủy booking đã bắt đầu | Truy cập trái quyền và hủy quá thời điểm cho phép đều bị từ chối |
| AC-08 | FR-03, FR-04, FR-10, FR-19 | Quản lý trung tâm A sửa/xem dữ liệu A rồi thử dữ liệu B | Chỉ A được phép; việc tạo trung tâm/đổi quản lý dành cho super_admin |
| AC-09 | FR-11 | Tạo chuỗi nhiều ngày, một ngày giữa chuỗi đã bị chiếm | Không có booking mới nào của lần tạo chuỗi bị ghi dở; trường hợp không trùng tạo đủ các ngày |
| AC-10 | FR-02, FR-04 | Đổi giá sau khi một hold đã được chốt; thử đóng sân đang có phân bổ tương lai | Giá chốt cũ giữ nguyên; thay đổi trạng thái gây mất phân bổ bị từ chối |
| AC-11 | FR-12, FR-13 | Hội thoại thiếu ngày, sau đó bổ sung và chỉ đổi ngân sách; yêu cầu 90 phút/19:30 | Hỏi thêm đúng phần thiếu, giữ điều kiện khác; không tự làm tròn slot |
| AC-12 | FR-14 | Yêu cầu 2 tiếng, tổng ngân sách cố định; có phương án ghép 2 sân nhưng không có 2 giờ liên tiếp cùng sân | Không đề xuất phương án ghép sai; không tự vượt giá trần hoặc đổi ngày |
| AC-13 | FR-15, FR-16, FR-21 | Chỉ tìm/chọn một phương án; tiếp đó mới xác nhận cuối | Chưa có hold/booking trước xác nhận cuối; sau xác nhận hợp lệ mới có biên nhận Core; UI booking gốc vẫn còn |
| AC-14 | FR-13, FR-17 | Đổi điều kiện, giá thay đổi hoặc slot bị người khác lấy trước xác nhận | Xác nhận cũ không dùng lại được; xin xác nhận giá mới hoặc tìm lại; không báo thành công sai |
| AC-15 | FR-17, FR-18 | Mất response sau khi Core đã ghi booking, tải lại và gửi lại cùng mã lượt | Khôi phục đúng kết quả, không tạo booking thứ hai |
| AC-16 | FR-18, FR-19 | Actor khác, kể cả admin, thử đọc/ghi hội thoại không thuộc mình | Bị từ chối; owner vẫn khôi phục được hội thoại/checkpoint |
| AC-17 | FR-20 | Gây lỗi kết nối/timeout trong môi trường kiểm thử | Có mã đối chiếu, log/metric phù hợp; không lộ secret/transcript trong log; không thông báo đặt thành công |
| AC-18 | FR-01, FR-04, FR-05, FR-11 | Chọn ngày/giờ sát biên UI và giới hạn Core, xem preview rồi tạo lịch | UI/API/preview cùng tuân theo phạm vi đã chốt; đây là ca cần hoàn thiện GAP-03 |

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

GAP-02 được đối chiếu trực tiếp trong [client đặt ngày Web](../apps/web/src/features/booking/api/booking_service/rest/booking.js), [HTTP transport Web](../apps/web/src/shared/api/http.js) và [Gateway booking adapter](../services/api-gateway/src/modules/booking/booking-adapter.ts). GAP-03 đối chiếu [date picker](../apps/web/src/features/booking/ui/datepicker.jsx) và cùng adapter. BRD ghi nhận khoảng trống; việc lập tài liệu không sửa code các luồng đó.

## 14. Quyết định nghiệp vụ còn mở

| Mã | Quyết định cần xác nhận | Baseline/đề xuất để xem xét | Người quyết định |
| --- | --- | --- | --- |
| D-01 | AI chỉ tư vấn hay được thực thi đặt sân? | Code hiện tại và kế hoạch hội thoại cho phép gọi Core sau xác nhận cuối. Tài liệu kiến trúc v2 trước đó đề xuất read-only. BRD mô tả baseline đang có, không coi khác biệt này đã được phê duyệt | Chủ hệ thống |
| D-02 | Giữ hay thay chính sách loyalty/giảm nhiều sân và chính sách hủy? | Baseline BR-07 và BR-13; chưa có phí hủy hoặc thu tiền. Cần xác nhận nguồn điểm và cách áp dụng khi đặt hộ | Chủ hệ thống/đại diện trung tâm |
| D-03 | Phạm vi ngày/giờ chính thức mà Web/Admin phải hỗ trợ | Khả năng Core tới 90 ngày; giao diện/preview đang hẹp hơn, cần quyết định thống nhất trước nghiệm thu | Chủ hệ thống và nhóm sản phẩm |
| D-04 | Nguồn danh tính, directory khách/quản lý và quy trình cấp/thu hồi quyền | Host/Identity bên ngoài; không sử dụng demo session làm tài khoản khách thật | Chủ hệ thống và phụ trách tích hợp |
| D-05 | Chỉ tiêu vận hành, chi phí LLM và chính sách dữ liệu | Chốt tải, SLO, RPO/RTO, thời gian lưu hội thoại, người được truy cập dữ liệu và hạn mức sử dụng model | Chủ hệ thống/người vận hành |
| D-06 | Thời hạn, ngân sách, người nghiệm thu và các mốc bàn giao | Chưa được cung cấp; không lấy lịch 8 tuần trong kế hoạch tham khảo làm cam kết dự án mới | Chủ hệ thống/nhóm phát triển |

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
| [README](../README.md) | Phạm vi ứng dụng và cách chạy; phần mô tả nhánh trong README có thể phản ánh lịch sử trước merge |
| [BOOKING_CORE](BOOKING_CORE.md) | Quy tắc đặt sân, giữ chỗ, giá, phân quyền và transaction |
| [API_GATEWAY](API_GATEWAY.md) | Giữ hợp đồng UI gốc, danh tính, quyền và giới hạn adapter |
| [AI_SERVICE](AI_SERVICE.md) | Hội thoại, ràng buộc, xác nhận cuối, phục hồi, tìm kiếm và giới hạn AI |
| [LEGACY_UI](LEGACY_UI.md), [provenance](legacy-ui-provenance.json) | Nguồn và phạm vi màn hình Web/Admin được giữ |
| [ARCHITECTURE](ARCHITECTURE.md) | Ranh giới sở hữu dữ liệu và trách nhiệm các thành phần |
| [MONITORING](MONITORING.md) | Instrumentation hiện có và các thành phần vận hành chưa triển khai |
| [VALIDATION](VALIDATION.md), [CI](CI.md) | Bằng chứng kiểm tra và cách chạy gate; không thay thế biên bản UAT |
| [Domain Core](../services/booking-core/src/common/domain/calendar.ts), [Reservations](../services/booking-core/src/modules/reservations/reservations.service.ts), [Booking commands](../services/booking-core/src/modules/bookings/bookings-command.service.ts) | Thời gian, giới hạn, giữ chỗ, xác nhận/hủy/ẩn |
| [Domain AI](../services/ai-service/app/domain.py), [Conversation service](../services/ai-service/app/service.py) | Kiểm tra điều kiện, tìm phương án, quyền xác nhận và phục hồi hội thoại |

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
