import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import { ROLES } from "../../../shared/constants/roles.js";

// IMPORT LOADING SPINNER
import LoadingSpinner from "../../../shared/ui/LoadingSpinner.jsx";

// IMPORT ICONS
import {
  MdOutlineSportsSoccer,
  MdOutlineSpaceDashboard,
  MdShoppingCart,
  MdReceipt,
  MdAccountCircle,
  MdOutlineBarChart,
  MdStorage,
  MdCalendarToday,
  MdPeopleAlt,
  MdOutlineNewspaper,
  MdOutlineStar,
  MdExitToApp,
  MdBusiness,
} from "react-icons/md";

// --- Hàm getFeatureIcon và các hằng số màu sắc (GIỮ NGUYÊN) ---
const getFeatureIcon = (title) => {
  switch (title) {
    case "Xem trạng thái sân":
      return <MdOutlineSpaceDashboard size={30} />;
    case "Quản lý trung tâm":
      return <MdBusiness size={30} />;
    case "Bán hàng":
      return <MdShoppingCart size={30} />;
    case "Quản lý Đơn hàng/Hóa đơn":
      return <MdReceipt size={30} />;
    case "Quản lý Tài khoản":
      return <MdAccountCircle size={30} />;
    case "Báo cáo doanh thu":
      return <MdOutlineBarChart size={30} />;
    case "Quản lý kho":
      return <MdStorage size={30} />;
    case "Tạo Lịch cố định":
      return <MdCalendarToday size={30} />;
    case "Quản lý khách hàng":
      return <MdPeopleAlt size={30} />;
    case "Quản lý tin tức":
      return <MdOutlineNewspaper size={30} />;
    case "Quản lý đánh giá":
      return <MdOutlineStar size={30} />;
    default:
      return <MdOutlineSportsSoccer size={30} />;
  }
};

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

const PRIMARY_COLOR = "#10B981";
const BACKGROUND_COLOR = "#F0FFF4";
const CARD_BG_COLOR = "#FFFFFF";
const TEXT_COLOR = "#1F2937";
const LOGOUT_COLOR = "#EF4444";

