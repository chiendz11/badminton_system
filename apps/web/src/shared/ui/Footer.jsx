import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/footer.css";
import { MessageSquare } from "lucide-react";
import ChatBox from "./ChatBox.jsx";

const Footer = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [footerScale, setFooterScale] = useState(1);
  const [footerOpacity, setFooterOpacity] = useState(1);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const windowHeight = window.innerHeight;
          const documentHeight = document.body.offsetHeight;
          const scrollPosition = currentScrollY + windowHeight;
          const distanceFromBottom = documentHeight - scrollPosition;

          if (distanceFromBottom <= 300) {
            setFooterScale(1);
            setFooterOpacity(1);
          } else {
            const maxScrollDistance = 500;
            const progress = Math.min(
              (distanceFromBottom - 300) / maxScrollDistance,
              1,
            );
            const newScale = 1 - progress * 0.3;
            const newOpacity = 1 - progress * 0.5;
            setFooterScale(Math.max(newScale, 0.7));
            setFooterOpacity(Math.max(newOpacity, 0.5));
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });

        ticking = true;
      }
    };

    const initialScrollPosition = window.scrollY + window.innerHeight;
    if (initialScrollPosition >= document.body.offsetHeight - 300) {
      setFooterScale(1);
      setFooterOpacity(1);
    }

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <footer
        className="site-footer"
        style={{ transform: `scaleY(${footerScale})`, opacity: footerOpacity }}
      >
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <div className="footer-logo">
                ĐẶT<span>SÂN</span>247
              </div>
              <div className="contact-info">
                <p>
                  <strong>Địa chỉ:</strong> Dịch Vọng Hậu, Cầu Giấy, Hà Nội
                </p>
                <p>
                  <strong>Hotline:</strong> 1900 1809
                </p>
                <p>
                  <strong>Email:</strong> 23021710@vnu.edu.vn
                </p>
              </div>
              <div className="social-media">
                <h3>Social Media</h3>
                <div className="social-icons">
                  <a
                    href="https://facebook.com"
                    className="social-icon facebook"
                  >
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a
                    href="https://instagram.com"
                    className="social-icon instagram"
                  >
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="https://twitter.com" className="social-icon twitter">
                    <i className="fab fa-twitter"></i>
                  </a>
                  <a
                    href="https://www.youtube.com/channel/UCDZ4Kmmnw84OgLZevnmvQXA"
                    className="social-icon youtube"
                  >
                    <i className="fab fa-youtube"></i>
                  </a>
                </div>
              </div>
            </div>
            <div className="footer-about">
              <h3>Giới thiệu</h3>
              <p className="about-desc">
                Đặt sân 247 cung cấp các tiện ích thông minh giúp cho bạn tìm
                sân bãi và đặt sân một cách hiệu quả nhất.
              </p>
              <ul className="footer-links">
                <li>
                  <Link to="/policy">Chính sách bảo mật</Link>
                </li>

                <li>
                  <Link to="/policy">Chính sách huỷ</Link>
                </li>
              </ul>
            </div>
            <div className="footer-categories">
              <h3>Khám phá</h3>
              <ul className="footer-links">
                <li>
                  <Link to="/centers">Sân tiêu chuẩn</Link>
                </li>
                <li>
                  <Link to="/centers">Sân thi đấu</Link>
                </li>
                <li>
                  <Link to="/service">Dịch vụ</Link>
                </li>
                <li>
                  <Link to="/sales">Khuyến mãi</Link>
                </li>
                <li>
                  <Link to="/news">Tin tức cầu lông</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="copyright">
          <div className="container">
            <p>
              © {new Date().getFullYear()} ĐẶT SÂN 247. Sự hài lòng của bạn là
              nhiệm vụ của chúng tôi.
            </p>
          </div>
        </div>
      </footer>

      <ChatBox isOpen={chatOpen} onClose={toggleChat} />

      <button onClick={toggleChat} className="chat-toggle-btn">
        <MessageSquare size={24} />
        <span className="sr-only">Trợ giúp</span>
      </button>

      <button onClick={scrollToTop} className="scroll-to-top">
        <i className="fas fa-arrow-up"></i>
      </button>
    </>
  );
};

export default Footer;
