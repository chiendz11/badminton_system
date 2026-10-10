import React from "react";
import { Link } from "react-router-dom";
import HowItWorks from "../ui/HowItWorks.jsx";
import HeroBanner from "../ui/HeroBanner.jsx";

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
              <span>Sân dành cho nhóm</span>
              <h3>Linh hoạt</h3>
              <Link to="/centers" className="explore-link">
                Xem ngay
              </Link>
            </div>
            <div className="overlay"></div>
          </div>
        </div>
      </div>

      <HowItWorks />
    </>
  );
};

export default Home;