const featureCardStyle = {
  background: CARD_BG_COLOR,
  padding: "35px 25px",
  borderRadius: "16px",
  cursor: "pointer",
  color: TEXT_COLOR,
  boxShadow: "0 8px 16px rgba(16, 185, 129, 0.1)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  border: "1px solid #E5E7EB",
  textAlign: "center",
};

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const { admin } = useContext(SessionContext);

  const [isNavigating, setIsNavigating] = useState(false);

  // Hàm wrapper để chuyển trang
  const handleNavigate = (path) => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate(path);
    }, 50);
  };

  // 💡 FIX LỖI LOOP: Đưa danh sách vào trong useMemo và tối ưu dependency
  const featuresToShow = useMemo(() => {
    // Định nghĩa danh sách feature ngay trong useMemo để không bị tạo lại mỗi lần render
    // Dùng đường dẫn tĩnh (path) thay vì hàm (onClick) để tránh phụ thuộc vào navigate
    const allFeatures = [
      {
        title: "Xem trạng thái sân",
        path: "/center-status",
        roles: ["super_admin", "center_manager"],
      },
      {
        title: "Quản lý trung tâm",
        path: "/center-management",
        roles: ["super_admin", "center_manager"],
      },
      {
        title: "Bán hàng",
        path: "/shop",
        roles: ["super_admin", "center_manager"],
      },
      {
        title: "Quản lý Đơn hàng/Hóa đơn",
        path: "/admin-bill-list",
        roles: ["super_admin", "center_manager"],
      },
      {
        title: "Quản lý Tài khoản",
        path: "/account",
        roles: ["super_admin", "center_manager"],
      },
      { title: "Báo cáo doanh thu", path: "/report", roles: ["super_admin"] },
      { title: "Quản lý kho", path: "/stock", roles: ["super_admin"] },
      {
        title: "Tạo Lịch cố định",
        path: "/create-fixed-booking",
        roles: ["super_admin"],
      },
      {
        title: "Quản lý khách hàng",
        path: "/users-manage",
        roles: ["super_admin"],
      },
      { title: "Quản lý tin tức", path: "/news", roles: ["super_admin"] },
      { title: "Quản lý đánh giá", path: "/ratings", roles: ["super_admin"] },
      {
        title: "Quản lý Center Manager",
        path: "/center-manager-management",
        roles: ["super_admin"],
      },
    ];

    return admin?.role
      ? allFeatures.filter((feature) => feature.roles.includes(admin.role))
      : allFeatures;

    // 💡 QUAN TRỌNG: Chỉ phụ thuộc vào admin.role (primitive value).
    // Tránh dùng [admin] vì object admin có thể thay đổi reference gây loop.
  }, [admin?.role]);

  return (
    <div
      style={{
        padding: "20px 40px",
        fontFamily: "Inter, sans-serif",
        background: BACKGROUND_COLOR,
        minHeight: "100vh",
        color: TEXT_COLOR,
      }}
    >
      {isNavigating && <LoadingSpinner fullPage={true} color={PRIMARY_COLOR} />}

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          background: CARD_BG_COLOR,
          borderRadius: "12px",
          padding: "20px 30px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={getAvatarImagePath(admin?.avatar_url)}
            alt="avatar"
            style={{
              width: 70,
              height: 70,
              borderRadius: "20%",
              objectFit: "cover",
              marginRight: "15px",
              border: `3px solid ${PRIMARY_COLOR}`,
            }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.85em",
                color: "#6B7280",
                fontWeight: "500",
              }}
            >
              {admin?.role === ROLES.SUPER_ADMIN
                ? "QUẢN LÝ HỆ THỐNG"
                : "QUẢN LÝ TRUNG TÂM"}
            </p>
            <h1
              style={{
                fontSize: "2em",
                fontWeight: "800",
                margin: 0,
                color: PRIMARY_COLOR,
                letterSpacing: "-0.5px",
              }}
            >
              {admin?.name || "Admin"}
            </h1>
          </div>
        </div>
      </header>

      <h2
        style={{
          fontSize: "1.6em",
          marginBottom: "25px",
          color: TEXT_COLOR,
          fontWeight: "700",
        }}
      >
        <MdOutlineSportsSoccer
          style={{ color: PRIMARY_COLOR, marginRight: "10px" }}
          size={24}
        />
        Các Tính Năng Quản Trị
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "25px",
        }}
      >
        {featuresToShow.map((item, index) => (
          <div
            key={index}
            // 💡 Thay đổi: Truyền path thay vì hàm
            onClick={() => handleNavigate(item.path)}
            style={featureCardStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = `0 15px 30px rgba(16, 185, 129, 0.2)`;
              e.currentTarget.style.border = `1px solid ${PRIMARY_COLOR}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 8px 16px rgba(16, 185, 129, 0.1)";
              e.currentTarget.style.border = "1px solid #E5E7EB";
            }}
          >
            <div
              style={{
                color: CARD_BG_COLOR,
                marginBottom: "15px",
                background: PRIMARY_COLOR,
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 8px rgba(16, 185, 129, 0.4)`,
              }}
            >
              {getFeatureIcon(item.title)}
            </div>
            <h3
              style={{
                fontSize: "1.3em",
                fontWeight: "700",
                margin: "15px 0 5px 0",
                color: TEXT_COLOR,
              }}
            >
              {item.title}
            </h3>
            <p style={{ fontSize: "0.9em", color: "#6B7280", margin: 0 }}>
              Quản lý {item.title.toLowerCase().replace("quản lý", "").trim()}{" "}
              của hệ thống.
            </p>
          </div>
        ))}
      </div>

      <footer
        style={{
          marginTop: "50px",
          textAlign: "center",
          fontSize: "0.85em",
          color: "#9CA3AF",
        }}
      >
        <p style={{ margin: "5px 0" }}>
          Hệ thống Quản lý Sân Cầu/Bóng - Powered by SportTech
        </p>
        <p style={{ margin: "5px 0" }}>
          Phiên bản{" "}
          {admin?.role === ROLES.SUPER_ADMIN ? "Toàn quyền" : "Trung tâm"}
        </p>
      </footer>
    </div>
  );
};

export default DashboardAdmin;
