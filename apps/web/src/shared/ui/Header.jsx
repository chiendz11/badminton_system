import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/header.css";

import { SessionContext } from "../session/SessionContext.jsx";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { user, loading } = useContext(SessionContext);
  const navigate = useNavigate();
  const DEFAULT_AVATAR_URL =
    "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  const getAvatarImagePath = (path) => {
    if (path && path.trim() !== "") {
      return path;
    }
    return DEFAULT_AVATAR_URL;
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Class chung cho các Link
  const navLinkClass =
    "hover:text-yellow-300 transition-colors whitespace-nowrap font-medium px-2 py-2 block";

  if (loading) {
    return <div>Đang tải...</div>;
  }

  return (
    <>
      <header className={isScrolled ? "scrolled" : ""}>
        <div className="container header-container flex items-center justify-between">
          {/* LOGO */}
          <Link to="/" className="logo flex-shrink-0 mr-4">
            <div className="logo-icon">
              <i className="fas fa-table-tennis"></i>
            </div>
            ĐẶT<span>SÂN</span>247
          </Link>

          <div className="header-right flex items-center">
            {/* CONTACT INFO */}
            <div className="header-contact flex items-center mr-6 hidden lg:flex">
              <div className="contact-item flex items-center whitespace-nowrap">
                <i className="fas fa-phone-alt"></i>
                <span>1900 1809</span>
              </div>
              <div className="contact-item flex items-center whitespace-nowrap">
                <i className="fas fa-envelope"></i>
                <span>23021710@vnu.edu.vn</span>
              </div>
            </div>

            {/* MOBILE TOGGLE */}
            <button
              className={`mobile-menu-toggle ${isMobileMenuOpen ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {/* NAVIGATION MENU */}
            <nav className={isMobileMenuOpen ? "active" : ""}>
              <ul className="header-links flex items-center gap-1 lg:gap-6">
                <li>
                  <Link to="/" onClick={closeMenu} className={navLinkClass}>
                    Trang Chủ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/centers"
                    onClick={closeMenu}
                    className={navLinkClass}
                  >
                    Đặt Sân
                  </Link>
                </li>

                <li>
                  <Link
                    to="/booking-assistant"
                    onClick={closeMenu}
                    className={navLinkClass}
                  >
                    Trợ lý đặt sân
                  </Link>
                </li>
                <li>
                  <Link to="/news" onClick={closeMenu} className={navLinkClass}>
                    Tin Tức
                  </Link>
                </li>
                <li>
                  <Link
                    to="/policy"
                    onClick={closeMenu}
                    className={navLinkClass}
                  >
                    Chính Sách
                  </Link>
                </li>
                <li>
                  {
                    <Link
                      to="/contact"
                      onClick={closeMenu}
                      className={navLinkClass}
                    >
                      Liên Hệ
                    </Link>
                  }
                </li>

                {/* --- PHẦN NÚT THÔNG BÁO & USER --- */}
                {user ? (
                  <>
                    {/* [NEW] NÚT THÔNG BÁO */}
                    <li className="relative mx-1">
                      <Link
                        to="/notifications" // Dẫn tới trang thông báo (bạn tự tạo route này nhé)
                        onClick={closeMenu}
                        className="relative text-white hover:text-yellow-300 transition-colors px-2 py-2 flex items-center"
                      >
                        <i className="fas fa-bell text-xl"></i>

                        {/* Dấu chấm đỏ báo hiệu có thông báo mới (Logic giả định) */}
                        <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-600 border border-white"></span>
                      </Link>
                    </li>

                    {/* USER DROPDOWN */}
                    <li className="relative ml-2">
                      <div className="relative inline-block group">
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="flex items-center border border-white text-white rounded-md px-3 py-1 hover:bg-white hover:bg-opacity-20 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <img
                            src={getAvatarImagePath(user?.avatar_url)}
                            alt="Avatar"
                            className="w-8 h-8 rounded object-cover mr-2"
                            style={{
                              border: `2px solid #FCD34D`,
                              transition: "all 0.3s",
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/user_avatar.png";
                            }}
                          />
                          <span className="text-base font-medium max-w-[150px] truncate">
                            {user.name}
                          </span>
                          <i className="fas fa-chevron-down text-sm ml-2"></i>
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-yellow-400 rounded-md shadow-lg z-50 transition-all duration-200 overflow-hidden">
                            <button
                              onClick={() => {
                                setIsDropdownOpen(false);
                                navigate("/profile");
                              }}
                              className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-800 text-sm hover:bg-yellow-300 transition-colors font-medium"
                            >
                              <i className="fas fa-user text-lg"></i>
                              <span>Thông tin cá nhân</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  </>
                ) : null}
              </ul>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
