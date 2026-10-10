import axiosInstance from "../../../../../shared/api/http.js";

// --- CÁC HÀM CŨ (GIỮ NGUYÊN) ---

export const getPendingMapping = async (centerId, date) => {
  try {
    const response = await axiosInstance.get("/api/booking/pending/mapping", {
      params: { centerId, date },
    });
    return response.data.mapping;
  } catch (error) {
    console.error(
      "Error fetching pending mapping:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getAllBookingsForAdmin = async (params) => {
  try {
    const response = await axiosInstance.get("/api/booking/bookings", {
      params: params,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi lấy danh sách booking:", error);
    throw error;
  }
};

// ==========================================
// ✅ HÀM MỚI: TẠO LỊCH CỐ ĐỊNH
// ==========================================
export const createFixedBookings = async (
  payload,
  idempotencyKey = crypto.randomUUID(),
) => {
  try {
    // Payload gửi lên sẽ có dạng:
    // {
    //   userId: "...",
    //   centerId: "...",
    //   type: "fixed",
    //   bookings: [ { date: "ISO...", courtId: "...", timeslots: [17, 18] }, ... ]
    // }
    const response = await axiosInstance.post(
      "/api/booking/create-fixed-bookings",
      payload,
      { headers: { "Idempotency-Key": idempotencyKey } },
    );
    return response.data;
  } catch (error) {
    // Log lỗi chi tiết để debug
    console.error(
      "Lỗi khi tạo lịch cố định:",
      error.response?.data || error.message,
    );

    // Ném lỗi `response.data` để UI (CreateFixedBooking.jsx) lấy được message từ Backend
    // (ví dụ: "Sân đã bị trùng...")
    throw error.response?.data || error;
  }
};
export const getAvailableCourts = async ({
  centerId,
  startDate,
  daysOfWeek,
  timeslots,
}) => {
  try {
    // Payload phải khớp với Body trong Controller
    const payload = {
      centerId,
      startDate, // date object hoặc ISO string
      daysOfWeek, // [1, 3]
      timeslots, // ["17:00", "18:00"]
    };

    const response = await axiosInstance.post(
      "/api/booking/check-available-courts",
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Error checking availability:", error);
    throw error;
  }
};
