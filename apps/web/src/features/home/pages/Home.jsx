import React from "react";
import { Link } from "react-router-dom";
import HowItWorks from "../ui/HowItWorks.jsx";
import HeroBanner from "../ui/HeroBanner.jsx";
import FeatureCards from "./FeatureCards.jsx";
import CustomerTestimonials from "./CustomerTestimonials.jsx";
import TestimonialsSection from "./TestimonialsSection.jsx";

const Home = () => {
  return (
    <>
      <style>
        {`
          .section-title {
            text-align: center !important;
            width: 100%;
            display: block;
          }

          .section-desc {
            text-align: center !important;
            width: 100%;
            display: block;
          }

          .section-header {
            width: 100%;
            text-align: center !important;
          }
        `}
      </style>

      <HeroBanner />
      <FeatureCards />

      <div className="container mt-5">
        <div className="section-header text-center mb-4">
          <h2 className="section-title text-center">Khám Phá Sân Cầu Lông</h2>
          <p className="section-desc text-center">
            Lựa chọn sân cầu lông phù hợp với nhu cầu của bạn
          </p>
        </div>
      </div>

      <div className="container">
        <div className="row py-5 justify-content-center">
          <div className="col-4 img-hover-zoom img-hover-zoom--blur">
            <img src="/images/san1.png" className="img-fluid" alt="Sân cầu" />
            <div className="caption_banner">
              <span>Sân đấu chuẩn thi đấu</span>
              <h3>Hiện đại</h3>
              <Link to="/centers" className="explore-link">
                Xem ngay
              </Link>
            </div>
            <div className="overlay"></div>
          </div>

          <div className="col-4 img-hover-zoom img-hover-zoom--blur">
            <img src="/images/san2.png" className="img-fluid" alt="Sân cầu" />
            <div className="caption_banner">
              <span>Sân đấu phổ thông</span>
              <h3>Tiêu chuẩn</h3>
              <Link to="/centers" className="explore-link">
                Xem ngay
              </Link>
            </div>
            <div className="overlay"></div>
          </div>

          <div className="col-4 img-hover-zoom img-hover-zoom--blur">
            <img src="/images/san3.jpg" className="img-fluid" alt="Sân cầu" />
            <div className="caption_banner">
              <span>Giải thi đấu mở rộng</span>
              <h3>Thu hút</h3>
              <Link to="/competition" className="explore-link">
                Xem ngay
              </Link>
            </div>
            <div className="overlay"></div>
          </div>
        </div>
      </div>

      <div className="container mt-5">
        <div className="section-header text-center mb-4">
          <h2 className="section-title text-center">
            Khách hàng của chúng tôi
          </h2>
          <p className="section-desc text-center">
            Những tập thể đã tin tưởng và ủng hộ DATSAN247
          </p>
        </div>
      </div>

      <CustomerTestimonials />

      <div className="container promo-banner-container">
        <div className="section-header text-center mb-4">
          <h2 className="section-title">Ưu Đãi Hấp Dẫn</h2>
          <p className="section-desc">
            Không bỏ lỡ những ưu đãi đặc biệt từ chúng tôi
          </p>
        </div>
        <div className="promo-banner img-hover-zoom-banner">
          <img src="/images/banner.png" alt="Giảm giá" className="img-fluid" />
          <div className="promo-overlay"></div>
          <div className="promo-content">
            <span className="promo-label">HOT!</span>
            <h3 className="promo-title">KHUYẾN MÃI KHAI TRƯƠNG</h3>
            <p className="promo-desc">
              Giảm giá lên đến 50% khi đặt sân trong tháng này
            </p>
          </div>
        </div>
      </div>

      <hr />

      <HowItWorks />
      <TestimonialsSection />
    </>
  );
};

export default Home;
