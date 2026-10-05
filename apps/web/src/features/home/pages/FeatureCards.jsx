import React, { useEffect, useRef } from "react";
import "../../../shared/styles/featureCards.css";

const FeatureCards = () => {
  const topRowRef = useRef(null);
  const bottomRowRef = useRef(null);
  const additionalSection1Ref = useRef(null);
  const additionalSection2Ref = useRef(null);
  const reverseLayoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const topRow = topRowRef.current;
      const bottomRow = bottomRowRef.current;
      const additionalSection1 = additionalSection1Ref.current;
      const additionalSection2 = additionalSection2Ref.current;
      const reverseLayout = reverseLayoutRef.current;

      if (!topRow || !bottomRow) return;

      const topRowPosition = topRow.getBoundingClientRect();
      const bottomRowPosition = bottomRow.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (topRowPosition.top < windowHeight - 100) {
        topRow.classList.add("visible");
      }

      if (bottomRowPosition.top < windowHeight - 50) {
        bottomRow.classList.add("visible");
      }

      if (
        additionalSection1 &&
        additionalSection1.getBoundingClientRect().top < windowHeight
      ) {
        additionalSection1.classList.add("visible");
      }

      if (
        additionalSection2 &&
        additionalSection2.getBoundingClientRect().top < windowHeight
      ) {
        additionalSection2.classList.add("visible");
      }
      if (
        reverseLayout &&
        reverseLayout.getBoundingClientRect().top < windowHeight
      ) {
        reverseLayout.classList.add("visible");
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="feature-section">
      <div className="feature-container">
        <div className="feature-header">
          <h2>Chức năng chính</h2>
        </div>

        <div className="feature-row top-row" ref={topRowRef}>
          <div className="feature-item slide-right">
            <div className="feature-icon">
              <img
                src="../images/cards/revenue.png"
                alt="Trạng thái sân"
                className="feature-icon-image"
              />
            </div>
            <h3>Xem Tình Trạng Sân</h3>
            <p>
              Giúp chủ sân xem được sân nào giờ nào còn trống hay đã được đặt.
              Chủ sân có thể xem được đơn nào chưa thanh toán, đã thanh toán hay
              còn đang sử dụng dịch vụ ở sân. Ngoài ra có thể xem được khách nào
              là khách lẻ, khách nào cố định.
            </p>
          </div>

          <div className="feature-item slide-right">
            <div className="feature-icon">
              <img
                src="../images/cards/box.png"
                alt="Trạng thái sân"
                className="feature-icon-image"
              />
            </div>
            <h3>Bán Dịch Vụ</h3>
            <p>
              Tính năng bán hàng của phần mềm quản lý Datsan247 cho phép chủ sân
              dễ dàng bán các dịch vụ như nước uống, vợt, bóng, cầu, đồ ăn,...
              một cách nhanh chóng và hiệu quả. Giúp theo dõi doanh thu từ việc
              bán dịch vụ.
            </p>
          </div>

          <div className="feature-item slide-right">
            <div className="feature-icon">
              <img
                src="../images/cards/timetable.png"
                alt="Trạng thái sân"
                className="feature-icon-image"
              />
            </div>
            <h3>Quản Lý Lịch Đặt</h3>
            <p>
              Datsan247 cung cấp đầy đủ tính năng quản lý và tạo lịch đặt theo
              ngày, linh hoạt, có định theo tháng. Đồng thời bạn có thể theo dõi
              và duyệt đơn đặt lịch từ khách hàng, giúp bạn tổ chức công việc
              một cách thuận tiện và dễ dàng.
            </p>
          </div>
        </div>

        <div className="feature-row bottom-row" ref={bottomRowRef}>
          <div className="feature-item slide-left">
            <div className="feature-icon">
              <img
                src="../images/cards/description.png"
                alt="Trạng thái sân"
                className="feature-icon-image"
              />
            </div>
            <h3>Thống Kê Doanh Thu</h3>
            <p>
              Datsan247 cung cấp báo cáo và thống kê chi tiết về doanh thu, số
              lượng đặt lịch, các dịch vụ ở sân và nhiều chỉ số kinh doanh khác.
              Điều này giúp bạn đánh giá hiệu quả kinh doanh, tối ưu và đưa ra
              quyết định đúng đắn.
            </p>
          </div>

          <div className="feature-item slide-left">
            <div className="feature-icon">
              <img
                src="../images/cards/public-relation.png"
                alt="Trạng thái sân"
                className="feature-icon-image"
              />
            </div>
            <h3>Quản Lý Khách Hàng</h3>
            <p>
              Datsan247 cho phép bạn lưu trữ thông tin khách hàng, lịch sử đặt
              lịch và thống kê tổng tiền đã chi của khách. Bạn có thể tạo ra
              chương trình khuyến mãi tri ân khách hàng, tăng tương tác và tạo
              sự hài lòng cho khách hàng.
            </p>
          </div>

          <div className="feature-item slide-left">
            <div className="feature-icon">
              <img
                src="../images/cards/settings.png"
                alt="Trạng thái sân"
                className="feature-icon-image"
              />
            </div>
            <h3>Nhiều Chức Năng Hot Khác</h3>
            <p>
              Datsan247 còn cung cấp thêm các tính năng chuyên biệt khác cho
              việc quản lý như tạo sự kiện xã hội (social), công thanh toán tự
              động, quản lý chi nhánh, quản lý khách hàng, quản lý thu chi...
            </p>
          </div>
        </div>
      </div>

      <div className="feature-container">
        <div className="feature-header">
          <h2>Tại sao bạn nên chọn ứng dụng của chúng tôi</h2>
        </div>

        <div className="split-layout" ref={additionalSection1Ref}>
          <div className="split-image">
            <img
              src="../images/phone.png"
              alt="Datsan247 Mobile App"
              className="phone-image"
            />
          </div>

          <div className="split-content">
            <div className="feature-item horizontal slide-left">
              <div className="feature-icon revenue-icon">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M50 20 L80 35 L80 65 L50 80 L20 65 L20 35 Z"
                    fill="#55b9f3"
                    fillOpacity="0.2"
                  />
                  <path d="M50 40 L65 50 L50 60 L35 50 Z" fill="#55b9f3" />
                  <path
                    d="M35 20 L35 40 L20 50 L20 35 Z"
                    fill="#4caf50"
                    fillOpacity="0.6"
                  />
                  <path
                    d="M65 20 L65 40 L80 50 L80 35 Z"
                    fill="#7986cb"
                    fillOpacity="0.8"
                  />
                  <path
                    d="M35 60 L35 80 L20 65 L20 50 Z"
                    fill="#ffa726"
                    fillOpacity="0.7"
                  />
                  <path
                    d="M65 60 L65 80 L80 65 L80 50 Z"
                    fill="#ef5350"
                    fillOpacity="0.6"
                  />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Tăng Doanh Thu</h3>
                <p>
                  Phần mềm giúp thống kê tình hình kinh doanh hiện tại. Tăng tỉ
                  lệ lấp đầy sân trống từ đó tăng doanh thu.
                </p>
              </div>
            </div>

            <div className="feature-item horizontal slide-left">
              <div className="feature-icon efficiency-icon">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10,80 L90,80" stroke="#ff6b6b" strokeWidth="2" />
                  <path d="M20,80 L20,40 L30,40 L30,80" fill="#ff6b6b" />
                  <path d="M40,80 L40,30 L50,30 L50,80" fill="#ff6b6b" />
                  <path d="M60,80 L60,50 L70,50 L70,80" fill="#ff6b6b" />
                  <path d="M80,80 L80,20 L90,20 L90,80" fill="#ff6b6b" />
                  <path
                    d="M10,20 L90,20"
                    stroke="#ff6b6b"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <circle
                    cx="20"
                    cy="40"
                    r="4"
                    fill="white"
                    stroke="#ff6b6b"
                    strokeWidth="2"
                  />
                  <circle
                    cx="40"
                    cy="30"
                    r="4"
                    fill="white"
                    stroke="#ff6b6b"
                    strokeWidth="2"
                  />
                  <circle
                    cx="60"
                    cy="50"
                    r="4"
                    fill="white"
                    stroke="#ff6b6b"
                    strokeWidth="2"
                  />
                  <circle
                    cx="80"
                    cy="20"
                    r="4"
                    fill="white"
                    stroke="#ff6b6b"
                    strokeWidth="2"
                  />
                  <path
                    d="M20,40 L40,30 L60,50 L80,20"
                    stroke="#ff6b6b"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Tăng Hiệu Quả Quản Lý</h3>
                <p>
                  Phần mềm Datsan247 giúp tự động hóa các quy trình nghiệp vụ
                  như đặt lịch, thanh toán, báo cáo,... giúp tiết kiệm thời gian
                  và chi phí nhân lực.
                </p>
              </div>
            </div>

            <div className="feature-item horizontal slide-left">
              <div className="feature-icon experience-icon">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="20"
                    y="30"
                    width="60"
                    height="50"
                    rx="5"
                    fill="#5cd9a6"
                  />
                  <rect
                    x="25"
                    y="35"
                    width="50"
                    height="30"
                    rx="3"
                    fill="white"
                  />
                  <circle cx="40" cy="70" r="5" fill="white" />
                  <circle cx="60" cy="70" r="5" fill="white" />
                  <path
                    d="M30,50 L45,55 L60,45 L70,50"
                    stroke="#5cd9a6"
                    strokeWidth="3"
                    fill="none"
                  />
                  <path d="M50,20 L50,30" stroke="#5cd9a6" strokeWidth="3" />
                  <path d="M30,90 L70,90" stroke="#5cd9a6" strokeWidth="3" />
                  <path
                    d="M40,15 C40,10 60,10 60,15"
                    stroke="#5cd9a6"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Tăng Trải Nghiệm Khách Hàng</h3>
                <p>
                  Phần mềm giúp khách hàng dễ dàng đặt lịch, thanh toán và theo
                  dõi lịch sử giao dịch,... giúp khách hàng chủ động đặt và quay
                  lại nhiều lần hơn.
                </p>
              </div>
            </div>

            <div className="feature-item horizontal slide-left">
              <div className="feature-icon competitive-icon">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="#ffc86b"
                    fillOpacity="0.2"
                  />
                  <circle
                    cx="30"
                    cy="40"
                    r="15"
                    fill="#ffc86b"
                    fillOpacity="0.5"
                  />
                  <circle
                    cx="70"
                    cy="40"
                    r="15"
                    fill="#ffc86b"
                    fillOpacity="0.5"
                  />
                  <path
                    d="M20,70 C30,60 70,60 80,70"
                    stroke="#ffc86b"
                    strokeWidth="5"
                    fill="none"
                  />
                  <circle cx="30" cy="40" r="5" fill="white" />
                  <circle cx="70" cy="40" r="5" fill="white" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Tăng Tính Cạnh Tranh</h3>
                <p>
                  Phần mềm Datsan247 giúp doanh nghiệp nâng cao hiệu quả hoạt
                  động kinh doanh, tăng khả năng tiếp cận khách hàng tốt, từ đó
                  tăng năng cao độ uy tín trên cộng đồng.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="split-layout reverse-layout" ref={reverseLayoutRef}>
          <div className="split-content">
            <div className="feature-item horizontal slide-right">
              <div className="feature-icon booking-icon">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="15"
                    y="15"
                    width="70"
                    height="70"
                    rx="8"
                    fill="#e6f7ff"
                  />
                  <rect
                    x="25"
                    y="25"
                    width="50"
                    height="50"
                    rx="4"
                    fill="#49cc90"
                  />
                  <rect
                    x="30"
                    y="30"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <rect
                    x="45"
                    y="30"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <rect
                    x="60"
                    y="30"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <rect
                    x="30"
                    y="45"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <rect
                    x="45"
                    y="45"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <rect
                    x="60"
                    y="45"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <rect
                    x="30"
                    y="60"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <rect
                    x="45"
                    y="60"
                    width="10"
                    height="10"
                    rx="2"
                    fill="white"
                  />
                  <circle
                    cx="65"
                    cy="65"
                    r="12"
                    fill="#fa8c16"
                    strokeWidth="2"
                    stroke="white"
                  />
                  <text
                    x="65"
                    y="70"
                    textAnchor="middle"
                    fontFamily="Arial"
                    fontSize="16"
                    fontWeight="bold"
                    fill="white"
                  >
                    !
                  </text>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Đặt Lịch</h3>
                <p>
                  Quên đi việc ngồi đợi hàng tiếng đồng hồ – nay bạn chỉ cần
                  ngồi ở nhà và đặt lịch trực tuyến một cách nhanh chóng và
                  thuận tiện.
                </p>
              </div>
            </div>

            <div className="feature-item horizontal slide-right">
              <div className="feature-icon search-icon">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="25" fill="#ffecb3" />
                  <circle cx="40" cy="40" r="20" fill="#ffcc80" />
                  <circle
                    cx="40"
                    cy="40"
                    r="15"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <path
                    d="M60,60 L80,80"
                    stroke="#ffb74d"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <circle cx="40" cy="40" r="5" fill="#fff176" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Dễ Dàng Tìm Kiếm</h3>
                <p>
                  Tìm kiếm những sân cung cấp dịch vụ gần vị trí hiện tại của
                  bạn. Bạn có thể xem thông tin chi tiết về các địa điểm, bao
                  gồm đánh giá và xếp hạng từ cộng đồng người dùng khác.
                </p>
              </div>
            </div>

            <div className="feature-item horizontal slide-right">
              <div className="feature-icon experience-icon">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M50,10 L61,35 L89,38 L69,57 L74,83 L50,71 L26,83 L31,57 L11,38 L39,35 Z"
                    fill="#90caf9"
                  />
                  <path
                    d="M50,15 L59,35 L82,38 L66,54 L71,76 L50,66 L29,76 L34,54 L18,38 L41,35 Z"
                    fill="#bbdefb"
                  />
                  <path
                    d="M50,20 L57,35 L75,38 L62,51 L67,70 L50,61 L33,70 L38,51 L25,38 L43,35 Z"
                    fill="#e3f2fd"
                  />
                  <circle cx="50" cy="40" r="10" fill="#64b5f6" />
                  <path
                    d="M40,65 Q50,55 60,65"
                    stroke="#64b5f6"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Tăng Trải Nghiệm Khách Hàng</h3>
                <p>
                  Trải nghiệm những dịch vụ chất lượng ở sân, có cơ hội trở
                  thành thành viên thân thiết và nhận được những ưu đãi đặc
                  biệt.
                </p>
              </div>
            </div>
          </div>

          <div className="split-image">
            <img
              src="../images/phone2.webp"
              alt="Datsan247 Mobile App Features"
              className="phone-image"
            />
          </div>
        </div>
      </div>

      {/* Thêm các phần tử trang trí */}
      <div className="decoration-chart"></div>
      <div className="illustration-analytics"></div>
    </div>
  );
};

export default FeatureCards;
