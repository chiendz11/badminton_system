import axiosInstance from "../../../../../shared/api/http.js";

// Cách viết mới: Nhận vào 1 object params chứa tất cả (userId, page, limit, status, search...)
export const getBookingHistory = async (userId, params) => {
  try {
    const response = await axiosInstance.get(
      `/api/user/${userId}/booking-history`,
      {
        params: params, // Axios sẽ tự chuyển object này thành ?page=1&limit=10...
      },
    );
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// API MỚI: Lấy thống kê tổng hợp (Aggregate)
// URL: /api/user/{userId}/statistics
export const getUserStatistics = async (params) => {
  try {
    const response = await axiosInstance.get(`/api/user/me/statistics`, {
      params: params, // Truyền period (week/month/year) hoặc các filter khác nếu cần
    });
    // Giả sử Backend trả về { success: true, data: { ... } } hoặc trực tiếp data
    return response.data;
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    throw error;
  }
};

export const checkMyExistsPendingBooking = async (centerId) => {
  try {
    const response = await axiosInstance.get(
      `/api/user/me/exists-pending-booking`,
      {
        params: { centerId },
      },
    );
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
