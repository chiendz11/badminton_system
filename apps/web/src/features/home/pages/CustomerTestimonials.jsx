import React, { useState, useCallback, useEffect, useRef } from "react";
import "../../../shared/styles/customer-testimonials.css";

const CustomerTestimonials = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: "Happy Hub",
      role: "Đơn vị tổ chức sự kiện thể thao",
      image: "/images/testimonials/customer2.jpg",
      logo: "/images/testimonials/logo-happyhub.png",
      quote:
        "Happy Hub – The Playground và The Granary đã tin tưởng giải pháp quản lý sân thể thao DATSAN247",
    },
    {
      id: 2,
      name: "TADA BADMINTON",
      role: "Chủ CLB Cầu Lông",
      image: "/images/testimonials/customer1.jpg",
      logo: "/images/testimonials/logo-tada.png",
      quote: "TADA BADMINTON quản lý hiệu quả hơn nhờ phần mềm DATSAN247",
    },
    {
      id: 3,
      name: "Trường Trinh badminton",
      role: "Cụm sân thể thao",
      image: "/images/testimonials/customer3.jpg",
      logo: "/images/testimonials/truong-trinh.png",
      quote:
        "Cụm sân cầu lông Bờ Trường Trinh – Tin tưởng và đồng hành cùng DATSAN247 từ những ngày đầu",
    },
    {
      id: 4,
      name: "Vũ trụ badminton",
      role: "Trung tâm thể thao",
      image: "/images/testimonials/customer4.jpg",
      logo: "/images/testimonials/vu-tru.png",
      quote:
        "Trung tâm thể thao Vũ trụ badminton đã tiết kiệm 40% thời gian quản lý nhờ DATSAN247",
    },
    {
      id: 5,
      name: "Stadium arena",
      role: "Tổ hợp sân vận động",
      image: "/images/testimonials/customer5.jpg",
      logo: "/images/testimonials/logo-stadium.png",
      quote:
        "Stadium Complex - Hài lòng với dịch vụ và tính năng quản lý của DATSAN247",
    },
  ];

  const totalSlides = testimonials.length;
  const slideInterval = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startSlideShow = useCallback(() => {
    slideInterval.current = setInterval(() => {
      if (currentSlide === totalSlides - 1) {
        setIsTransitioning(true);

        setTimeout(() => {
          setCurrentSlide(0);
          setIsTransitioning(false);
        }, 500);
      } else {
        setCurrentSlide((prevSlide) => prevSlide + 1);
      }
    }, 6000);
  }, [currentSlide, totalSlides]);

  useEffect(() => {
    startSlideShow();

    return () => {
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
    };
  }, [startSlideShow]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    // Reset interval when manually changing slides
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
    }
    startSlideShow();
  };

  // Style đặc biệt cho transition khi quay về slide đầu
  const sliderStyle = {
    transform: `translateX(-${currentSlide * 100}%)`,
    transition: isTransitioning ? "none" : "transform 0.5s ease",
  };

  return (
    <section className="customer-testimonials-section">
      <div className="testimonials-container">
        <div
          className="testimonials-slider"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {testimonials.map((testimonial) => (
            <div className="testimonial-card" key={testimonial.id}>
              <div className="testimonial-content">
                <div className="testimonial-image">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    onError={(e) => {
                      e.target.src = "/images/placeholder.jpg";
                    }}
                  />
                </div>
                <div className="testimonial-text">
                  <h3 className="testimonial-quote">{testimonial.quote}</h3>
                  <div className="testimonial-info">
                    <div className="testimonial-logo">
                      <img
                        src={testimonial.logo}
                        alt={`${testimonial.name} logo`}
                        onError={(e) => {
                          e.target.src = "/images/placeholder-logo.png";
                        }}
                      />
                    </div>
                    <div className="testimonial-author">
                      <div className="author-name">{testimonial.name}</div>
                      <div className="author-role">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots navigation */}
        <div className="slider-dots">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <span
              key={index}
              className={`dot ${currentSlide === index ? "active" : ""}`}
              onClick={() => goToSlide(index)}
            ></span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerTestimonials;
