import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogOut } from "lucide-react";
import "../styles/header.css";
import LoginModal from "./LoginModal.jsx";
import { login } from "../api/auth.js";

import { SessionContext } from "../session/SessionContext.jsx";
import { useChat } from "../chat/ChatContext.jsx";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const { user, loading, updateSession, logout } =
    useContext(SessionContext) || {};
  const { openChat } = useChat();
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

  const handleLogin = async (credentials) => {
    const session = await login(credentials);
    if (updateSession) {
      updateSession(session);
    }
  };

  const navLinkClass =
    "hover:text-yellow-300 transition-colors whitespace-nowrap font-medium px-2 py-2 block";

  if (loading) {
    return <div>Đang tải...</div>;
  }

  return (
    <>
      <header className={isScrolled ? "scrolled" : ""}>
        <div className="container header-container flex items-center justify-between">
          {/* LOGO & AI QUICK LAUNCH ICON (AWS Console style) */}
          <div className="flex items-center gap-3">
            <Link to="/" className="logo flex-shrink-0">
              <div className="logo-icon">
                <i className="fas fa-table-tennis"></i>
              </div>
              ĐẶT<span>SÂN</span>247
            </Link>

            {/* Amazon Q style AI icon button as highlighted in the user image */}
            <button
              onClick={openChat}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 p-0.5 shadow-md hover:scale-105 active:scale-95 transition-transform"
              title="Mở Trợ lý AI ĐẶT SÂN 247 (Amazon Q style)"
              aria-label="Trợ lý AI ĐẶT SÂN 247"
            >
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles size={15} className="text-emerald-400" />
              </div>
            </button>
          </div>

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
                    onClick={(e) => {
                      closeMenu();
                      if (!user) {
                        e.preventDefault();
                        openChat();
                      }
                    }}
                    className={navLinkClass}
                  >
                    Trợ lý đặt sân
                  </Link>
                </li>

                {/* --- PHẦN NÚT THÔNG BÁO & USER --- */}
                {user ? (
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
                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl z-50 transition-all duration-200 overflow-hidden border border-gray-100">
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              navigate("/my-bookings");
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-800 text-sm hover:bg-gray-50 transition-colors font-medium border-b border-gray-100 cursor-pointer"
                          >
                            <i className="fas fa-user text-base text-gray-500"></i>
                            <span>Lịch đặt sân của tôi</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              openChat();
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left text-emerald-700 text-sm hover:bg-emerald-50 transition-colors font-medium border-b border-gray-100 cursor-pointer"
                          >
                            <Sparkles size={16} />
                            <span>Mở Trợ lý AI</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              if (logout) logout();
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left text-red-600 text-sm hover:bg-red-50 transition-colors font-medium cursor-pointer"
                          >
                            <LogOut size={16} />
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ) : (
                  <li>
                    <button
                      type="button"
                      className="header-login-button cursor-pointer"
                      onClick={() => {
                        closeMenu();
                        setIsLoginOpen(true);
                      }}
                    >
                      <i className="fas fa-user" aria-hidden="true"></i>
                      Đăng nhập
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </header>
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSubmit={handleLogin}
      />
    </>
  );
};

export default Header;
