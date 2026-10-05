import React, { useState, useContext, useEffect, useRef } from "react";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import EditableInfoCard from "./EditableInfoCard.jsx";

// 💡 IMPORT API UPLOAD MỚI (Best Practice)
// (Đảm bảo đường dẫn này là chính xác)
import { updateAvatar } from "../api/user_service/rest/users.api.js";

// Constants
const pointsPerLevel = 1000;

const ProfileInfoTab = ({
  user,
  editMode,
  setEditMode,

  handleUpdateField, // Prop này CHỈ dùng cho EditableInfoCard
  bookingHistory,
  centerName,
  slotGroupsFromLS,
  totalAmountLS,
  navigate,
  promptCancelBooking,
  getStatusClass,
  getStatusText,
}) => {
  const { setUser } = useContext(SessionContext);
  const DEFAULT_AVATAR_URL =
    "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  // --- Logic xử lý Avatar ---

  // Backend (UserService) luôn trả về URL đầy đủ (Cloudinary URL).
  // 💡 SỬA LOGIC HIỂN THỊ:
  const getAvatarImagePath = (path) => {
    // Nếu path có giá trị (khác null/undefined/empty) -> Dùng path
    if (path && path.trim() !== "") {
      return path;
    }
    // Nếu path là null -> Trả về ảnh mặc định
    return DEFAULT_AVATAR_URL;
  };

  const [previewImage, setPreviewImage] = useState(
    getAvatarImagePath(user?.avatar_url),
  );
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false); // Thêm trạng thái uploading

  // Cập nhật previewImage khi user.avatar_url thay đổi (từ Context)
  // Đây là mấu chốt để ảnh tự cập nhật sau khi upload thành công!
  useEffect(() => {
    const imagePath = getAvatarImagePath(user?.avatar_url);
    setPreviewImage(imagePath);
    console.log("Cập nhật ảnh đại diện:", imagePath);
  }, [user?.avatar_url]);

  // Xử lý khi người dùng chọn ảnh (Best Practice)
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Kiểm tra file (Giữ nguyên)
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Vui lòng chọn file ảnh (JPEG, PNG, GIF)!");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Kích thước ảnh không được vượt quá 5MB!");
      return;
    }
    setError("");

    // Hiển thị ảnh xem trước (Local URL)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);

    setIsUploading(true); // Bắt đầu loading

    // 2. GỌI API UPLOAD (Best Practice)
    try {
      // Gửi file thô lên (Backend sẽ xử lý Proxy)
      const updatedProfile = await updateAvatar(file);

      // 3. Cập nhật SessionContext với profile mới
      setUser(updatedProfile);
      console.log("Cập nhật avatar thành công!");
    } catch (err) {
      setError("Lỗi khi cập nhật ảnh đại diện. Vui lòng thử lại!");
      console.error("Lỗi upload avatar:", err);
      // Khôi phục ảnh cũ (từ user context)
      const imagePath = getAvatarImagePath(user?.avatar_url);
      setPreviewImage(imagePath);
    } finally {
      setIsUploading(false); // Kết thúc loading
      e.target.value = null; // Reset input file
    }
  };

  // Mở file input khi nhấp vào nút "Thay đổi avatar"
  const handleChangeAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current.click();
  };

  // --- Logic tính điểm (Giữ nguyên) ---
  const userPoints = user?.points || 0;
  const currentLevelName = user?.level || "Sắt";
  const currentLevelIndex = user?.level
    ? ["Sắt", "Đồng", "Bạc", "Vàng", "Bạch kim"].indexOf(currentLevelName)
    : 0;
  const nextLevelIndex = currentLevelIndex < 4 ? currentLevelIndex + 1 : null;
  const pointsInCurrentLevel = userPoints - currentLevelIndex * pointsPerLevel;
  const progressPercentage = (pointsInCurrentLevel / pointsPerLevel) * 100;
  const pointsToNextLevel =
    nextLevelIndex !== null ? pointsPerLevel - pointsInCurrentLevel : 0;
  const nextLevelName =
    nextLevelIndex !== null
      ? ["Sắt", "Đồng", "Bạc", "Vàng", "Bạch kim"][nextLevelIndex]
      : "";
  const upcomingBookings = bookingHistory.filter(
    (booking) => booking.status === "pending",
  );

  return (
    <div id="profile-info-tab" className="tab-content info-content">
      <div className="section-title">
        <i className="fas fa-user-edit"></i>
        <h2>Thông tin cá nhân</h2>
      </div>
      <div className="info-container">
        {/* --- CỘT BÊN TRÁI (SIDEBAR) --- */}
        <div className="info-sidebar">
          <div className="profile-overview">
            <div className="profile-image-container">
              <img
                id="profile-avatar-image"
                src={previewImage}
                alt="Avatar"
                className={`profile-image ${isUploading ? "opacity-50" : ""}`}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/150x150?text=Avatar";
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full">
                  <i className="fas fa-spinner fa-spin text-white text-2xl"></i>
                </div>
              )}
              <button
                id="change-avatar-button"
                className="change-avatar-btn"
                onClick={handleChangeAvatarClick}
                title="Thay đổi ảnh đại diện"
                disabled={isUploading}
              >
                <i className="fas fa-camera"></i>
              </button>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/jpeg,image/png,image/gif"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>
            {error && (
              <p
                id="avatar-error-message"
                className="text-red-500 text-sm mt-2"
              >
                {error}
              </p>
            )}
            <h3 id="profile-name" className="profile-name">
              {user?.name}
            </h3>
            <p id="profile-email" className="profile-email">
              {user?.email}
            </p>
            <div id="membership-badge" className="membership-badge">
              <i className="fas fa-gem"></i>
              <span>Thành viên {currentLevelName}</span>
            </div>

            {/* (Phần Progress Bar) */}
            <div id="progress-container" className="progress-container">
              <div className="progress-info">
                <span>Điểm thành viên ({currentLevelName})</span>
                <span>
                  {pointsInCurrentLevel}/{pointsPerLevel}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  id="level-progress-bar"
                  className="progress"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="progress-note">
                {nextLevelIndex !== null
                  ? `Còn ${pointsToNextLevel} điểm để lên ${nextLevelName}`
                  : "Bạn đã đạt cấp cao nhất!"}
              </p>
            </div>
          </div>

          {/* 💡 LOGIC BEST PRACTICE: ẨN NÚT ĐỔI MẬT KHẨU CHO USER GOOGLE */}
          <div className="info-actions">
            <button
              id="edit-profile-button"
              className={`action-btn ${editMode === "profile" ? "primary" : "secondary"}`}
              onClick={() => setEditMode("profile")}
            >
              <i className="fas fa-edit"></i>
              <span>Chỉnh sửa hồ sơ</span>
            </button>
          </div>
        </div>

        {/* --- CỘT BÊN PHẢI (CHI TIẾT) --- */}
        <div id="profile-details-container" className="info-details-container">
          {/* 💡 LOGIC BEST PRACTICE: ẨN FORM ĐỔI MẬT KHẨU CHO USER GOOGLE */}

          {
            <>
              {/* --- PHẦN THÔNG TIN CƠ BẢN (HIỂN THỊ MẶC ĐỊNH) --- */}
              <div id="basic-info-section" className="info-section">
                <h3 className="info-section-title">
                  <i className="fas fa-user"></i>
                  <span>Thông tin cơ bản</span>
                </h3>
                {/* Sử dụng EditableInfoCard (mà chúng ta đã sửa)
                  và truyền hàm handleUpdateField (từ UserProfile.jsx)
                */}
                <div className="info-grid">
                  <EditableInfoCard
                    label="Họ và tên"
                    value={user?.name}
                    onConfirm={(newValue) =>
                      handleUpdateField("name", newValue)
                    }
                  />
                  <EditableInfoCard
                    label="Số điện thoại"
                    value={user?.phone_number}
                    onConfirm={(newValue) =>
                      handleUpdateField("phone_number", newValue)
                    }
                  />
                  <EditableInfoCard
                    label="Email"
                    value={user?.email}
                    onConfirm={(newValue) =>
                      handleUpdateField("email", newValue)
                    }
                  />
                </div>
              </div>

              {/* --- PHẦN LỊCH ĐẶT SẮP TỚI --- */}
              <div id="upcoming-bookings-section" className="upcoming-bookings">
                <div className="section-title">
                  <i className="fas fa-calendar-alt"></i>
                  <h2>Lịch đặt sắp tới</h2>
                </div>
                {upcomingBookings.length > 0 ? (
                  <div id="upcoming-bookings-grid" className="upcoming-grid">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking._id}
                        id={`booking-card-${booking.orderId}`}
                        className="upcoming-card"
                      >
                        <div className="upcoming-header">
                          <span
                            id={`booking-id-${booking.orderId}`}
                            className="upcoming-id"
                          >
                            #{booking.orderId}
                          </span>
                          <span
                            id={`booking-status-${booking.orderId}`}
                            className={`upcoming-status ${getStatusClass(booking.status)}`}
                          >
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                        <div className="upcoming-details">
                          <div className="upcoming-detail">
                            <i className="fas fa-map-marker-alt"></i>
                            <span id={`booking-center-${booking.orderId}`}>
                              {centerName}
                            </span>
                          </div>
                          <div className="upcoming-detail">
                            <i className="fas fa-table-tennis"></i>
                            <span
                              id={`booking-court-details-${booking.orderId}`}
                            >
                              {slotGroupsFromLS.length > 0
                                ? slotGroupsFromLS.map((group, idx) => (
                                    <React.Fragment key={idx}>
                                      <span>
                                        {group.courtName}: {group.timeStr}
                                      </span>
                                      {idx < slotGroupsFromLS.length - 1 && (
                                        <br />
                                      )}
                                    </React.Fragment>
                                  ))
                                : booking.court}
                            </span>
                          </div>
                          <div className="upcoming-detail">
                            <i className="fas fa-calendar-day"></i>
                            <span id={`booking-date-${booking.orderId}`}>
                              {booking.date}
                            </span>
                          </div>
                        </div>
                        <div className="upcoming-price">
                          <span id={`booking-total-amount-${booking.orderId}`}>
                            {totalAmountLS.toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                        <div className="upcoming-actions">
                          <button
                            id={`cancel-booking-button-${booking.orderId}`}
                            className="cancel-btn"
                            onClick={() => promptCancelBooking(booking.orderId)}
                          >
                            Hủy Đặt Sân
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p id="no-upcoming-bookings-message">
                    Không có lịch đặt sắp tới.
                  </p>
                )}
              </div>
            </>
          }
        </div>
      </div>
    </div>
  );
};

export default ProfileInfoTab;
