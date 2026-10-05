import React, { useEffect, useRef, useState } from "react";
import "../../../shared/styles/testimonials-section.css";

const TestimonialsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Dữ liệu người dùng đánh giá
  const testimonials = [
    {
      id: 1,
      name: "Tiến Minh",
      role: "Khách hàng",
      image: "/images/testimonials/minhca.webp",
      text: "DATSAN247 đã giúp tôi tìm và đặt sân cầu lông một cách nhanh chóng và tiện lợi chỉ với vài thao tác đơn giản. Giao diện thân thiện, dễ sử dụng, hiển thị rõ ràng thông tin về sân, thời gian trống, và cả giá cả. Đặc biệt, hệ thống có rất nhiều sân chất lượng ở khắp các quận Hà Nội, giúp tôi dễ dàng lựa chọn địa điểm phù hợp với mình. Từ khi biết đến DATSAN247, mình không còn phải mất thời gian gọi điện từng nơi để hỏi còn sân hay không nữa. Thật sự rất hài lòng và sẽ tiếp tục sử dụng lâu dài!",
    },
    {
      id: 2,
      name: "Lin Dan",
      role: "Khách hàng",
      image: "/images/testimonials/lindan.webp",
      text: "我在越南旅游期间有机会使用 DATSAN247 的在线预订服务，体验了他们高质量的羽毛球场地系统，真的非常方便和专业。下次来我还会继续使用这个平台！\n(Trong thời gian du lịch tại Việt Nam, tôi đã có cơ hội sử dụng dịch vụ đặt sân online của DATSAN247 và trải nghiệm hệ thống sân cầu chất lượng cao của họ – thật sự rất tiện lợi và chuyên nghiệp. Lần sau đến, tôi chắc chắn sẽ tiếp tục sử dụng nền tảng này!)",
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const section = sectionRef.current;
      const sectionTop = section.getBoundingClientRect().top;
      const sectionBottom = section.getBoundingClientRect().bottom;
      const windowHeight = window.innerHeight;

      // Hiển thị section khi nó hiện ra 30% từ dưới lên
      if (sectionTop < windowHeight * 0.7 && sectionBottom > 0) {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Gọi một lần lúc đầu để kiểm tra vị trí ban đầu
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`testimonials-section ${isVisible ? "visible" : ""}`}
    >
      <div className="testimonials-content">
        <h2 className="section-title">Mọi Người Nói Gì Về Chúng Tôi</h2>

        <div className="testimonials-grid">
          <div
            className={`testimonial-item left-testimonial ${isVisible ? "animate-left" : ""}`}
          >
            <div className="testimonial-avatar">
              <img src={testimonials[0].image} alt={testimonials[0].name} />
            </div>
            <h3 className="testimonial-name">{testimonials[0].name}</h3>
            <p className="testimonial-role">{testimonials[0].role}</p>
            <div className="testimonial-text">
              <p>{testimonials[0].text}</p>
            </div>
          </div>

          <div
            className={`testimonial-item right-testimonial ${isVisible ? "animate-right" : ""}`}
          >
            <div className="testimonial-avatar">
              <img src={testimonials[1].image} alt={testimonials[1].name} />
            </div>
            <h3 className="testimonial-name">{testimonials[1].name}</h3>
            <p className="testimonial-role">{testimonials[1].role}</p>
            <div className="testimonial-text">
              <p>{testimonials[1].text}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
