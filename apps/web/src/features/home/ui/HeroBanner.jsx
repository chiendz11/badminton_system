import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../../shared/styles/hero-banner.css";

const HeroBanner = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const slogans = [
    {
      title: "Đặt Sân Cầu Lông Nhanh Chóng và Tiện Lợi",
      subtitle: "Tìm kiếm và đặt sân cầu lông ở bất kỳ đâu, bất kỳ lúc nào",
      cta: "Đặt Sân Ngay",
    },
    {
      title: "Trải Nghiệm Sân Chơi Đẳng Cấp",
      subtitle: "Đa dạng loại sân với tiêu chuẩn cao, phù hợp mọi nhu cầu",
      cta: "Khám Phá Ngay",
    },
    {
      title: "Thanh Toán Dễ Dàng - Đặt Lịch Linh Hoạt",
      subtitle: "Nhiều khung giờ và ưu đãi đặc biệt dành cho thành viên",
      cta: "Tham Gia Ngay",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prevSlide) => (prevSlide + 1) % slogans.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slogans.length]);
  const goToSlide = (index) => {
    setActiveSlide(index);
  };

  return (
    <div className="hero-banner">
      <div className="banner-container">
        <div className="banner-overlay"></div>

        <div className="animated-elements">
          <div className="shuttlecock shuttlecock-1">
            <img
              src="/images/shuttleCock.png"
              alt="Shuttlecock"
              className="icon-img"
            />
          </div>
          <div className="shuttlecock shuttlecock-2">
            <img
              src="/images/shuttleCock.png"
              alt="Shuttlecock"
              className="icon-img"
            />
          </div>

          <div className="line line-1"></div>
        </div>

        <div className="banner-content">
          {slogans.map((slogan, index) => (
            <div
              key={index}
              className={`slide ${index === activeSlide ? "active" : ""}`}
              style={{
                transform: `translateX(${(index - activeSlide) * 100}%)`,
              }}
            >
              <h1 className="banner-title">{slogan.title}</h1>
              <p className="banner-subtitle">{slogan.subtitle}</p>
              <Link to="/centers" className="banner-cta-button">
                {slogan.cta} <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          ))}
        </div>
        <div className="slide-indicators">
          {slogans.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === activeSlide ? "active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
