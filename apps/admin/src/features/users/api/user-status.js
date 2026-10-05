import axiosInstance from "../../../shared/api/http.js";

export const updateUserStatus = async (userId, isActive) => {
  try {
    // Gửi { isActive: true/false }
    // Đường dẫn này tùy thuộc vào router bên Auth Service của bạn
    // Ví dụ: PATCH /api/auth/admin/users/:id/status
    const response = await axiosInstance.patch(`/api/users/${userId}/status`, {
      isActive,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
