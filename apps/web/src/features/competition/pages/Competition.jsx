import React, { useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../../../shared/ui/Footer.jsx";
import Header from "../../../shared/ui/Header.jsx";
import "../../../shared/styles/competitions.css";

const Competitions = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const recentTournament = {
    name: "Giải Cầu Lông CLB ĐẤT SÂN 247 Mở Rộng",
    date: "15/04/2025",
    location: "Nhà thi đấu Đại học Bách Khoa Hà Nội",
    participants: 64,
    categories: ["Đơn nam", "Đơn nữ", "Đôi nam", "Đôi nam nữ"],
    sponsors: ["Yonex", "Victor", "Redbull"],
    winners: [
      {
        category: "Đơn nam",
        first: {
          name: "Nguyễn Tiến Minh",
          club: "CLB Sao Vàng",
          image: "/images/players/player1.webp",
        },
        second: {
          name: "Lê Đức Phát",
          club: "CLB Cầu Lông HN",
          image: "/images/players/player2.jpg",
        },
        third: {
          name: "Bùi Anh Chiến",
          club: "CLB Cầu Lông đại học Quốc Gia",
          image: "/images/players/player3.jpg",
        },
      },
      {
        category: "Đơn nữ",
        first: {
          name: "Shida ",
          club: "Japan",
          image: "/images/players/player4.webp",
        },
        second: {
          name: "Nguyễn Thùy Linh",
          club: "CLB Olympia",
          image: "/images/players/player5.jpg",
        },
        third: {
          name: "Vũ Thị Trang",
          club: "CLB Đất Sân 247",
          image: "/images/players/player6.jpg",
        },
      },
    ],
    highlights: [
      "64 vận động viên tham gia từ 40 CLB khác nhau",
      "Tổng giải thưởng trị giá 500 triệu đồng",
      "Sự kiện kéo dài 7 ngày với hơn 100 trận đấu",
    ],
    gallery: [
      "/images/tournament/image1.jpg",
      "/images/tournament/image2.jpg",
      "/images/tournament/image3.jpg",
    ],
  };

  return (
    <>
      <Header />

      <div className="competitions-page">
        <div className="competitions-hero">
          <div className="competitions-hero-content">
            <h1>Giải Đấu Cầu Lông</h1>
            <p>Theo dõi và tham gia các giải đấu CLB mở rộng hàng tháng</p>
          </div>
        </div>

        <div className="competitions-container">
          <div className="competitions-header">
            <h2>Giải Đấu Gần Đây</h2>
            <p>Cập nhật thông tin và kết quả từ giải đấu cầu lông mới nhất</p>
          </div>

          {/* Hiển thị thông tin giải đấu gần đây */}
          <div className="recent-tournament">
            <div className="tournament-banner">
              <h3>{recentTournament.name}</h3>
              <div className="tournament-meta">
                <div className="meta-item">
                  <i className="fas fa-calendar"></i>
                  <span>{recentTournament.date}</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{recentTournament.location}</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-users"></i>
                  <span>{recentTournament.participants} vận động viên</span>
                </div>
              </div>
            </div>

            {/* Tab điều hướng */}
            <div className="tournament-tabs">
              <button
                className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <i className="fas fa-info-circle"></i>
                Tổng quan
              </button>
              <button
                className={`tab-button ${activeTab === "winners" ? "active" : ""}`}
                onClick={() => setActiveTab("winners")}
              >
                <i className="fas fa-trophy"></i>
                Người chiến thắng
              </button>
              <button
                className={`tab-button ${activeTab === "gallery" ? "active" : ""}`}
                onClick={() => setActiveTab("gallery")}
              >
                <i className="fas fa-video"></i>
                Video
              </button>
              <button
                className={`tab-button ${activeTab === "highlights" ? "active" : ""}`}
                onClick={() => setActiveTab("highlights")}
              >
                <i className="fas fa-star"></i>
                Điểm nhấn
              </button>
            </div>

            {/* Nội dung tab */}
            <div className="tournament-content">
              {/* Tab Tổng quan */}
              {activeTab === "overview" && (
                <div className="tournament-overview">
                  <div className="overview-card">
                    <h4>Thông tin chung</h4>
                    <p>
                      <strong>Ngày tổ chức:</strong> {recentTournament.date}
                    </p>
                    <p>
                      <strong>Địa điểm:</strong> {recentTournament.location}
                    </p>
                    <p>
                      <strong>Số lượng VĐV:</strong>{" "}
                      {recentTournament.participants} vận động viên
                    </p>
                    <p>
                      <strong>Nhà tài trợ:</strong>{" "}
                      {recentTournament.sponsors.join(", ")}
                    </p>
                  </div>
                  <div className="overview-card">
                    <h4>Hạng mục thi đấu</h4>
                    <ul className="categories-list">
                      {recentTournament.categories.map((category, index) => (
                        <li key={index}>
                          <i className="fas fa-check-circle"></i>
                          {category}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="overview-card highlights-card">
                    <h4>Điểm nhấn giải đấu</h4>
                    <ul>
                      {recentTournament.highlights.map((highlight, index) => (
                        <li key={index}>
                          <i className="fas fa-star"></i>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab Người chiến thắng */}
              {activeTab === "winners" && (
                <div className="tournament-winners">
                  {recentTournament.winners.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="category-winners">
                      <h4 className="category-title">{category.category}</h4>
                      <div className="winners-podium">
                        {/* Giải nhì */}
                        <div className="podium-item second-place">
                          <div className="winner-medal">
                            <i className="fas fa-medal"></i>
                            <span>2</span>
                          </div>
                          <div className="winner-avatar">
                            <img
                              src={
                                category.second.image ||
                                "/images/placeholder-user.jpg"
                              }
                              alt={category.second.name}
                            />
                          </div>
                          <h5>{category.second.name}</h5>
                          <p>{category.second.club}</p>
                        </div>

                        {/* Giải nhất */}
                        <div className="podium-item first-place">
                          <div className="winner-medal">
                            <i className="fas fa-trophy"></i>
                            <span>1</span>
                          </div>
                          <div className="winner-avatar">
                            <img
                              src={
                                category.first.image ||
                                "/images/placeholder-user.jpg"
                              }
                              alt={category.first.name}
                            />
                          </div>
                          <h5>{category.first.name}</h5>
                          <p>{category.first.club}</p>
                        </div>

                        {/* Giải ba */}
                        <div className="podium-item third-place">
                          <div className="winner-medal">
                            <i className="fas fa-medal"></i>
                            <span>3</span>
                          </div>
                          <div className="winner-avatar">
                            <img
                              src={
                                category.third.image ||
                                "/images/placeholder-user.jpg"
                              }
                              alt={category.third.name}
                            />
                          </div>
                          <h5>{category.third.name}</h5>
                          <p>{category.third.club}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Video */}
              {activeTab === "gallery" && (
                <div className="tournament-video">
                  <div className="video-container">
                    <iframe
                      width="100%"
                      height="500"
                      src="https://www.youtube.com/embed/-Ffv9cmRPgA"
                      title="Video giải đấu cầu lông"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="video-description">
                    <h4>Video highlight giải đấu</h4>
                    <p>
                      Xem lại những khoảnh khắc ấn tượng nhất từ giải đấu cầu
                      lông ĐẤT SÂN 247 Mở Rộng vừa qua
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Điểm nhấn */}
              {activeTab === "highlights" && (
                <div className="tournament-highlights">
                  <div className="highlights-intro">
                    <h4>Những khoảnh khắc đáng nhớ</h4>
                    <p>
                      Cùng nhìn lại những điểm nhấn và thành tích ấn tượng tại
                      giải đấu vừa qua
                    </p>
                  </div>

                  <div className="highlights-grid">
                    <div className="highlight-card">
                      <div className="highlight-icon">
                        <i className="fas fa-medal"></i>
                      </div>
                      <h5>Kỷ lục mới</h5>
                      <p>
                        Nguyễn Tiến Minh lập kỷ lục mới với chiến thắng 21-1
                        trong set đầu tiên với Bùi Anh Chiến
                      </p>
                    </div>

                    <div className="highlight-card">
                      <div className="highlight-icon">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <h5>Thành tích nổi bật</h5>
                      <p>
                        CLB Đất Sân 247 đạt thành tích tốt nhất với 3 huy chương
                        các loại
                      </p>
                    </div>

                    <div className="highlight-card">
                      <div className="highlight-icon">
                        <i className="fas fa-star"></i>
                      </div>
                      <h5>Trận đấu xuất sắc</h5>
                      <p>Trận Chung kết Đơn nam kéo dài 3 set căng thẳng</p>
                    </div>

                    <div className="highlight-card">
                      <div className="highlight-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <h5>Giao lưu CLB</h5>
                      <p>Đã có 12 CLB từ khắp Hà Nội tham gia giải đấu</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="competitions-header" style={{ marginTop: "60px" }}>
            <h2>Giải Đấu Sắp Diễn Ra</h2>
            <p>Cơ hội cạnh tranh và giao lưu với các CLB cầu lông hàng đầu</p>
          </div>

          <div className="empty-competitions">
            <div className="empty-competitions-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <h3>Chưa có thông tin giải đấu mới</h3>
            <p>
              Hệ thống đang cập nhật các giải đấu tiếp theo. Vui lòng quay lại
              sau!
            </p>
            <div className="empty-competitions-actions">
              <button className="notify-btn">
                <i className="fas fa-bell"></i>
                <span>Nhận thông báo khi có giải đấu mới</span>
              </button>
            </div>
          </div>

          <div className="competitions-info">
            <div className="info-card">
              <div className="info-icon">
                <i className="fas fa-medal"></i>
              </div>
              <h3>Giải thưởng hấp dẫn</h3>
              <p>Cơ hội nhận các giải thưởng giá trị cùng danh hiệu cao quý</p>
            </div>
            <div className="info-card">
              <div className="info-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Giao lưu CLB</h3>
              <p>Kết nối với cộng đồng cầu lông và mở rộng mạng lưới</p>
            </div>
            <div className="info-card">
              <div className="info-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Nâng cao trình độ</h3>
              <p>Cơ hội trau dồi kỹ năng qua các trận đấu cạnh tranh</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Competitions;
