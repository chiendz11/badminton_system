import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../../shared/styles/centers.css";
import Footer from "../../../shared/ui/Footer.jsx";
import Header from "../../../shared/ui/Header.jsx";
import { checkMyExistsPendingBooking } from "../../booking/api/booking_service/rest/user.api.js";

import {
  getAllCentersGQL,
  getCenterInfoByIdGQL,
} from "../api/center_service/grahql/center.api.js";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import CenterDetailModal from "./CenterDetailModal.jsx";

const Centers = () => {
  const { user } = useContext(SessionContext);
  const openHours = "05:00 - 24:00";
  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();

  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Dữ liệu đối tác
  const partners = [
    {
      name: "Yonex",
      logo: "/images/partners/yonex.jpg",
      url: "https://www.yonex.com",
    },
    {
      name: "Victor",
      logo: "/images/partners/victor.png",
      url: "https://www.victorsport.com",
    },
    {
      name: "Li-Ning",
      logo: "/images/partners/lining.png",
      url: "https://www.lining.com",
    },
  ];

  const openModal = (center) => {
    setSelectedCenter(center);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const fetchCenters = async () => {
    try {
      setLoading(true);
      // Using getAllCentersGQL
      const data = await getAllCentersGQL();
      console.log("Fetched centers data:", data);

      // Map GraphQL data to Component structure
      const mappedCenters = data.map((c) => {
        // 💡 LOGIC MỚI: Ưu tiên ảnh sân (imageUrlList[0]) làm ảnh bìa
        // Nếu không có ảnh sân thì mới dùng logoUrl
        const coverImage =
          c.imageUrlList && c.imageUrlList.length > 0
            ? c.imageUrlList[0]
            : c.logoUrl;

        return {
          ...c,
          _id: c.centerId, // Map centerId to _id for compatibility
          imgUrl: coverImage ? [coverImage] : [], // Map thành mảng chứa 1 ảnh bìa
          // Description and facilities handled in render
        };
      });

      setCenters(mappedCenters);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const goToBooking = async (centerId) => {
    // ============================================================
    // 🛑 2. CHECK SPAM (SIMPLE VERSION)
    // ============================================================
    if (user?.isSpamming) {
      // Chỉ thông báo chung chung, không cần tính toán giờ
      alert(
        `🚫 TÀI KHOẢN TẠM KHÓA!\n\n` +
          `Bạn đang bị chặn đặt sân do vi phạm chính sách "Giữ chỗ không thanh toán" nhiều lần.\n` +
          `Vui lòng thử lại sau 30 phút.`,
      );
      return; // ⛔ Dừng lại ngay, không cho đi tiếp
    }
    // ============================================================

    try {
      // Logic kiểm tra Pending cũ của bạn
      // (Lưu ý: đoạn này bạn đang hardcode true, nhớ sửa lại call API thật nhé)
      const checkResult = await checkMyExistsPendingBooking(centerId);

      if (checkResult && checkResult.exists) {
        alert(
          "⚠️ BẠN ĐANG CÓ ĐƠN GIỮ CHỖ!\n\n" +
            "Bạn đã có một đơn đang giữ chỗ tại trung tâm này.\n" +
            "Vui lòng xem lịch sử đặt sân hoặc chờ đơn giữ chỗ tự hết hạn.",
        );
      } else {
        const centerInfo = await getCenterInfoByIdGQL(centerId);

        if (centerInfo) {
          localStorage.setItem("centerName", centerInfo.name);
        }
        const bookingData = { centerId, date: today };
        localStorage.setItem("bookingData", JSON.stringify(bookingData));
        navigate("/booking");
      }
    } catch (error) {
      alert("Lỗi kiểm tra booking pending: " + error.message);
    }
  };

  const renderFacilities = (facilities) => {
    if (!facilities || facilities.length === 0) return null;
    return (
      <div className="center-facilities">
        {facilities.map((facility, index) => (
          <span key={index} className="facility-tag">
            {facility}
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      <Header />

      <div className="centers-page">
        <div className="hero-section">
          <div className="hero-content">
            <h1>Chọn Cơ Sở Yêu Thích Của Bạn</h1>
            <p>Tìm và đặt sân cầu lông tốt nhất tại Hà Nội</p>
            <div className="hero-stats">
              <div className="stat-item">
                <i className="fas fa-medal"></i>
                <div className="stat-info">
                  <span className="stat-number">4</span>
                  <span className="stat-label">Cơ sở hàng đầu</span>
                </div>
              </div>
              <div className="stat-item">
                <i className="fas fa-table-tennis"></i>
                <div className="stat-info">
                  <span className="stat-number">20</span>
                  <span className="stat-label">Sân cầu lông</span>
                </div>
              </div>
              <div className="stat-item">
                <i className="fas fa-users"></i>
                <div className="stat-info">
                  <span className="stat-number">1000+</span>
                  <span className="stat-label">Đặt sân/tháng</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="centers-header">
          <h2>Các Cơ Sở Cầu Lông tại Hà Nội</h2>
          <p>Vui lòng chọn một trong các cơ sở cầu lông dưới đây để đặt sân</p>
        </div>

        {loading ? (
          <p data-testid="centers-loading-message">Đang tải...</p>
        ) : error ? (
          <p data-testid="centers-error-message">Error: {error}</p>
        ) : (
          <div className="centers-grid">
            {centers.map((center) => (
              <div
                key={center._id}
                className="center-card"
                data-testid={`center-card-${center._id}`}
              >
                <div className="center-image">
                  <img
                    src={
                      center.imgUrl && center.imgUrl[0]
                        ? center.imgUrl[0]
                        : "/images/default.png"
                    }
                    alt={center.name}
                    onError={(e) => {
                      e.target.src = "/images/default.png";
                    }}
                    data-testid={`center-image-${center._id}`}
                  />
                  <div
                    className="center-badge"
                    data-testid={`center-total-courts-badge-${center._id}`}
                  >
                    <i className="fas fa-table-tennis"></i> {center.totalCourts}{" "}
                    sân
                  </div>
                  {center.popularity && (
                    <div
                      className="center-popular-tag"
                      data-testid={`center-popularity-${center._id}`}
                    >
                      <i className="fas fa-fire"></i> {center.popularity}
                    </div>
                  )}
                  {center.promotion && (
                    <div
                      className="center-promo-badge"
                      data-testid={`center-promotion-${center._id}`}
                    >
                      <i className="fas fa-tags"></i> {center.promotion}
                    </div>
                  )}
                </div>
                <div className="center-info">
                  <div className="center-header">
                    <h2 data-testid={`center-name-${center._id}`}>
                      {center.name}
                    </h2>
                  </div>
                  <div
                    className="center-booking-stats"
                    data-testid={`center-booking-stats-${center._id}`}
                  >
                    <i className="fas fa-calendar-check"></i>
                    <span>{center.bookingCount || 0}+ lượt đặt tháng này</span>
                  </div>
                  <p
                    className="center-address"
                    data-testid={`center-address-${center._id}`}
                  >
                    <i className="fas fa-map-marker-alt"></i> {center.address}
                  </p>
                  <div className="center-divider"></div>
                  {center.description && (
                    <p
                      className="center-description"
                      data-testid={`center-description-${center._id}`}
                    >
                      {center.description}
                    </p>
                  )}
                  {renderFacilities(center.facilities)}

                  <div className="center-footer">
                    <div className="center-details">
                      <span data-testid={`center-open-hours-${center._id}`}>
                        <i className="fas fa-clock"></i> {openHours}
                      </span>
                      <span data-testid={`center-phone-${center._id}`}>
                        <i className="fas fa-phone"></i>{" "}
                        {center.phone || "Liên hệ"}
                      </span>
                    </div>
                    <div className="center-action-buttons">
                      <button
                        className="view-details-btn"
                        onClick={() => openModal(center)}
                        title="Xem chi tiết"
                        data-testid={`center-details-button-${center._id}`}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        onClick={() => goToBooking(center._id)}
                        className="book-center-btn"
                        data-testid={`book-now-button-${center._id}`}
                      >
                        <span>Đặt Sân Ngay</span>
                        <i className="fas fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="partners-section">
          <div className="section-header">
            <h2>Đối Tác Của Chúng Tôi</h2>
            <p>Hợp tác cùng những thương hiệu cầu lông hàng đầu thế giới</p>
          </div>

          <div className="partners-logo-container">
            {partners.map((partner, index) => (
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="partner-logo"
                key={index}
                data-testid={`partner-logo-${partner.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <img src={partner.logo} alt={partner.name} />
              </a>
            ))}
          </div>
        </div>

        <div className="centers-info-section">
          <div className="info-card" data-testid="info-card-safe-booking">
            <div className="info-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Đặt Sân An Toàn</h3>
            <p>Thanh toán bảo mật và đảm bảo hoàn tiền nếu có vấn đề</p>
          </div>
          <div className="info-card" data-testid="info-card-fast-booking">
            <div className="info-icon">
              <i className="fas fa-bolt"></i>
            </div>
            <h3>Đặt Sân Nhanh Chóng</h3>
            <p>Chỉ mất vài phút để hoàn tất đặt sân và nhận xác nhận</p>
          </div>
          <div className="info-card" data-testid="info-card-quality-experience">
            <div className="info-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Trải Nghiệm Chất Lượng</h3>
            <p>Tất cả các cơ sở đều được đánh giá và kiểm duyệt chất lượng</p>
          </div>
        </div>

        {selectedCenter && (
          <CenterDetailModal
            center={selectedCenter}
            isOpen={modalOpen}
            onClose={closeModal}
            data-testid="center-detail-modal"
          />
        )}
      </div>

      <Footer />
    </>
  );
};

export default Centers;
