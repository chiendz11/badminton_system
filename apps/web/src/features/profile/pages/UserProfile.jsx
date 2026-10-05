import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";

// Components
import Header from "../../../shared/ui/Header.jsx";
import Footer from "../../../shared/ui/Footer.jsx";
import ModalConfirmation from "../../booking/ui/ModalConfirmation.jsx";
import ProfileInfoTab from "../ui/ProfileInfoTab.jsx";
import StatsTab from "../ui/StatusTab.jsx"; // Đảm bảo file này tồn tại (tên là StatusTab.jsx hoặc StatsTab.jsx)
import HistoryTab from "../ui/HistoryTab.jsx";

// Tabs phụ
import FriendsTab from "../../social/ui/FriendsTab.jsx";
import FindFriendsTab from "../../social/ui/FindFriendsTab.jsx";
import OtherInfoTab from "../ui/OtherInfoTab.jsx";
import FriendManagementTab from "../../social/ui/FriendManagementTab.jsx";

// API V2 Imports (Theo cấu trúc thư mục mới)
import {
  cancelBooking,
  deleteBooking,
} from "../../booking/api/booking_service/rest/booking.js";
import { getUserStatistics } from "../../booking/api/booking_service/rest/user.api.js";
import {
  updateMyProfile,
  fetchUserInfo,
} from "../api/user_service/rest/users.api.js";

// Styles
import "../../../shared/styles/UserProfile.css";

// --- Helpers ---
const getStatusClass = (status) => {
  switch (status) {
    case "paid":
      return "status-completed";
    case "confirmed":
      return "status-completed";
    case "pending":
      return "status-pending";
    case "cancelled":
      return "status-cancelled";
    case "processing":
      return "status-processing";
    default:
      return "";
  }
};

