import React from "react";
import "../../../shared/styles/UserProfile.css";

const PopularTimeChart = ({ data, loading }) => {
  // 1. Xử lý Loading State
  // Hiển thị khung giữ chỗ để tránh Layout Shift khi đang tải
  if (loading) {
    return (
      <div className="stats-detail-card">
        <div className="detail-card-header">
          <h4>
            <i className="fas fa-clock"></i>
            Thời gian đặt sân phổ biến
          </h4>
        </div>
        <div
          className="detail-card-body"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
          }}
        >
          {/* Sử dụng class spinner có sẵn trong project của bạn */}
          <div className="badminton-spinner"></div>
        </div>
      </div>
    );
  }

  // 2. Xử lý Empty State (Không có dữ liệu)
  // Kiểm tra nếu data null hoặc không có object percentages
  if (!data || !data.percentages) {
    return (
      <div className="stats-detail-card">
        <div className="detail-card-header">
          <h4>
            <i className="fas fa-clock"></i>
            Thời gian đặt sân phổ biến
          </h4>
        </div>
        <div className="detail-card-body">
          <div
            className="no-data-state"
            style={{ textAlign: "center", padding: "30px", color: "#888" }}
          >
            <i
              className="fas fa-chart-bar"
              style={{ fontSize: "2rem", marginBottom: "10px" }}
            ></i>
            <p>Chưa có dữ liệu thống kê khung giờ.</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Destructuring Data
  const { percentages, popularTimeRange, popularCount } = data;

  // Mảng định nghĩa các buổi để map (giúp code gọn hơn)
  const timeSessions = ["Sáng", "Trưa", "Chiều", "Tối"];

  return (
    <div className="stats-detail-card">
      <div className="detail-card-header">
        <h4>
          <i className="fas fa-clock"></i>
          Thời gian đặt sân phổ biến
        </h4>
      </div>

      <div className="detail-card-body">
        {/* Biểu đồ cột */}
        <div className="time-distribution">
          {timeSessions.map((session) => (
            <div className="time-slot" key={session}>
              <div className="time-wrapper">
                <div
                  className="time-bar"
                  // Thêm transition trong CSS để bar chạy lên mượt mà
                  style={{ height: `${percentages[session] || 0}%` }}
                  title={`${session}: ${percentages[session] || 0}%`}
                ></div>
                <span>{percentages[session] || 0}%</span>
              </div>
              <span>{session}</span>
            </div>
          ))}
        </div>

        {/* Text chú thích khung giờ phổ biến nhất */}
        <div className="most-popular-time">
          <i className="fas fa-star"></i>
          <span>
            Khung giờ phổ biến nhất: <strong>{popularTimeRange}</strong>
            {/* Chỉ hiển thị số lượt nếu > 0 */}
            {popularCount > 0 && (
              <span className="count-badge"> ({popularCount} lượt đặt)</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PopularTimeChart;
