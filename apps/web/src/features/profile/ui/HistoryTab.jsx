import React, { useState, useEffect, useCallback, useRef } from "react";
import { getBookingHistory } from "../../booking/api/booking_service/rest/user.api.js";
// Import API GraphQL
import { getAllCentersGQL } from "../../centers/api/center_service/grahql/center.api.js";

const HistoryTab = ({
  user,
  navigate,
  promptAction,
  getStatusClass,
  getStatusText,
}) => {
  const userId = user?.userId;

  // --- 1. STATE MANAGEMENT ---
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filter State
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Data
  const [centers, setCenters] = useState([]);

  // Modal State

  // Polling Ref to manage interval
  const pollingIntervalRef = useRef(null);

  // --- 2. EFFECT: FETCH CENTERS ---
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const centersData = await getAllCentersGQL();
        if (Array.isArray(centersData)) {
          setCenters(centersData);
        }
      } catch (error) {
        console.error("Failed to load centers via GraphQL", error);
      }
    };
    fetchCenters();
  }, []);

  // --- 3. FETCH HISTORY API (REUSABLE FUNCTION) ---
  // Added 'isBackground' param to prevent showing loading spinner during polling
  const fetchBookingHistory = useCallback(
    async (isBackground = false) => {
      if (!userId) return;

      if (!isBackground) setLoading(true);

      try {
        const params = {
          page: currentPage,
          limit: limit,
          ...(filterStatus !== "all" && { status: filterStatus }),
          ...(filterCenter !== "all" && { centerId: filterCenter }),
          ...(filterFrom && { dateFrom: filterFrom }),
          ...(filterTo && { dateTo: filterTo }),
          ...(filterSearch && { search: filterSearch }),
        };

        const data = await getBookingHistory(userId, params);

        const mappedHistory = (data.bookingHistory || []).map((item) => ({
          ...item,
          status: item.status,

          createdAt: item.createdAt || new Date().toISOString(),
        }));

        setHistory(mappedHistory);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        if (!isBackground) setHistory([]);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [
      userId,
      currentPage,
      limit,
      filterStatus,
      filterCenter,
      filterFrom,
      filterTo,
      filterSearch,
    ],
  );

  // --- 4. INITIAL FETCH ---
  useEffect(() => {
    fetchBookingHistory();
  }, [fetchBookingHistory]);

  // --- 5. SMART POLLING MECHANISM ---
  useEffect(() => {
    // Check nếu có bất kỳ booking nào đang 'pending'
    const hasPendingBookings = history.some(
      (item) => item.status === "pending",
    );

    if (hasPendingBookings) {
      // Nếu có pending -> Bật Polling
      if (!pollingIntervalRef.current) {
        console.log(">> Polling started (Pending booking detected)...");
        pollingIntervalRef.current = setInterval(() => {
          fetchBookingHistory(true); // Gọi API ngầm (không xoay spinner)
        }, 15000); // Poll mỗi 15 giây
      }
    } else {
      // Nếu không còn pending -> Tắt Polling để tiết kiệm tài nguyên
      if (pollingIntervalRef.current) {
        console.log("<< Polling stopped (No pending bookings).");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup khi unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [history, fetchBookingHistory]);

  // --- 6. HANDLERS ---

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleLimitChange = (e) => {
    setLimit(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const handleFilter = () => {
    setCurrentPage(1);
    fetchBookingHistory();
  };

  const handleReset = () => {
    setFilterStatus("all");
    setFilterCenter("all");
    setFilterSearch("");
    setFilterFrom("");
    setFilterTo("");
    setCurrentPage(1);
    setTimeout(() => {
      if (userId) {
        getBookingHistory(userId, { page: 1, limit: limit }).then((data) => {
          const mapped = (data.bookingHistory || []).map((item) => ({
            ...item,
            status: item.status,
            createdAt: item.createdAt || new Date().toISOString(),
          }));
          setHistory(mapped);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        });
      }
    }, 0);
  };

  return (
    <div className="tab-content">
      <div className="section-title">
        <i className="fas fa-history"></i>
        <h2>Lịch sử đặt sân</h2>
      </div>
      <div className="history-container">
        {/* FILTERS */}
        <div className="history-filters-enhanced">
          <div className="filters-header-enhanced">
            <div className="header-title">
              <i className="fas fa-filter"></i>
              <h3>Bộ lọc tìm kiếm</h3>
            </div>
            <button
              className="reset-filters-btn-enhanced"
              onClick={handleReset}
            >
              <i className="fas fa-redo-alt"></i>
              <span>Đặt lại</span>
            </button>
          </div>
          <div className="divider"></div>

          <div className="filters-body-enhanced">
            {/* Filter Status */}
            <div className="filter-section">
              <h4 className="filter-section-title">Tình trạng đặt sân</h4>
              <div className="status-filter-options">
                <label className="filter-chip">
                  <input
                    type="radio"
                    name="status"
                    value="all"
                    checked={filterStatus === "all"}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  />
                  <span>Tất cả</span>
                </label>
                <label className="filter-chip success">
                  <input
                    type="radio"
                    name="status"
                    value="paid"
                    checked={filterStatus === "paid"}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  />
                  <span>
                    <i className="fas fa-check-circle"></i> Hoàn thành
                  </span>
                </label>
                <label className="filter-chip warning">
                  <input
                    type="radio"
                    name="status"
                    value="pending"
                    checked={filterStatus === "pending"}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  />
                  <span>
                    <i className="fas fa-clock"></i> Đang giữ chỗ
                  </span>
                </label>
                <label className="filter-chip danger">
                  <input
                    type="radio"
                    name="status"
                    value="cancelled"
                    checked={filterStatus === "cancelled"}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  />
                  <span>
                    <i className="fas fa-times-circle"></i> Đã hủy
                  </span>
                </label>
              </div>
            </div>

            {/* Filter Center */}
            <div className="filter-section">
              <h4 className="filter-section-title">Cơ sở</h4>
              <div className="select-wrapper">
                <select
                  className="filter-select-enhanced"
                  value={filterCenter}
                  onChange={(e) => setFilterCenter(e.target.value)}
                >
                  <option value="all">Tất cả cơ sở</option>
                  {centers.length > 0 ? (
                    centers.map((center) => (
                      <option key={center.centerId} value={center.centerId}>
                        {center.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>Đang tải danh sách sân...</option>
                  )}
                </select>
                <i className="fas fa-chevron-down select-arrow"></i>
              </div>
            </div>

            {/* Filter Date */}
            <div className="filter-section">
              <h4 className="filter-section-title">Khoảng thời gian</h4>
              <div className="date-range-picker">
                <div className="date-input-group">
                  <label>Từ:</label>
                  <div className="date-input-wrapper">
                    <i className="fas fa-calendar-alt"></i>
                    <input
                      type="date"
                      className="date-input"
                      value={filterFrom}
                      onChange={(e) => setFilterFrom(e.target.value)}
                      max={filterTo || undefined}
                    />
                  </div>
                  <label>Đến:</label>
                  <div className="date-input-wrapper">
                    <i className="fas fa-calendar-alt"></i>
                    <input
                      type="date"
                      className="date-input"
                      value={filterTo}
                      onChange={(e) => setFilterTo(e.target.value)}
                      min={filterFrom || undefined}
                    />
                  </div>
                </div>
                <div className="quick-date-options">
                  <button
                    className="quick-date-btn"
                    onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      setFilterFrom(today);
                      setFilterTo(today);
                    }}
                  >
                    Hôm nay
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="divider"></div>
          <div className="filters-footer">
            <button
              className="apply-filter-btn-enhanced"
              onClick={handleFilter}
            >
              <i className="fas fa-search"></i>
              <span>Tìm kiếm</span>
            </button>
          </div>
        </div>

        {/* RESULTS TABLE */}
        <div className="history-results">
          <div className="results-header">
            <div className="results-summary">
              <h3>Kết quả</h3>
              <span className="results-count">{total} lịch sử đặt sân</span>
            </div>
          </div>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Mã đặt sân</th>
                  <th>Trạng thái</th>
                  <th>Cơ sở</th>
                  <th>Sân-Giờ</th>
                  <th>Ngày</th>
                  <th>Giá tiền</th>
                  <th>Phương thức</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="9"
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : history.length > 0 ? (
                  history.map((booking) => (
                    <tr
                      key={booking.bookingId}
                      className={
                        booking.status === "cancelled" ? "cancelled-row" : ""
                      }
                    >
                      <td className="booking-id">#{booking.orderId}</td>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(booking.status)}`}
                        >
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                      <td>{booking.center}</td>
                      <td>
                        {booking.court_time.split("\n").map((line, idx) => (
                          <React.Fragment key={idx}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </td>
                      <td>
                        {new Date(booking.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="booking-price">
                        {booking.price.toLocaleString("vi-VN")} đ
                      </td>
                      <td>{booking.paymentMethod}</td>
                      <td>
                        <div className="action-buttons">
                          {(booking.status === "pending" ||
                            (booking.status === "confirmed" &&
                              Date.parse(booking.startsAt) > Date.now())) && (
                            <>
                              <button
                                className="cancel-btn"
                                title="Hủy"
                                onClick={() =>
                                  promptAction("cancel", {
                                    bookingId: booking.bookingId,
                                    orderId: booking.orderId,
                                  })
                                }
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}

                          {(booking.status === "paid" ||
                            (booking.status === "confirmed" &&
                              Date.parse(booking.endsAt) <= Date.now())) && (
                            <button
                              className="delete-btn"
                              title="Xóa"
                              onClick={() =>
                                promptAction("delete", {
                                  bookingId: booking.bookingId,
                                })
                              }
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}

                          {booking.status === "cancelled" && (
                            <button
                              className="delete-btn"
                              title="Xóa"
                              onClick={() =>
                                promptAction("delete", {
                                  bookingId: booking.bookingId,
                                })
                              }
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#666",
                      }}
                    >
                      Không tìm thấy lịch sử đặt sân nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="history-pagination">
            <div className="pagination-info">
              <span>
                Hiển thị {(currentPage - 1) * limit + 1}-
                {Math.min(currentPage * limit, total)} của {total} kết quả
              </span>
            </div>
            <div className="pagination-controls">
              <button
                className={`page-btn ${currentPage === 1 ? "disabled" : ""}`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    className={`page-btn ${currentPage === page ? "active" : ""}`}
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                className={`page-btn ${currentPage === totalPages ? "disabled" : ""}`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            <div className="pagination-options">
              <select
                className="per-page-select"
                value={limit}
                onChange={handleLimitChange}
                disabled={loading}
              >
                <option value="10">10 / trang</option>
                <option value="20">20 / trang</option>
                <option value="50">50 / trang</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;
