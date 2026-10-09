import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";

// Components
import Header from "../../../shared/ui/Header.jsx";
import Footer from "../../../shared/ui/Footer.jsx";
import ModalConfirmation from "../ui/ModalConfirmation.jsx";
import StatsTab from "../ui/StatusTab.jsx"; // Đảm bảo file này tồn tại (tên là StatusTab.jsx hoặc StatsTab.jsx)
import HistoryTab from "../ui/HistoryTab.jsx";

// API V2 Imports (Theo cấu trúc thư mục mới)
import {
  cancelBooking,
  deleteBooking,
} from "../api/booking_service/rest/booking.js";
import { getUserStatistics } from "../api/booking_service/rest/user.api.js";

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
      return "Đã xác nhận";
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

const MyBookings = () => {
  const navigate = useNavigate();
  const { user } = useContext(SessionContext);
  const [searchParams] = useSearchParams();

  // --- 1. TAB STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTabs = ["stats", "history"];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    const saved = localStorage.getItem("bookingActiveTab");
    return ["stats", "history"].includes(saved) ? saved : "history";
  });

  // --- 2. GLOBAL UI STATES ---
  const [isLoading, setIsLoading] = useState(true);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  // Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionConfig, setActionConfig] = useState(null);

  // --- 4. STATISTICS STATES (QUAN TRỌNG) ---
  const [statisticsData, setStatisticsData] = useState(null); // Chứa toàn bộ data aggregate
  const [statsPeriod, setStatsPeriod] = useState("month"); // 'week' | 'month' | 'year'
  const [loadingStats, setLoadingStats] = useState(false);
  const [chartFilter, setChartFilter] = useState("all");
  const [animateStats, setAnimateStats] = useState(false);

  const DEFAULT_AVATAR_URL =
    "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  const getAvatarImagePath = (path) =>
    path && path.trim() !== "" ? path : DEFAULT_AVATAR_URL;

  // --- USE EFFECTS ---

  // Sync URL -> Tab State
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTabs = ["stats", "history"];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Sync Tab State -> LocalStorage
  useEffect(() => {
    localStorage.setItem("bookingActiveTab", activeTab);
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

  // --- Action Modal Handlers (Cancel/Delete) ---
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
      <div className="relative profile-container booking-history-page">
        <div className="profile-header">
          <div className="header-content">
            <div className="avatar-container">
              <img
                src={getAvatarImagePath(user?.avatar_url)}
                alt="Avatar"
                className="user-avatar"
              />
            </div>
            <div className="user-info">
              <h1>{user?.name || "Lịch đặt sân"}</h1>
              <p>Lịch đặt sân của tôi</p>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="profile-tabs">
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
        </div>

        {/* TAB CONTENT AREA */}
        <div className="profile-content">
          {/* 4. Tab Thống kê (Sử dụng Data Aggregate) */}
          {activeTab === "stats" && (
            <StatsTab
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

export default MyBookings;
