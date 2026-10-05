import React from "react";
import { Link } from "react-router-dom";
import "../../../shared/styles/policy.css";
import Header from "../../../shared/ui/Header.jsx";
import Footer from "../../../shared/ui/Footer.jsx";

const Policy = () => {
  return (
    <>
      <Header />
      <div className="policy-page">
        <div className="container">
          <div className="policy-content">
            <section className="policy-section">
              <h2>1. Mục đích thu thập thông tin cá nhân</h2>
              <p>
                Thông tin cá nhân thu thập được sẽ chỉ được sử dụng trong nội bộ
                công ty. "Thông tin cá nhân" có nghĩa là thông tin về khách hàng
                mà dựa vào đó có thể xác định danh tính của khách hàng, bao gồm,
                nhưng không giới hạn, tên, số chứng minh thư, số giấy khai sinh,
                số hộ chiếu, quốc tịch, địa chỉ, số điện thoại, ngày tháng năm
                sinh, các chi tiết về thẻ tín dụng hoặc thẻ ghi nợ, chủng tộc,
                giới tính, ngày sinh, địa chỉ thư điện tử, bất kỳ thông tin gì
                về khách hàng mà khách hàng đã cung cấp cho Công ty trong các
                mẫu đơn đăng ký, đơn xin hoặc bất kỳ mẫu đơn tương tự nào
                và/hoặc bất kỳ thông tin gì về khách hàng mà đã được hoặc có thể
                thu thập, lưu trữ, sử dụng và xử lý bởi Công ty theo thời gian
                và bao gồm các thông tin cá nhân nhạy cảm như dữ liệu liên quan
                đến sức khỏe, tôn giáo hay tín ngưỡng tương tự khác.
              </p>

              <p>
                Khi Thành viên đăng ký tài khoản trên nền tảng đặt sân trực
                tuyến Datsan247, Công ty có thể sử dụng và xử lý Thông tin Cá
                nhân của khách hàng cho việc kinh doanh và các hoạt động của
                Công ty, bao gồm, nhưng không giới hạn, các mục đích sau đây:
              </p>

              <ul className="policy-list">
                <li>
                  Chuyển tiếp đơn hàng từ Thành viên đến các cơ sở thể thao đối
                  tác nơi mà Thành viên đặt lịch chơi thể thao;
                </li>
                <li>Thông báo về việc đặt lịch và hỗ trợ khách hàng;</li>
                <li>Xác minh sự tin cậy của Thành viên;</li>
                <li>
                  Cung cấp cổng thanh toán với các thông tin cần thiết để thực
                  hiện các giao dịch nếu Thành viên lựa chọn hình thức thanh
                  toán trực tuyến;
                </li>
                <li>
                  Để xác nhận và/hoặc xử lý các khoản thanh toán theo Thỏa
                  thuận;
                </li>
                <li>
                  Để thực hiện các nghĩa vụ của Công ty đối với bất kỳ hợp đồng
                  nào đã ký kết với khách hàng;
                </li>
                <li>Để cung cấp cho khách hàng các dịch vụ theo Thỏa thuận;</li>
                <li>
                  Để xử lý việc tham gia của khách hàng trong bất kỳ sự kiện,
                  chương trình khuyến mãi, hoạt động, các nghiên cứu, cuộc thi,
                  chương trình khuyến mãi, các cuộc điều tra thăm dò, khảo sát
                  hoặc các hoạt động khác và để liên lạc với khách hàng về sự
                  tham gia của khách hàng tại đây;
                </li>
                <li>
                  Để xử lý, quản lý, hoặc kiểm chứng yêu cầu sử dụng Dịch vụ của
                  khách hàng theo Thỏa thuận;
                </li>
                <li>
                  Để phát triển, tăng cường và cung cấp những Dịch vụ được yêu
                  cầu theo Thỏa thuận nhằm đáp ứng nhu cầu của khách hàng;
                </li>
                <li>
                  Để xử lý bất kỳ khoản bồi hoàn, giảm giá và/hoặc các khoản phí
                  theo quy định của Thỏa thuận;
                </li>
                <li>
                  Để tạo điều kiện hoặc cho phép bất kỳ sự kiểm tra có thể được
                  yêu cầu theo Thỏa thuận;
                </li>
                <li>
                  Để trả lời các khúc mắc, ý kiến và phản hồi từ khách hàng;
                </li>
                <li>
                  Để phục vụ các mục đích quản lý nội bộ như kiểm toán, phân
                  tích dữ liệu, lưu giữ cơ sở dữ liệu;
                </li>
                <li>
                  Để phục vụ các mục đích phát hiện, ngăn chặn và truy tố tội
                  phạm;
                </li>
                <li>Để Công ty thực hiện các nghĩa vụ theo pháp luật;</li>
                <li>
                  Để gửi cho khách hàng các thông báo, bản tin, cập nhật, bưu
                  phẩm, tài liệu quảng cáo, ưu đãi đặc biệt, lời chúc vào các
                  ngày lễ từ phía Công ty, đối tác, nhà quảng cáo và/hoặc nhà
                  tài trợ hoặc;
                </li>
                <li>
                  Để thông báo và mời khách hàng tới dự các sự kiện hoặc các
                  hoạt động do Công ty, đối tác, nhà quảng cáo và/hoặc nhà tài
                  trợ tổ chức;
                </li>
                <li>
                  Để chia sẻ Thông tin cá nhân của khách hàng với nhóm các công
                  ty liên quan của Công ty bao gồm các công ty con, công ty liên
                  kết và/hoặc các tổ chức thuộc quyền đồng kiểm soát của công ty
                  mẹ và với các đại lý, các nhà cung cấp bên thứ ba của Công ty,
                  các nhà phát triển, quảng cáo, đối tác, công ty sự kiện hoặc
                  nhà tài trợ có thể liên hệ với khách hàng vì bất kỳ lý do gì.
                </li>
              </ul>

              <p>
                Chi tiết đơn hàng của Thành viên sẽ được chúng tôi lưu trữ nhưng
                vì lý do bảo mật, Thành viên không thể yêu cầu thông tin đó trực
                tiếp từ nền tảng đặt sân trực tuyến Datsan247. Tuy nhiên, Thành
                viên có thể kiểm tra thông tin bằng cách đăng nhập vào tài khoản
                riêng của mình trên website Datsan247.com hoặc thông qua ứng
                dụng của Datsan247 trên cả 2 nền tảng Android và iOS. Tại đó,
                Thành viên có thể theo dõi đầy đủ chi tiết nhật ký đơn hàng của
                mình.
              </p>

              <p>
                Khách hàng cần bảo đảm là thông tin được đăng nhập được giữ bí
                mật và không tiết lộ cho bên thứ ba.
              </p>

              <p>
                Nếu khách hàng không đồng ý cho Công ty sử dụng Thông tin cá
                nhân của khách hàng cho bất kỳ Mục đích nào nói trên, xin vui
                lòng thông báo trước cho Công ty qua các thông tin liên hệ hỗ
                trợ có trong Website/Ứng dụng.
              </p>

              <p>
                Trong trường hợp có bất kỳ thay đổi nào về Thông tin cá nhân mà
                khách hàng đã cung cấp cho công ty, ví dụ, nếu khách hàng thay
                đổi địa chỉ thư điện tử, số điện thoại, chi tiết thanh toán hoặc
                nếu khách hàng muốn hủy bỏ tài khoản của khách hàng, xin vui
                lòng cập nhật thông tin của khách hàng bằng cách gửi yêu cầu tới
                thông tin liên hệ hỗ trợ được cung cấp trong Website/Ứng dụng.
              </p>

              <p>
                Trong khả năng tốt nhất của mình, công ty sẽ thực hiện các thay
                đổi như yêu cầu trong thời gian hợp lý kể từ khi nhận được thông
                báo thay đổi.
              </p>

              <p>
                Bằng việc gửi thông tin, khách hàng cho phép việc sử dụng các
                thông tin đó như quy định trong đơn điền thông tin và trong Điều
                khoản sử dụng.
              </p>
            </section>

            <section className="policy-section">
              <h2>2. Phạm vi sử dụng thông tin</h2>

              <p>
                Datsan247 không mua bán, chia sẻ hay trao đổi thông tin cá nhân
                của Thành viên thu thập trên trang web cho một bên thứ ba nào
                khác.
              </p>

              <ul className="policy-list">
                <li>
                  Công Ty Cổ phần Phần mềm Vitex Vietnam sẽ cung cấp cho các cơ
                  sở thể thao thông tin cần thiết để chuyển giao các đơn đặt
                  hàng đến cho thành viên quản lý của cơ sở thể thao. Nếu thành
                  viên lựa chọn hình thức thanh toán trực tuyến Công Ty Cổ phần
                  Phần mềm Vitex Việt Nam sẽ cung cấp cổng thanh toán với các
                  thông tin cần thiết để xử lý thanh toán. Mọi thông tin giao
                  dịch sẽ được bảo mật nhưng trong trường hợp cơ quan pháp luật
                  yêu cầu, chúng tôi sẽ buộc phải cung cấp những thông tin này
                  cho các cơ quan pháp luật.
                </li>
                <li>
                  Sau khi đơn hàng được đặt thành công, chỉ nhân viên của Công
                  Ty Cổ phần Phần mềm Vitex Việt Nam và chính thành viên mới có
                  thể đăng nhập vào phần thông tin cá nhân.
                </li>
                <li>
                  Thông tin sẽ được lưu trữ trên hệ thống của nền tảng đặt sân
                  trực tuyến Datsan247 và đươc điều hành ngay tại văn phòng Công
                  Ty Cổ phần Phần mềm Vitex Việt Nam.
                </li>
                <li>
                  Thành viên có thể thay đổi, xem hoặc xoá thông tin của họ bằng
                  cách đăng nhập vào phần "Trang cá nhân" hoặc gửi email cho
                  chúng tôi qua địa chỉ contact@vitex.asia
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h2>3. Thời gian lưu trữ thông tin</h2>

              <ul className="policy-list">
                <li>
                  Nền tảng đặt sân trực tuyến Datsan247 sẽ lưu trữ các Thông tin
                  cá nhân do Thành viên cung cấp trên các hệ thống nội bộ của
                  chúng tôi trong quá trình cung cấp dịch vụ cho Thành viên hoặc
                  cho đến khi hoàn thành mục đích thu thập hoặc khi Khách hàng
                  có yêu cầu hủy các thông tin đã cung cấp.
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h2>
                4. Địa chỉ của đơn vị thu thập và quản lý thông tin cá nhân
                Datsan247.com
              </h2>

              <ul className="policy-list">
                <li>
                  Địa chỉ: Tòa nhà The Nine, Doãn Kế Thiện, Cầu Giấy, Hà Nội,
                  Việt Nam.
                </li>
                <li>Tel/Fax: 0972628815</li>
                <li>Email: 23021710@vnu.edu.vn</li>
              </ul>
            </section>

            <section className="policy-section">
              <h2>
                5. Phương tiện và công cụ để người dùng tiếp cận và chỉnh sửa dữ
                liệu cá nhân của mình
              </h2>

              <ul className="policy-list">
                <li>
                  Thành viên có thể thay đổi, xem hoặc xoá thông tin bằng cách
                  đăng nhập vào phần "Trang cá nhân" trên nền tảng đặt sân trực
                  tuyến Datsan247 hoặc gửi email cho chúng tôi qua địa chỉ
                  23021710@vnu.edu.vn để được trợ giúp.
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h2>6. Cam kết bảo mật thông tin cá nhân khách hàng</h2>

              <p>
                Nền tảng đặt sân trực tuyến Datsan247 sử dụng các biện pháp an
                ninh bảo mật thông tin để chống mất mát, nhầm lẫn hoặc thay đổi
                dữ liệu trong hệ thống.
              </p>

              <p>
                Datsan247 cam kết không mua bán, trao đổi hay chia sẻ thông tin
                dẫn đến việc làm lộ thông tin cá nhân của Thành viên vì mục đích
                thương mại, vi phạm những cam kết được đặt ra trong quy định
                chính sách bảo mật thông tin khách hàng.
              </p>

              <p>
                Datsan247 cam kết sẽ không chia sẻ thông tin Thành viên trừ
                những trường hợp cụ thể như sau:
              </p>

              <ul className="policy-list">
                <li>
                  Theo yêu cầu pháp lý từ một cơ quan chính phủ hoặc khi chúng
                  tôi tin rằng việc làm đó là cần thiết và phù hợp nhằm tuân
                  theo các yêu cầu pháp lý.
                </li>
                <li>
                  Để bảo vệ Datsan247 và các bên thứ ba khác: Chúng tôi chỉ đưa
                  ra thông tin tài khoản và những thông tin cá nhân khác khi tin
                  chắc rằng việc đưa những thông tin đó là phù hợp với luật
                  pháp, bảo vệ quyền lợi, tài sản của người sử dụng dịch vụ, của
                  Datsan247 và các bên thứ ba khác.
                </li>
                <li>
                  Những thông tin cá nhân một cách hạn chế nhất sẽ chỉ được chia
                  sẻ với bên thứ ba hoặc nhà tài trợ. Thông tin vắn tắt này sẽ
                  không chứa đầy đủ toàn bộ thông tin của thành viên và chỉ mang
                  ý nghĩa giúp xác định những thành viên nhất định đang sử dụng
                  dịch vụ Datsan247
                </li>
              </ul>

              <p>
                Trong những trường hợp còn lại, chúng tôi sẽ có thông báo cụ thể
                cho Thành viên khi phải tiết lộ thông tin cho một bên thứ ba và
                thông tin này chỉ được cung cấp khi được sự phản hồi đồng ý từ
                phía Thành viên.
              </p>
            </section>

            <section className="policy-section">
              <h2>7. Thỏa thuận bảo mật thông tin</h2>

              <p>
                Nền tảng đặt sân trực tuyến Datsan247 có trách nhiệm yêu cầu các
                bên xử lý thông tin, các bên tham gia hợp đồng đảm bảo việc
                phòng vệ, chống mất mát hoặc truy cập trái phép, sử dụng, thay
                đổi, tiết lộ hoặc sử dụng sai mục đích. Datsan247 có thỏa thuận
                và cơ chế kiểm soát thông tin cá nhân đối với Nhà hàng đối tác
                nhằm đảm bảo trách nhiệm của Datsan247 đối với thông tin cá nhân
                của Thành viên thông qua những phương pháp dưới đây:
              </p>

              <ul className="policy-list">
                <li>
                  Hướng dẫn đối tác chính sách nội bộ của Nền tảng đặt sân trực
                  tuyến Datsan247;
                </li>
                <li>Hợp đồng;</li>
                <li>
                  Buộc đối tác phải tuân thủ nguyên tắc do Datsan247 đề ra;
                </li>
                <li>Tuân thủ quy tắc và luật liên quan;</li>
              </ul>
            </section>

            <section className="policy-section">
              <h2>
                8. Trường hợp Thành viên gửi khiếu nại có liên quan đến việc bảo
                mật thông tin
              </h2>

              <p>
                Ngay khi tiếp nhận thông tin, Datsan247 sẽ nhanh chóng thực hiện
                việc kiểm tra, xác minh. Trong trường hợp đúng như phản ánh của
                Thành viên thì Datsan247 sẽ liên hệ trực tiếp với Thành viên để
                xử lý vấn đề trên tinh thần khắc phục và thiện chí. Trường hợp
                hai bên không thể tự thoả thuận thì sẽ đưa ra Tòa án Nhân Dân có
                thẩm quyền tại Thành Phố Hà Nội để giải quyết.
              </p>
            </section>
          </div>

          <div className="policy-footer">
            <p>
              Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo vệ thông tin cá
              nhân của chúng tôi, vui lòng liên hệ với chúng tôi qua email:
              23021710@vnu.edu.vn
            </p>
            <p>Bản cập nhật mới nhất: Tháng 3, 2025</p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Policy;
