import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllNotification,
  readAll,
  // Bỏ import getNumberOfUnread nếu không dùng để tránh rối
} from "../api/notification_service/notification.api.js";

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);

  // --- HELPER: Format Time ---
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    // ... (Giữ nguyên logic cũ của bạn)
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "Vừa xong";
  };

  // --- HELPER: Map UI ---
  const mapBackendTypeToUI = (backendType) => {
    switch (backendType) {
      // --- CÁC TYPE CŨ ---
      case "BOOKING_SUCCESS":
        return { type: "booking", title: "ĐẶT SÂN THÀNH CÔNG" };
      case "FRIEND_REQUEST":
        return { type: "match", title: "LỜI MỜI KẾT BẠN" };
      case "BOOKING_CANCELLED":
        return { type: "system", title: "ĐƠN HÀNG ĐÃ HỦY" };
      case "SYSTEM_ALERT":
        return { type: "match", title: "CẢNH BÁO VI PHẠM" };

      // --- PASS BOOKING ---

      // 👇👇👇 TYPE MỚI: CÓ NGƯỜI QUAN TÂM 👇👇👇

      default:
        return { type: "system", title: "THÔNG BÁO HỆ THỐNG" };
    }
  };

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Chỉ gọi API lấy danh sách
        const listData = await getAllNotification();

        // Transform Data
        const formattedData = listData
          .filter(
            (item) =>
              !item.notiType?.startsWith("PASS_") &&
              item.notiType !== "PAYMENT_SUCCESS",
          )
          .map((item) => {
            const uiConfig = mapBackendTypeToUI(item.notiType);
            return {
              id: item._id,
              type: uiConfig.type,
              title: uiConfig.title,
              message: item.notiMessage,
              time: formatTimeAgo(item.createdAt),
              isRead: item.isRead,
              rawDate: new Date(item.createdAt),
            };
          });

        // Sắp xếp mới nhất lên đầu
        formattedData.sort((a, b) => b.rawDate - a.rawDate);
        setNotifications(formattedData);

        // 🔥 FIX QUAN TRỌNG: Đếm trực tiếp từ danh sách vừa tải về
        // Điều này đảm bảo: Nếu mắt thường thấy tin chưa đọc, thì biến count chắc chắn > 0
        const realCount = formattedData.filter((n) => !n.isRead).length;
        console.log("Số lượng chưa đọc tính được:", realCount); // Debug log
        setUnreadCount(realCount);
      } catch (error) {
        console.error("Failed to fetch notifications data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- ACTION: Đánh dấu 1 cái ---
  const markAsRead = (id) => {
    const targetNoti = notifications.find((n) => n.id === id);
    if (targetNoti && !targetNoti.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // --- ACTION: Đánh dấu TẤT CẢ ---
  const handleMarkAllAsRead = async () => {
    console.log("Đã bấm nút Đánh dấu tất cả!"); // 1. Kiểm tra xem nút có bấm được không

    // 👇 Tạm thời bỏ dòng này để test xem API có chạy không
    // if (unreadCount === 0) return;

    try {
      console.log("Đang gọi API readAll...");
      await readAll();
      console.log("API thành công!");

      // Cập nhật UI ngay lập tức
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Lỗi API:", error);
      alert("Có lỗi xảy ra khi cập nhật!");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const getStyleByType = (type) => {
    switch (type) {
      case "booking":
        return {
          icon: "fa-calendar-check",
          themeColor: "green",
          accentBg: "bg-green-600",
          border: "border-green-600",
        };
      case "match":
        return {
          icon: "fa-user-friends",
          themeColor: "red",
          accentBg: "bg-red-600",
          border: "border-red-600",
        };
      case "promo":
        return {
          icon: "fa-star",
          themeColor: "yellow",
          accentBg: "bg-yellow-500",
          border: "border-yellow-500",
        };
      default:
        return {
          icon: "fa-bell",
          themeColor: "blue",
          accentBg: "bg-blue-600",
          border: "border-blue-600",
        };
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-100 pt-28 pb-10 font-sans">
      {/* BACKGROUND */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      ></div>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-1000"></div>

      <div className="container mx-auto px-4 max-w-3xl relative z-10">
        {/* NAV BUTTONS */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm hover:bg-green-600 border border-white/50 hover:border-green-600 rounded-full shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <i className="fas fa-arrow-left text-green-700 group-hover:text-white transition-colors"></i>
            <span className="font-bold text-gray-700 group-hover:text-white text-sm transition-colors uppercase tracking-wide">
              Quay lại
            </span>
          </button>

          {/* 👇 BUTTON QUAN TRỌNG */}
          <button
            onClick={handleMarkAllAsRead}
            // Bỏ disabled để chắc chắn bấm được
            className={`text-xs font-bold transition-all cursor-pointer ${
              unreadCount > 0
                ? "text-green-700 hover:text-green-900 hover:underline"
                : "text-gray-400"
            }`}
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>

        {/* HEADER */}
        <div className="relative bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-900 rounded-t-3xl shadow-2xl overflow-hidden border-b-4 border-yellow-400">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="p-8 text-white relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h6 className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-1">
                Badminton App
              </h6>
              <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-wider drop-shadow-lg">
                Thông Báo
              </h1>
            </div>
            <div className="relative">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                <i className="fas fa-bell text-2xl text-yellow-400 animate-swing"></i>
              </div>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-teal-900 animate-bounce">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FILTER TABS */}
        <div className="bg-white p-2 shadow-md flex gap-2 relative z-20 -mt-0 rounded-b-xl border-x border-b border-gray-100">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-all duration-200 ${filter === "all" ? "bg-teal-800 text-white shadow-md transform scale-[1.02]" : "bg-transparent text-gray-500 hover:bg-gray-100"}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-all duration-200 flex items-center justify-center gap-2 ${filter === "unread" ? "bg-yellow-500 text-teal-900 shadow-md transform scale-[1.02]" : "bg-transparent text-gray-500 hover:bg-gray-100"}`}
          >
            Chưa đọc
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-extrabold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* LIST */}
        <div className="mt-8 space-y-4 pb-12">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl h-24 w-full animate-pulse"
                ></div>
              ))}
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => {
              const style = getStyleByType(item.type);
              return (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`relative group flex flex-col sm:flex-row items-stretch bg-white rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer border-l-0 sm:border-l-[6px] ${style.border} ${item.isRead ? "opacity-80 shadow-sm hover:opacity-100" : "shadow-lg hover:shadow-2xl bg-gradient-to-r from-white to-gray-50"}`}
                >
                  <div
                    className={`sm:w-20 w-full py-4 sm:py-0 flex items-center justify-center text-white ${style.accentBg}`}
                  >
                    <i
                      className={`fas ${style.icon} text-2xl transition-transform group-hover:scale-110`}
                    ></i>
                  </div>
                  <div className="flex-1 p-5 flex flex-col justify-center relative">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <h3
                        className={`text-base font-black uppercase tracking-tight ${item.isRead ? "text-gray-600" : "text-gray-800"}`}
                      >
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase">
                        {item.time}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-medium leading-relaxed relative z-10 pr-8 ${item.isRead ? "text-gray-500" : "text-gray-700"}`}
                    >
                      {item.message}
                    </p>
                  </div>
                  {!item.isRead && (
                    <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <div className="bg-gray-200 p-6 rounded-full mb-4">
                <i className="fas fa-check-circle text-4xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-black text-gray-500 uppercase italic">
                Sạch sẽ!
              </h3>
              <p className="text-gray-400 text-sm">
                {filter === "unread"
                  ? "Bạn đã đọc hết thông báo."
                  : "Không có thông báo mới nào ở đây."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
