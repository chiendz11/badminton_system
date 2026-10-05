import React, { useState, useEffect, useRef, useContext } from "react";
import "../../../shared/styles/centerDetailModal.css";
import { getCenterInfoByIdGQL } from "../api/center_service/grahql/center.api.js"; // API V2 GraphQL
import { submitRating } from "../../ratings/api/rating_service/rest/rating.api.js";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import { getCommentsForCenter } from "../../ratings/api/rating_service/rest/rating.api.js";

const CenterDetailModal = ({ center, isOpen, onClose }) => {
  const modalRef = useRef(null);

  // State to hold the full details. Initialize with props (which is likely summary data)
  const [centerDetails, setCenterDetails] = useState(center || {});
  const [additionalImages, setAdditionalImages] = useState([]);

  const [reviewContent, setReviewContent] = useState("");
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useContext(SessionContext);
  const userId = user?._id;

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
      if (e.key === "Escape") {
        if (showConfirmModal) {
          setShowConfirmModal(false);
        } else if (showErrorModal) {
          setShowErrorModal(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, showConfirmModal, showErrorModal]);

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

  // Fetch Reviews (Legacy)
  useEffect(() => {
    if (center && center._id) {
      getCommentsForCenter(center._id)
        .then((data) => {
          if (data && data.reviews) {
            setReviews(data.reviews);
          }
        })
        .catch((error) => {
          console.error("Error fetching comments:", error);
        });
    }
  }, [center]);

  // Submit Review Handler
  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!userId) {
      setErrorMessage("Vui lòng đăng nhập để đánh giá!");
      setShowErrorModal(true);
      return;
    }
    if (reviewContent.trim() === "") {
      setErrorMessage("Vui lòng nhập nội dung đánh giá!");
      setShowErrorModal(true);
      return;
    }
    setErrorMessage("");
    setShowErrorModal(false);
    setShowConfirmModal(true);
  };

  // Confirm Submit
  const confirmSubmitReview = async () => {
    // Payload đầy đủ cho rating service
    const ratingData = {
      centerId: center._id,
      userId: userId,
      userName: user?.name || user?.username || "Người dùng",
      stars: selectedRating,
      comment: reviewContent,
    };

    try {
      const data = await submitRating(ratingData);
      if (data && data.rating) {
        setReviews([data.rating, ...reviews]); // cập nhật review list ngay lập tức
        alert("Đánh giá của bạn đã được gửi thành công!");
      }
      setReviewContent("");
      setSelectedRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
      setErrorMessage(
        error?.message || "Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại!",
      );
      setShowErrorModal(true);
    } finally {
      setShowConfirmModal(false);
    }
  };

  const renderRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<i key={i} className="fas fa-star"></i>);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<i key={i} className="fas fa-star-half-alt"></i>);
      } else {
        stars.push(<i key={i} className="far fa-star"></i>);
      }
    }
    return stars;
  };

  const renderSelectableStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`selectable-star ${star <= (hoverRating || selectedRating) ? "active" : ""}`}
        onClick={() => setSelectedRating(star)}
        onMouseEnter={() => setHoverRating(star)}
        onMouseLeave={() => setHoverRating(0)}
      >
        <i
          className={`${star <= (hoverRating || selectedRating) ? "fas" : "far"} fa-star`}
        ></i>
      </span>
    ));
  };

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

          <div className="modal-section">
            <h3>
              <i className="fas fa-star"></i> Đánh giá từ khách hàng
            </h3>
            <div className="reviews-container">
              {reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="review-user">
                      <i className="fas fa-user-circle"></i>
                      <span>{review.user}</span>
                    </div>
                    <div className="review-rating">
                      <div className="stars">
                        {renderRatingStars(review.stars)}
                      </div>
                      <span className="review-date">{review.date}</span>
                    </div>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </div>
              ))}
            </div>
            {/* Review submission form */}
            <div className="review-form-container">
              <h4>Viết đánh giá của bạn</h4>
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="rating-selector">
                  <label>Đánh giá của bạn:</label>
                  <div className="star-rating">{renderSelectableStars()}</div>
                </div>
                <div className="comment-input">
                  <textarea
                    placeholder="Chia sẻ trải nghiệm của bạn về sân..."
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button type="submit" className="submit-review-btn">
                  <i className="fas fa-paper-plane"></i> Gửi đánh giá
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Đóng
          </button>
          {
            <a
              href={`/booking?centerId=${center._id}&user=${userId || ""}`}
              className="book-modal-btn"
            >
              <span>Đặt Sân Ngay</span>
              <i className="fas fa-arrow-right"></i>
            </a>
          }
        </div>
      </div>

      {/* Modal xác nhận gửi đánh giá */}
      {showConfirmModal && (
        <>
          <div
            className="modal-overlay confirm-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 2000,
              display: "block",
            }}
            onClick={() => setShowConfirmModal(false)}
          />
          <div
            className="confirm-modal"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "10px",
              zIndex: 2100,
              width: "300px",
              textAlign: "center",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                fontSize: "1.25rem",
                fontWeight: "bold",
              }}
            >
              Xác nhận đánh giá
            </h3>
            <p style={{ marginBottom: "20px", fontSize: "1rem" }}>
              Bạn có chắc chắn về đánh giá này không?. Nếu hệ thống phát hiện
              bạn đánh giá của bạn có chứa từ ngữ tiêu cực thì sẽ trừ 500 điểm
              của bạn.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                onClick={confirmSubmitReview}
                style={{
                  backgroundColor: "#34a853",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Xác nhận
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  backgroundColor: "#e50914",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal thông báo lỗi */}
      {showErrorModal && (
        <>
          <div
            className="modal-overlay confirm-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 2000,
              display: "block",
            }}
            onClick={() => setShowErrorModal(false)}
          />
          <div
            className="confirm-modal"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "10px",
              zIndex: 2100,
              width: "300px",
              textAlign: "center",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#e50914",
              }}
            >
              Lỗi khi gửi đánh giá
            </h3>
            <p
              style={{ marginBottom: "20px", fontSize: "1rem", color: "#333" }}
            >
              {errorMessage}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              style={{
                backgroundColor: "#e50914",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Đóng
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CenterDetailModal;
