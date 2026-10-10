import React from "react";
import PopularTimeChart from "./PopularTimeChart.jsx";

const StatsTab = ({
  statisticsData, // Dữ liệu tổng hợp từ 1 API (Overview, Monthly, Frequent, TimeStats)
  statsPeriod,
  setStatsPeriod,
  chartFilter,
  setChartFilter,
  animateStats,
  loading,
}) => {
  // 1. Destructuring an toàn với Default Values
  // Giúp component không bị crash khi dữ liệu chưa tải xong (null/undefined)
  const {
    overview = {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      completionRate: 0,
    },
    comparison = {
      totalChange: 0,
      completedChange: 0,
      cancelledChange: 0,
    },
    monthlyStats = [],
    frequentCenters = [],
    timeStats = null,
  } = statisticsData || {};

  // 2. Helper Functions

  // Render mũi tên tăng/giảm
  const renderTrend = (value) => {
    const isNegative = value < 0;
    const absValue = Math.round(Math.abs(value));
    return (
      <div className={`stats-trend ${isNegative ? "negative" : "positive"}`}>
        {isNegative ? (
          <i className="fas fa-arrow-down"></i>
        ) : (
          <i className="fas fa-arrow-up"></i>
        )}
        <span>{absValue}%</span>
      </div>
    );
  };

  // Tính % hiển thị thanh bar cho danh sách sân
  // Logic: Lấy số lượng booking của sân chia cho tổng số booking của Top 5 sân hiển thị
  const calculateCenterPercent = (count) => {
    if (!frequentCenters.length) return 0;
    const totalDisplayed = frequentCenters.reduce(
      (acc, curr) => acc + curr.bookingCount,
      0,
    );
    return totalDisplayed === 0 ? 0 : (count / totalDisplayed) * 100;
  };

  return (
    <div className="tab-content stats-content">
      <div className="section-title">
        <i className="fas fa-chart-line"></i>
        <h2>Thống kê hoạt động</h2>
      </div>

      <div className="stats-dashboard-enhanced">
        {/* --- A. OVERVIEW & FILTERS --- */}
        <div className="stats-overview">
          <div className="stats-header">
            <h3>Tổng quan hoạt động</h3>
            <div className="stats-period-selector">
              <button
                className={`period-btn ${statsPeriod === "week" ? "active" : ""}`}
                onClick={() => setStatsPeriod("week")}
              >
                Tuần
              </button>
              <button
                className={`period-btn ${statsPeriod === "month" ? "active" : ""}`}
                onClick={() => setStatsPeriod("month")}
              >
                Tháng
              </button>
              <button
                className={`period-btn ${statsPeriod === "year" ? "active" : ""}`}
                onClick={() => setStatsPeriod("year")}
              >
                Năm
              </button>
            </div>
          </div>

          <div className="stats-cards-container">
            {/* CARD 1: TỔNG SỐ */}
            <div
              className={`stats-card-enhanced ${animateStats ? "animate" : ""}`}
            >
              <div className="stats-card-header">
                <div className="stats-icon-enhanced booking">
                  <i className="fas fa-calendar-check"></i>
                </div>
                {renderTrend(comparison.totalChange)}
              </div>
              <div className="stats-card-body">
                <h4>Tổng số lần đặt sân</h4>
                <div className="stats-value">
                  {loading ? "..." : overview.totalBookings}
                </div>
              </div>
              <div className="stats-card-footer">
                <span>
                  {comparison.totalChange >= 0 ? "Tăng" : "Giảm"}{" "}
                  {Math.abs(Math.round(comparison.totalChange))}% so với kỳ
                  trước
                </span>
              </div>
            </div>

            {/* CARD 2: HOÀN THÀNH */}
            <div
              className={`stats-card-enhanced ${animateStats ? "animate" : ""}`}
              style={{ animationDelay: "0.1s" }}
            >
              <div className="stats-card-header">
                <div className="stats-icon-enhanced completed">
                  <i className="fas fa-check-circle"></i>
                </div>
                {renderTrend(comparison.completedChange)}
              </div>
              <div className="stats-card-body">
                <h4>Hoàn thành</h4>
                <div className="stats-value">
                  {loading ? "..." : overview.completedBookings}
                </div>
              </div>
              <div className="stats-card-footer">
                <div className="completion-rate">
                  <span>Tỷ lệ hoàn thành:</span>
                  <div className="rate-bar-container">
                    <div
                      className="rate-bar"
                      style={{ width: `${overview.completionRate}%` }}
                    ></div>
                  </div>
                  <span>{overview.completionRate}%</span>
                </div>
              </div>
            </div>

            {/* CARD 3: ĐÃ HỦY */}
            <div
              className={`stats-card-enhanced ${animateStats ? "animate" : ""}`}
              style={{ animationDelay: "0.2s" }}
            >
              <div className="stats-card-header">
                <div className="stats-icon-enhanced cancelled">
                  <i className="fas fa-times-circle"></i>
                </div>
                {renderTrend(comparison.cancelledChange)}
              </div>
              <div className="stats-card-body">
                <h4>Đã hủy</h4>
                <div className="stats-value">
                  {loading ? "..." : overview.cancelledBookings}
                </div>
              </div>
              <div className="stats-card-footer">
                <span>
                  {comparison.cancelledChange >= 0 ? "Tăng" : "Giảm"}{" "}
                  {Math.abs(Math.round(comparison.cancelledChange))}% so với kỳ
                  trước
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- B. BIỂU ĐỒ CỘT (MONTHLY CHART) --- */}
        <div className="stats-charts-enhanced">
          <div className="chart-container-enhanced">
            <div className="chart-header">
              <h3>Thống kê đặt sân theo tháng</h3>
              <div className="chart-actions">
                <button
                  className={`chart-action-btn ${chartFilter === "all" ? "active" : ""}`}
                  onClick={() => setChartFilter("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`chart-action-btn ${chartFilter === "completed" ? "active" : ""}`}
                  onClick={() => setChartFilter("completed")}
                >
                  Hoàn thành
                </button>
                <button
                  className={`chart-action-btn ${chartFilter === "cancelled" ? "active" : ""}`}
                  onClick={() => setChartFilter("cancelled")}
                >
                  Hủy
                </button>
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px",
                }}
              >
                <div className="badminton-spinner"></div>
              </div>
            ) : (
              <div className="advanced-chart">
                <div className="chart-labels">
                  <div className="chart-y-axis">
                    <span>100%</span>
                    <span>80%</span>
                    <span>60%</span>
                    <span>40%</span>
                    <span>20%</span>
                    <span>0%</span>
                  </div>
                </div>
                <div className="chart-content">
                  <div className="chart-grid">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="grid-line"></div>
                    ))}
                  </div>
                  <div className="chart-bars">
                    {monthlyStats.length === 0 && (
                      <div className="no-data-text">
                        Không có dữ liệu biểu đồ
                      </div>
                    )}

                    {monthlyStats.map((data, index) => {
                      const total = data.completed + data.cancelled;
                      // Tính chiều cao % của thanh
                      const completedPercent =
                        total > 0 ? (data.completed / total) * 100 : 0;
                      const cancelledPercent =
                        total > 0 ? (data.cancelled / total) * 100 : 0;

                      return (
                        <div key={index} className="chart-bar-group">
                          <div className="stacked-bar">
                            {/* Logic hiển thị theo Filter */}
                            {(chartFilter === "all" ||
                              chartFilter === "completed") && (
                              <div
                                className="bar-segment completed"
                                // Nếu chỉ hiện completed thì height phải tính lại base trên max value hoặc để 100% nếu muốn dạng stacked
                                // Ở đây giữ logic stacked:
                                style={{
                                  height: `${chartFilter === "completed" && total > 0 ? 100 : completedPercent}%`,
                                }}
                                title={`Hoàn thành: ${data.completed}`}
                              ></div>
                            )}
                            {(chartFilter === "all" ||
                              chartFilter === "cancelled") && (
                              <div
                                className="bar-segment cancelled"
                                style={{
                                  height: `${chartFilter === "cancelled" && total > 0 ? 100 : cancelledPercent}%`,
                                }}
                                title={`Hủy: ${data.cancelled}`}
                              ></div>
                            )}
                          </div>
                          <span className="bar-label">T{data.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color completed"></div>
                <span>Hoàn thành</span>
              </div>
              <div className="legend-item">
                <div className="legend-color cancelled"></div>
                <span>Đã hủy</span>
              </div>
            </div>
          </div>

          {/* --- C. DETAILS GRID (Popular Time & Frequent Centers) --- */}
          <div className="stats-details-grid">
            {/* 1. Component Giờ Phổ Biến (Nhận Data từ Props) */}
            <PopularTimeChart data={timeStats} loading={loading} />

            {/* 2. Component Sân Thường Xuyên (Render từ frequentCenters) */}
            <div className="stats-detail-card">
              <div className="detail-card-header">
                <h4>
                  <i className="fas fa-map-marker-alt"></i>Cơ sở đặt sân thường
                  xuyên
                </h4>
              </div>
              <div className="detail-card-body">
                <div className="location-distribution">
                  {loading && <p>Loading...</p>}
                  {!loading && frequentCenters.length === 0 && (
                    <p className="no-data">Chưa có dữ liệu đặt sân</p>
                  )}

                  {frequentCenters.map((center) => {
                    const percent = calculateCenterPercent(center.bookingCount);
                    return (
                      <div
                        className="location-item"
                        key={center.centerId || center.centerName}
                      >
                        <div className="location-name">{center.centerName}</div>
                        <div className="location-bar-container">
                          <div className="location-bar-wrapper">
                            <div
                              className="location-bar"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="location-percentage">
                            {center.bookingCount} lần
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
