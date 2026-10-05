import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DatePicker from "../ui/datepicker.jsx";
import Legend from "../ui/legend.jsx";
import BookingTable from "../ui/bookingTable.jsx";
import PricingTable from "../ui/PricingTable.jsx";
import ModalConfirmation from "../ui/ModalConfirmation.jsx";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";

// Import API
import { getCenterInfoByIdGQL } from "../../centers/api/center_service/grahql/center.api.js";
import {
  getPendingMapping,
  confirmBookingToDB,
} from "../api/booking_service/rest/booking.js";
import { fetchUserInfo } from "../../profile/api/user_service/rest/users.api.js";

import "../../../shared/styles/booking.css";

// --- CONSTANTS & HELPERS ---

const times = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
];
const slotCount = times.length - 1;

function formatSlot(slot) {
  const hour = Math.floor(slot);
  const minute = (slot - hour) * 60;
  return `${hour}h${minute === 0 ? "00" : minute}`;
}

// Hàm tính tổng tiền và giảm giá (Client Side Display Only)
function calculateTotal(slots, userPoints) {
  let totalAmount = slots.reduce((sum, s) => sum + s.price, 0);
  const totalHours = slots.length;

  let discount = 0;
  if (new Set(slots.map((slot) => slot.courtId)).size >= 2) discount += 0.05; // Ước tính theo số sân như Core; quote thực lấy từ server.
  if (userPoints >= 4000) discount += 0.1;
  else if (userPoints >= 2000) discount += 0.05;

  const discountedAmount = totalAmount * (1 - discount);
  return {
    totalHours,
    totalAmount: Math.round(discountedAmount),
    originalAmount: totalAmount,
    discount,
  };
}

// --- LOGIC TÍNH GIÁ LOCAL (Client-side) ---

const isWeekend = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6; // 0: CN, 6: T7
};

const parseHour = (timeStr) => {
  if (!timeStr) return 0;
  return parseInt(timeStr.split(":")[0], 10);
};

const getPriceLocally = (centerInfo, dateStr, slotVal) => {
  if (!centerInfo || !centerInfo.pricing) return 50000; // Giá mặc định an toàn

  const type = isWeekend(dateStr) ? "weekend" : "weekday";
  const pricingList = centerInfo.pricing[type] || [];

  // Tìm khung giờ phù hợp: startTime <= slotVal < endTime
  const matchedPrice = pricingList.find((p) => {
    const start = parseHour(p.startTime);
    const end = parseHour(p.endTime);
    return slotVal >= start && slotVal < end;
  });

  return matchedPrice ? matchedPrice.price : 50000;
};

// --- LOGIC HIỂN THỊ (MERGE DATA) ---

// 1. Thêm tham số `courts` vào hàm này
function applyDisplayLogic(
  serverMapping,
  selectedSlots,
  selectedDate,
  currentUserId,
  courts,
) {
  // Clone server mapping
  const updatedMapping = JSON.parse(JSON.stringify(serverMapping));

  const todayStr = new Date().toLocaleDateString("en-CA");
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // 2. KHỞI TẠO MẶC ĐỊNH CHO TẤT CẢ CÁC SÂN
  // Đảm bảo sân nào cũng có mảng dữ liệu, ngay cả khi server chưa trả về booking nào
  if (courts && Array.isArray(courts)) {
    courts.forEach((court) => {
      const cId = court.id || court._id || court.courtId;
      if (!updatedMapping[cId]) {
        updatedMapping[cId] = Array(slotCount).fill("trống");
      }
    });
  }

  // 3. ÁP DỤNG CÁC SLOT ĐANG ĐƯỢC CHỌN (MÀU XANH)
  selectedSlots.forEach((slot) => {
    const { courtId, slotVal } = slot;
    // Lúc này updatedMapping[courtId] chắc chắn đã tồn tại nhờ bước 2
    if (updatedMapping[courtId]) {
      const index = times.indexOf(slotVal);
      if (index !== -1 && index < slotCount) {
        updatedMapping[courtId][index] = {
          status: "myPending",
          userId: currentUserId,
        };
      }
    }
  });

  // 4. LOGIC KHÓA (LOCKED) VÀ MAPPING TRẠNG THÁI
  Object.keys(updatedMapping).forEach((courtId) => {
    const arr = updatedMapping[courtId] || Array(slotCount).fill("trống");
    updatedMapping[courtId] = arr.map((status, i) => {
      const slotHour = times[i];

      // Logic Locked: Chỉ áp dụng nếu ngày chọn là hôm nay
      if (selectedDate === todayStr) {
        if (
          slotHour < currentHour ||
          (slotHour === currentHour && currentMinute > 0)
        ) {
          return "locked";
        }
      }

      if (status === undefined) return "trống";

      // Logic parse userId giữ nguyên như cũ
      if (typeof status === "object" && status.userId != null) {
        let userId = status.userId;
        if (typeof userId === "string" && userId.includes("_id")) {
          try {
            const parsed = JSON.parse(userId);
            userId = parsed._id || userId;
          } catch (e) {}
        }

        const isMe =
          userId.toString().trim() === currentUserId?.toString().trim();

        if (status.status === "paid" || status.status === "đã đặt") {
          return { ...status, status: "paid" };
        } else if (status.status === "pending") {
          return isMe
            ? { ...status, status: "myPending" }
            : { ...status, status: "pending" };
        } else if (status.status === "myPending") {
          return status;
        }
      }
      return status;
    });
  });

  return updatedMapping;
}

