import React, { useState, useEffect, useRef } from "react";
import "../../../shared/styles/centerDetailModal.css";
import { getCenterInfoByIdGQL } from "../api/center_service/grahql/center.api.js"; // API V2 GraphQL

const CenterDetailModal = ({ center, isOpen, onClose }) => {
  const modalRef = useRef(null);

  // State to hold the full details. Initialize with props (which is likely summary data)
  const [centerDetails, setCenterDetails] = useState(center || {});
  const [additionalImages, setAdditionalImages] = useState([]);

  // Update centerDetails when prop changes
  useEffect(() => {
    if (center) {
      setCenterDetails(center);
      // Nếu props đã có danh sách ảnh (từ logic mới của Centers.jsx), set luôn để hiển thị ngay
      if (center.imageUrlList) {
        setAdditionalImages(center.imageUrlList);
      }
    }
  }, [center]);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Handle Outside Click
  const handleOutsideClick = (e) => {
    if (e.target.className === "modal-overlay") {
      onClose();
    }
  };

  // Fetch Full Center Details via V2 GraphQL
  useEffect(() => {
    if (center && center._id) {
      console.log("Fetching full details for center:", center._id);
      // - Using getCenterInfoByIdGQL
      getCenterInfoByIdGQL(center._id)
        .then((data) => {
          if (data) {
            // Merge existing prop data with new detailed data
            setCenterDetails((prev) => ({
              ...prev,
              ...data, // Update fields: phone, description, googleMapUrl, facilities, etc.
            }));

            // 💡 CẬP NHẬT LOGIC MỚI: Lấy danh sách ảnh từ trường imageUrlList (Gateway trả về)
            if (
              Array.isArray(data.imageUrlList) &&
              data.imageUrlList.length > 0
            ) {
              setAdditionalImages(data.imageUrlList);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching center details:", error);
        });
    }
  }, [center]);

  if (!isOpen) return null;

  // Prioritize googleMapUrl from API (V2), fallback to location, fallback to default
  const googleMapUrl = centerDetails.googleMapUrl
    ? centerDetails.googleMapUrl
    : centerDetails.location
      ? centerDetails.location
      : "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.9244038028873!2d105.78076375707085!3d21.03708178599531!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab32dd484c53%3A0x4b5c0c67d46f326b!2zMTcgRG_Do24gS-G6vyBUaGnhu4duLCBNYWkgROG7i2NoLCBD4bqndSBHaeG6pXksIEjDoCBO4buZaSwgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2s!4v1680235904873!5m2!1svi!2s";

  // 💡 LOGIC CHỌN ẢNH CHÍNH (MAIN IMAGE) ĐÃ ĐƯỢC CẢI TIẾN:
  // 1. Ưu tiên ảnh từ props (do Centers.jsx đã xử lý chọn ảnh bìa)
  // 2. Nếu không có props (ví dụ reload trang), lấy từ chi tiết API (imageUrlList[0])
  // 3. Nếu không có Gallery, lấy Logo
  // 4. Fallback về default
  const mainImage =
    (center.imgUrl && center.imgUrl[0]) ||
    (centerDetails.imageUrlList && centerDetails.imageUrlList[0]) ||
    centerDetails.logoUrl ||
    (centerDetails.imgUrl && centerDetails.imgUrl[0]) || // Fallback cho cấu trúc cũ
    "/images/default.png";

  return (
    <div className="modal-overlay" onClick={handleOutsideClick}>
      <div className="modal-container" ref={modalRef}>
        <div className="modal-header">
          <h2>{centerDetails.name}</h2>
          <button
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-main-image">
            <img
              src={mainImage}
              alt={centerDetails.name}
              onError={(e) => {
                e.target.src = "/images/default.png";
              }}
            />
          </div>
          <div className="modal-section">
            <h3>
              <i className="fas fa-info-circle"></i> Thông tin chi tiết
            </h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-map-marker-alt"></i> Địa chỉ:
                </span>
                <span className="detail-value">{centerDetails.address}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-clock"></i> Giờ mở cửa:
                </span>
                <span className="detail-value">
                  {centerDetails.openHours || "05:00 - 24:00"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-phone"></i> Liên hệ:
                </span>
                <span className="detail-value">
                  {centerDetails.phone || "Đang cập nhật"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-table-tennis"></i> Số sân:
                </span>
                <span className="detail-value">
                  {centerDetails.totalCourts} sân
                </span>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>
              <i className="fas fa-map"></i> Bản đồ
            </h3>
            <div className="map-placeholder">
              <div className="map-frame">
                <iframe
                  src={googleMapUrl}
                  width="100%"
                  height="250"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  aria-hidden="false"
                  tabIndex="0"
                  title="Google Maps"
                ></iframe>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>
              <i className="fas fa-images"></i> Hình ảnh
            </h3>
            <div className="image-gallery">
              {additionalImages.length > 0 ? (
                additionalImages.map((img, index) => (
                  <div key={index} className="gallery-item">
                    <img
                      src={img}
                      alt={`${centerDetails.name} - Ảnh ${index + 1}`}
                    />
                  </div>
                ))
              ) : (
                <p>Chưa có hình ảnh bổ sung.</p>
              )}
            </div>
          </div>

          <div className="modal-section">
            <h3>
              <i className="fas fa-concierge-bell"></i> Dịch vụ
            </h3>
            <div className="services-grid">
              {centerDetails.facilities &&
              centerDetails.facilities.length > 0 ? (
                centerDetails.facilities.map((facility, index) => (
                  <div key={index} className="service-item">
                    <i className="fas fa-check-circle"></i>
                    <span>{facility}</span>
                  </div>
                ))
              ) : (
                <p>Đang cập nhật dịch vụ...</p>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Đóng
          </button>
          {
            <a
              href={`/booking?centerId=${center._id}`}
              className="book-modal-btn"
            >
              <span>Đặt Sân Ngay</span>
              <i className="fas fa-arrow-right"></i>
            </a>
          }
        </div>
      </div>
    </div>
  );
};

export default CenterDetailModal;