const getStatusText = (status) => {
  switch (status) {
    case "paid":
      return "Hoàn thành";
    case "confirmed":
      return "Hoàn thành";
    case "pending":
      return "Đang giữ chỗ";
    case "cancelled":
      return "Đã hủy";
    case "processing":
      return "Đang xử lý";
    default:
      return "";
  }
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(SessionContext);
  const [searchParams] = useSearchParams();

  // --- 1. TAB STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTabs = [
      "info",
      "stats",
      "history",
      "friends",
      "find",
      "other-info",
      "friends-manage",
    ];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return localStorage.getItem("activeTab") || "info";
  });

  // --- 2. GLOBAL UI STATES ---
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  // Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionConfig, setActionConfig] = useState(null);

  // --- 3. PROFILE & PASSWORD STATES ---
  const [editMode, setEditMode] = useState("profile");

  // --- 4. STATISTICS STATES (QUAN TRỌNG) ---
  const [statisticsData, setStatisticsData] = useState(null); // Chứa toàn bộ data aggregate
  const [statsPeriod, setStatsPeriod] = useState("month"); // 'week' | 'month' | 'year'
  const [loadingStats, setLoadingStats] = useState(false);
  const [chartFilter, setChartFilter] = useState("all");
  const [animateStats, setAnimateStats] = useState(false);

  // Constants & Utils
  const centerName =
    localStorage.getItem("centerName") || "Tên Trung Tâm Mặc Định";
  const slotGroupsFromLS = JSON.parse(
    localStorage.getItem("slotGroups") || "[]",
  );
  const totalAmountLS = Number(localStorage.getItem("totalAmount")) || 0;
  const DEFAULT_AVATAR_URL =
    "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  const getAvatarImagePath = (path) =>
    path && path.trim() !== "" ? path : DEFAULT_AVATAR_URL;

  // --- USE EFFECTS ---

  // Sync URL -> Tab State
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTabs = [
      "info",
      "stats",
      "history",
      "friends",
      "find",
      "other-info",
      "friends-manage",
    ];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Sync Tab State -> LocalStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // Initial Page Loading Simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setAnimateStats(true), 500);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // --- [CORE LOGIC] FETCH STATISTICS ---
  // Chỉ gọi API khi đang ở tab 'stats' và có userId
  useEffect(() => {
    if (activeTab !== "stats" || !user?.userId) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        // Gọi API Aggregate duy nhất
        // Payload params: { period: 'week' | 'month' | 'year' }
        const response = await getUserStatistics({ period: statsPeriod });

        if (response) {
          setStatisticsData(response);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu thống kê:", error);
        // Có thể thêm logic setStatisticsData(null) hoặc default data ở đây nếu cần
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [statsPeriod, activeTab, user]); // Refetch khi thay đổi kỳ hạn hoặc user

  // --- HANDLERS ---

  const handleUpdateField = async (field, newValue) => {
    if (!newValue || (typeof newValue === "string" && newValue.trim() === ""))
      return;

    setIsUpdating(true);
    try {
      const updatePayload = { [field]: newValue };
      await updateMyProfile(updatePayload);
      // Cập nhật context ngay lập tức để UI phản hồi nhanh
      setUser((prev) => ({ ...prev, ...updatePayload }));
    } catch (error) {
      alert("Cập nhật thất bại: " + error.message);
      // Revert lại data cũ từ server nếu lỗi
      const originalUser = await fetchUserInfo();
      if (originalUser?.user) setUser(originalUser.user);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Action Modal Handlers (Cancel/Delete/Pay) ---
  const promptAction = (actionType, params) => {
    let title, message;
    switch (actionType) {
      case "cancel":
        title = "Hủy đặt sân";
        message = "Bạn chắc chắn muốn hủy?";
        break;
      case "delete":
        title = "Xóa booking";
        message = "Xóa khỏi lịch sử?";
        break;
      default:
        return;
    }
    setActionConfig({ type: actionType, ...params, title, message });
    setShowActionModal(true);
  };

  const promptCancelBooking = (orderId) => promptAction("cancel", { orderId });

  const handleActionModal = async (action) => {
    setShowActionModal(false);
    if (action !== "confirm" || !actionConfig) {
      setActionConfig(null);
      return;
    }

    try {
      if (actionConfig.type === "cancel") {
        await cancelBooking(actionConfig.bookingId || actionConfig.orderId);
        alert("Đã hủy thành công!");
        setRefreshHistoryTrigger((prev) => prev + 1); // Trigger reload tab History
      } else if (actionConfig.type === "delete") {
        await deleteBooking(actionConfig.bookingId);
        alert("Đã xóa!");
        setRefreshHistoryTrigger((prev) => prev + 1);
      }
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setActionConfig(null);
    }
  };

  const handleSwitchTab = (tabName) => setActiveTab(tabName);

  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="badminton-spinner"></div>
        <p className="loading-text">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="relative profile-container">
        {isUpdating && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}

        {/* PROFILE HEADER SECTION */}
        <div className="profile-header">
          <div className="header-content">
            <div className="avatar-container">
              <img
                src={getAvatarImagePath(user?.avatar_url)}
                alt="Avatar"
                className="user-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_AVATAR_URL;
                }}
              />
              <div className="level-badge">{user?.level || "Member"}</div>
            </div>
            <div className="user-info">
              <h1>{user?.name}</h1>
              <div className="user-details">
                <div>
                  <i className="fas fa-phone"></i> {user?.phone_number}
                </div>
                <div>
                  <i className="fas fa-envelope"></i> {user?.email}
                </div>
              </div>
            </div>
            <div className="membership-info">
              <div className="points-container">
                <span className="points-value">{user?.points || 0}</span> điểm
              </div>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => handleSwitchTab("info")}
          >
            <i className="fas fa-user"></i>
            <span>Thông tin</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "other-info" ? "active" : ""}`}
            onClick={() => handleSwitchTab("other-info")}
          >
            <i className="fas fa-id-card"></i>
            <span>Hồ sơ mở rộng</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => handleSwitchTab("stats")}
          >
            <i className="fas fa-chart-pie"></i>
            <span>Thống kê</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => handleSwitchTab("history")}
          >
            <i className="fas fa-history"></i>
            <span>Lịch sử</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "friends-manage" ? "active" : ""}`}
            onClick={() => handleSwitchTab("friends-manage")}
          >
            <i className="fas fa-user-friends"></i>
            <span>Bạn bè</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "friends" ? "active" : ""}`}
            onClick={() => handleSwitchTab("friends")}
          >
            <i className="fas fa-comment-dots"></i>
            <span>Tin nhắn</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "find" ? "active" : ""}`}
            onClick={() => handleSwitchTab("find")}
          >
            <i className="fas fa-search-plus"></i>
            <span>Tìm bạn</span>
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="profile-content">
          {/* 1. Tab Thông tin */}
          {activeTab === "info" && (
            <ProfileInfoTab
              user={user}
              editMode={editMode}
              setEditMode={setEditMode}

              // Handlers

              handleUpdateField={handleUpdateField}
              // Booking Context props (nếu cần hiển thị lịch sử mini bên trong tab info)
              bookingHistory={[]}
              centerName={centerName}
              slotGroupsFromLS={slotGroupsFromLS}
              totalAmountLS={totalAmountLS}
              navigate={navigate}
              promptCancelBooking={promptCancelBooking}
              getStatusClass={getStatusClass}
              getStatusText={getStatusText}
            />
          )}

          {/* 2. Tab Hồ sơ mở rộng */}
          {activeTab === "other-info" && (
            <OtherInfoTab user={user} onUpdate={handleUpdateField} />
          )}

          {/* 3. Tab Bạn bè */}
          {activeTab === "friends-manage" && (
            <FriendManagementTab user={user} />
          )}

          {/* 4. Tab Thống kê (Sử dụng Data Aggregate) */}
          {activeTab === "stats" && (
            <StatsTab
              user={user}
              statisticsData={statisticsData} // Prop quan trọng: Truyền data tổng xuống
              statsPeriod={statsPeriod}
              setStatsPeriod={setStatsPeriod}
              chartFilter={chartFilter}
              setChartFilter={setChartFilter}
              animateStats={animateStats}
              loading={loadingStats}
            />
          )}

          {/* 5. Tab Lịch sử */}
          {activeTab === "history" && (
            <HistoryTab
              user={user}
              key={refreshHistoryTrigger} // Key thay đổi sẽ ép React remount component để reload data
              navigate={navigate}
              promptAction={promptAction}
              getStatusClass={getStatusClass}
              getStatusText={getStatusText}
            />
          )}

          {/* 6. Tab Chat & Tìm bạn */}
          {activeTab === "friends" && <FriendsTab currentUser={user} />}
          {activeTab === "find" && <FindFriendsTab currentUser={user} />}
        </div>
      </div>

      <Footer />

      {/* GLOBAL MODAL */}
      {showActionModal && (
        <ModalConfirmation
          title={actionConfig?.title}
          message={actionConfig?.message}
          onAction={handleActionModal}
        />
      )}
    </>
  );
};

export default UserProfile;