// --- MAIN COMPONENT ---

const BookingSchedule = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useContext(SessionContext);
  const userId = user?._id;
  const userPoints = user?.points || 0;
  const name = user?.name || "Người dùng";

  const openHours = "05:00 - 24:00";

  const [bookingDataState, setBookingDataState] = useState(() => {
    return JSON.parse(localStorage.getItem("bookingData") || "{}");
  });

  const [centerId, setCenterId] = useState(
    searchParams.get("centerId") || bookingDataState.centerId || null,
  );
  const todayStr = new Date().toLocaleDateString("en-CA");
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [courts, setCourts] = useState([]);
  const [baseMapping, setBaseMapping] = useState({});
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [displayMapping, setDisplayMapping] = useState({});
  const [centerInfo, setCenterInfo] = useState(null);

  // Tính tiền để hiển thị (UX: User thấy ngay giá khi click)
  const { totalHours, totalAmount, originalAmount } = calculateTotal(
    selectedSlots,
    userPoints,
  );

  const [showModal, setShowModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [initialMappingLoaded, setInitialMappingLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const datePickerRef = useRef(null);
  const bookingRequestKey = useRef(null);

  // --- EFFECTS ---

  useEffect(() => {
    if (bookingDataState) {
      localStorage.setItem("bookingData", JSON.stringify(bookingDataState));
    }
  }, [bookingDataState]);

  useEffect(() => {
    if (!centerId || centerId === "default_centerId") {
      alert("Không tìm thấy trung tâm. Vui lòng chọn lại trung tâm.");
      navigate("/centers");
    }
  }, [centerId, navigate]);

  useEffect(() => {
    return () => localStorage.removeItem("bookingData");
  }, []);

  // 1. Load Initial Data (GraphQL)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!centerId) return;
      try {
        const data = await getCenterInfoByIdGQL(centerId);
        if (data) {
          setCenterInfo(data);
          if (data.courts && Array.isArray(data.courts)) {
            setCourts(data.courts);
          }
        }
      } catch (error) {
        console.error("Error fetching initial data via GraphQL:", error);
      }
    };
    fetchInitialData();
  }, [centerId]);

  // 2. Status Polling
  const fetchBookingStatus = useCallback(async () => {
    if (!centerId || courts.length === 0) return;

    try {
      const mappingDB = await getPendingMapping(centerId, selectedDate);

      const completeMapping = {};
      courts.forEach((court) => {
        const key = court.id || court._id || court.courtId;
        completeMapping[key] = mappingDB[key] || Array(slotCount).fill("trống");
      });

      setBaseMapping(completeMapping);
      setInitialMappingLoaded(true);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái sân:", error);
    }
  }, [centerId, selectedDate, courts]);

  useEffect(() => {
    if (courts.length > 0) fetchBookingStatus();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible" && courts.length > 0) {
        fetchBookingStatus();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && courts.length > 0) {
        fetchBookingStatus();
      }
    };

    const handleWindowFocus = () => {
      if (courts.length > 0) fetchBookingStatus();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [fetchBookingStatus, courts.length]);

  // 3. UI Update
  useEffect(() => {
    const updateUI = () => {
      // TRUYỀN THÊM `courts` VÀO ĐÂY
      setDisplayMapping(
        applyDisplayLogic(
          baseMapping,
          selectedSlots,
          selectedDate,
          userId,
          courts,
        ),
      );
    };

    updateUI();
    const interval = setInterval(updateUI, 60000); // Cập nhật mỗi phút để check giờ locked
    return () => clearInterval(interval);
  }, [baseMapping, selectedSlots, selectedDate, userId, courts]); // Thêm courts vào dependency

  // --- HANDLERS ---

  const handleDateChange = (newDate) => {
    bookingRequestKey.current = null;
    setBaseMapping({});
    setDisplayMapping({});
    setSelectedSlots([]);
    setInitialMappingLoaded(false);
    setSelectedDate(newDate);
    setBookingDataState({ centerId, date: newDate });
  };

  const toggleBookingStatus = (rowIndex, colIndex) => {
    if (!initialMappingLoaded || isSubmitting) return;
    bookingRequestKey.current = null;
    const court = courts[rowIndex];
    if (!court) return;

    const courtIdKey = court.id || court._id || court.courtId;
    const slotVal = times[colIndex];

    const todayStr = new Date().toLocaleDateString("en-CA");
    if (selectedDate === todayStr) {
      const now = new Date();
      if (
        slotVal < now.getHours() ||
        (slotVal === now.getHours() && now.getMinutes() > 0)
      ) {
        return;
      }
    }

    const serverSlot = baseMapping[courtIdKey]
      ? baseMapping[courtIdKey][colIndex]
      : "trống";
    if (serverSlot !== "trống" && typeof serverSlot === "object") {
      return;
    }

    const existingIndex = selectedSlots.findIndex(
      (s) => s.courtId === courtIdKey && s.slotVal === slotVal,
    );
    let newSelectedSlots = [...selectedSlots];

    if (existingIndex >= 0) {
      newSelectedSlots.splice(existingIndex, 1);
      setSelectedSlots(newSelectedSlots);
    } else {
      // ✅ GIỮ PRICE Ở ĐÂY để UX tốt (hiển thị tổng tiền)
      const price = getPriceLocally(centerInfo, selectedDate, slotVal);

      const newSlot = { courtId: courtIdKey, slotVal, price };
      newSelectedSlots.push(newSlot);
      setSelectedSlots(newSelectedSlots);
    }
  };

  const handleConfirm = () => {
    if (selectedSlots.length === 0) {
      alert("Vui lòng chọn ít nhất 1 khung giờ.");
      return;
    }
    setShowModal(true);
  };

  const formatMoney = (val) => val.toLocaleString("vi-VN") + " đ";
  const handleGoBack = () => navigate("/centers");

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    return `${days[date.getDay()]}, ${day}/${month}/${year}`;
  };

  // --- CHECK-AND-LOCK LOGIC ---
  const handleModalAction = async (action) => {
    if (action === "confirm") {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        // ✅ BƯỚC 1: GOM NHÓM DỮ LIỆU (BẮT BUỘC ĐỂ KHỚP DTO)
        // Chuyển từ mảng phẳng selectedSlots sang mảng đã gom nhóm theo courtId
        const detailsMap = {};
        selectedSlots.forEach((slot) => {
          const cId = slot.courtId;
          if (!detailsMap[cId]) {
            detailsMap[cId] = [];
          }
          detailsMap[cId].push(slot.slotVal);
        });

        const courtBookingDetails = Object.keys(detailsMap).map((cId) => ({
          courtId: cId,
          timeslots: detailsMap[cId], // Backend cần mảng number[] tại đây
        }));

        console.log("date:", selectedDate);
        console.log("courtBookingDetails:", courtBookingDetails);

        // ✅ BƯỚC 2: GỌI API
        const response = await confirmBookingToDB(
          {
            centerId,
            bookDate: selectedDate,
            userName: name || "Guest", // Fallback nếu name bị null
            courtBookingDetails: courtBookingDetails,
          },
          (bookingRequestKey.current ||= crypto.randomUUID()),
        );

        // Backend của bạn trả về { message, booking, ... } hoặc trực tiếp object
        // Tùy vào controller trả về gì, nhưng thường là response.booking hoặc response
        const booking = response.booking || response;

        console.log("Booking response from server:", booking);

        if (booking && booking._id) {
          bookingRequestKey.current = null;
          setSelectedSlots([]);
          await fetchBookingStatus();
          alert(`Đặt sân thành công! Mã đơn: ${booking._id}`);
        }
      } catch (error) {
        console.error("Lỗi khi xác nhận booking:", error);

        if (error.response && error.response.status === 409) {
          const { message, conflictedSlots } = error.response.data;
          alert(message || "Một số khung giờ bạn chọn đã bị người khác đặt!");

          // Logic xử lý conflict (tô màu đỏ/xám)
          const newBaseMapping = JSON.parse(JSON.stringify(baseMapping));

          if (conflictedSlots && Array.isArray(conflictedSlots)) {
            conflictedSlots.forEach((conflict) => {
              const { courtId, timeslot } = conflict;
              // Hàm times được define ở ngoài component
              const index = times.indexOf(timeslot);
              if (newBaseMapping[courtId] && index !== -1) {
                newBaseMapping[courtId][index] = {
                  status: "pending",
                  userId: "others",
                };
              }
            });
            setBaseMapping(newBaseMapping);

            // Bỏ chọn các slot bị trùng
            const newSelectedSlots = selectedSlots.filter(
              (s) =>
                !conflictedSlots.some(
                  (c) => c.courtId === s.courtId && c.timeslot === s.slotVal,
                ),
            );
            setSelectedSlots(newSelectedSlots);
          }

          bookingRequestKey.current = null;
          setSelectedSlots([]);
          await fetchBookingStatus();
          setShowModal(false);
        } else {
          alert(
            "Lỗi hệ thống: " +
              (error.response?.data?.message ||
                error.message ||
                "Unknown error"),
          );
        }
      } finally {
        setIsSubmitting(false);
        setShowModal(false);
      }
    } else if (action === "cancel") {
      setShowModal(false);
    }
  };

  function groupSelectedSlots(selectedSlots, courts) {
    const groups = [];
    const slotsByCourt = {};

    selectedSlots.forEach(({ courtId, slotVal }) => {
      if (!slotsByCourt[courtId]) slotsByCourt[courtId] = [];
      slotsByCourt[courtId].push(slotVal);
    });

    Object.keys(slotsByCourt).forEach((cId) => {
      const sorted = slotsByCourt[cId].sort((a, b) => a - b);
      let group = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
          group.push(sorted[i]);
        } else {
          groups.push({ courtId: cId, slots: group });
          group = [sorted[i]];
        }
      }
      if (group.length) groups.push({ courtId: cId, slots: group });
    });

    return groups.map(({ courtId, slots }) => {
      const courtObj = courts.find(
        (c) => c.id === courtId || c._id === courtId || c.courtId === courtId,
      );
      const courtName = courtObj ? courtObj.name : `Court ${courtId}`;
      return slots.length === 1
        ? { courtName, timeStr: formatSlot(slots[0]) }
        : {
            courtName,
            timeStr: `${formatSlot(slots[0])} - ${formatSlot(slots[slots.length - 1] + 1)}`,
          };
    });
  }

  return (
    <div className="booking-page" data-testid="booking-page">
      <div className="booking-header">
        <button
          onClick={handleGoBack}
          className="back-button"
          data-testid="back-to-centers-button"
        >
          <i className="fas fa-arrow-left"></i> Quay lại
        </button>
        <h1>Đặt sân</h1>
        <div></div>
      </div>

      {centerInfo && (
        <div className="center-info-bar" data-testid="center-info-bar">
          <div className="center-name" data-testid="center-name">
            <i className="fas fa-building"></i> {centerInfo.name}
          </div>
          <div className="center-details">
            <span data-testid="center-address">
              <i className="fas fa-map-marker-alt"></i> {centerInfo.address}
            </span>
            <span data-testid="center-phone">
              <i className="fas fa-phone-alt"></i> {centerInfo.phone}
            </span>
            <span data-testid="center-open-hours">
              <i className="fas fa-clock"></i> {openHours}
            </span>
            <span data-testid="center-total-courts">
              <i className="fas fa-table-tennis"></i> {centerInfo.totalCourts}{" "}
              sân
            </span>
          </div>
        </div>
      )}

      <div className="date-legend-container">
        <div className="current-date" data-testid="selected-date-display">
          <i className="fas fa-calendar-alt"></i>
          <span>{formatDisplayDate(selectedDate)}</span>
        </div>

        <div className="control-panel">
          <Legend />
          <button
            onClick={fetchBookingStatus}
            className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
            title="Làm mới trạng thái sân"
          >
            <i className="fas fa-sync-alt"></i>
          </button>

          <div className="date-price-controls">
            <div
              className="date-picker-wrapper"
              onClick={() => datePickerRef.current?.openDatePicker()}
              data-testid="date-picker-wrapper"
            >
              <DatePicker
                ref={datePickerRef}
                value={selectedDate}
                onDateChange={handleDateChange}
              />
            </div>
            <button
              onClick={() => setShowPricingModal(true)}
              className="price-list-button"
              data-testid="view-pricing-button"
            >
              <i className="fas fa-tags"></i> Xem bảng giá
            </button>
          </div>
        </div>

        <div className="booking-reminder" data-testid="booking-reminder">
          <i className="fas fa-info-circle"></i>
          <p>
            Nếu bạn cần đặt lịch cố định, vui lòng liên hệ:{" "}
            <a href="tel:0918773883" data-testid="contact-phone-link">
              0972.628.815
            </a>{" "}
            để được hỗ trợ.
          </p>
        </div>
      </div>

      {!initialMappingLoaded && (
        <div className="loading-container" data-testid="loading-booking-data">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {initialMappingLoaded && courts.length > 0 ? (
        <div
          className="booking-table-container"
          data-testid="booking-table-container"
        >
          <BookingTable
            key={selectedDate}
            courts={courts}
            bookingData={displayMapping}
            toggleBookingStatus={toggleBookingStatus}
            times={times}
            slotCount={slotCount}
            currentUserId={userId}
            disableBooking={!initialMappingLoaded}
          />
        </div>
      ) : (
        initialMappingLoaded && (
          <div className="no-data-message" data-testid="no-data-message">
            Không tìm thấy dữ liệu sân
          </div>
        )
      )}

      {selectedSlots.length > 0 && (
        <div className="booking-footer" data-testid="booking-footer">
          <div className="expand-button-container">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="expand-button"
              aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
              data-testid="expand-details-button"
            >
              <i className={`fas fa-chevron-${isExpanded ? "down" : "up"}`}></i>
            </button>
          </div>

          {isExpanded && (
            <div
              className="booking-details"
              data-testid="booking-details-expanded"
            >
              <h3>Chi tiết đặt sân:</h3>
              <div className="selected-slots" data-testid="selected-slots-list">
                {groupSelectedSlots(selectedSlots, courts).map((item, idx) => (
                  <div key={idx} className="slot-item">
                    <span className="court-name">{item.courtName}:</span>
                    <span className="slot-time">{item.timeStr}</span>
                  </div>
                ))}
              </div>
              <div className="divider"></div>
              <div className="discount-info">
                {new Set(selectedSlots.map((slot) => slot.courtId)).size >=
                  2 && (
                  <p data-testid="discount-2-hours">
                    Đã giảm 5% (đặt từ 2 sân trở lên):{" "}
                    <span className="text-green-600">
                      -{formatMoney(originalAmount * 0.05)}
                    </span>
                  </p>
                )}
                {userPoints >= 2000 && (
                  <p data-testid="discount-points">
                    Đã giảm {userPoints >= 4000 ? 10 : 5}% (điểm thành viên):{" "}
                    <span className="text-green-600">
                      -
                      {formatMoney(
                        originalAmount * (userPoints >= 4000 ? 0.1 : 0.05),
                      )}
                    </span>
                  </p>
                )}
              </div>
              <div
                className="reminder-note"
                data-testid="booking-reminder-note"
              >
                <i className="fas fa-info-circle"></i>
                <p>Vui lòng đến sớm 10 phút trước giờ đặt sân.</p>
              </div>
            </div>
          )}

          <div className="booking-summary" data-testid="booking-summary">
            <div className="summary-item" data-testid="total-hours-summary">
              <span>Tổng thời gian:</span>
              <span className="hours-value">{totalHours} giờ</span>
            </div>
            <div className="summary-item" data-testid="total-amount-summary">
              <span>Tổng tiền:</span>
              <span className="amount-value">{formatMoney(totalAmount)}</span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="continue-button"
            data-testid="confirm-booking-button"
          >
            {isSubmitting ? (
              <span className="animate-spin mr-2">
                <i className="fas fa-spinner"></i>
              </span>
            ) : (
              <>
                <span>Tiếp tục</span>
                <i className="fas fa-arrow-right"></i>
              </>
            )}
          </button>
        </div>
      )}

      {showModal && (
        <ModalConfirmation
          isLoading={isSubmitting}
          onAction={handleModalAction}
          title="Xác nhận đặt sân"
          message={
            <>
              Giá dự kiến là{" "}
              <span className="font-bold text-yellow-500">
                {totalAmount.toLocaleString("vi-VN")} đ
              </span>
              . Bạn có chắc chắn muốn đặt các khung giờ đã chọn?{" "}
              <span role="img" aria-label="thinking">
                🧐
              </span>
            </>
          }
          data-testid="modal-confirmation"
        />
      )}

      {showPricingModal && (
        <PricingTable
          centerId={centerId}
          onClose={() => setShowPricingModal(false)}
          data-testid="pricing-table-modal"
        />
      )}
    </div>
  );
};

export default BookingSchedule;
