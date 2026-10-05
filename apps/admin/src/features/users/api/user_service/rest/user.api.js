import axiosInstance from "../../../../../shared/api/http.js";

// Lấy thông tin Admin/Me
export const fetchAdminInfo = async () => {
  try {
    const response = await axiosInstance.get("/api/users/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
};

// 1. Lấy danh sách Users (Hỗ trợ filter Role, Search, Pagination)
export const getAllUsers = async (params) => {
  try {
    // params: { page, limit, role, search, isActive, sort, ... }
    const response = await axiosInstance.get("/api/users", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    // Trả về object lỗi chuẩn để UI không bị crash
    return {
      success: false,
      message: error.response?.data?.message || "Lỗi tải danh sách người dùng.",
    };
  }
};

// 💡 [MỚI] 4. Cập nhật thông tin Profile (Tên, SĐT,...) cho User bất kỳ
// Dành cho Admin chỉnh sửa thông tin người dùng
export const updateUserProfile = async (userId, data) => {
  try {
    const response = await axiosInstance.patch(`/api/users/${userId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * 💡 API ĐÃ SỬA: Cập nhật ảnh đại diện (File upload).
 * Gọi PUT /api/users/me/avatar (Mô hình Proxy)
 * @param {File} avatarFile - File ảnh thô (raw file) từ input
 */
export const updateAvatar = async (avatarFile) => {
  try {
    // 1. Tạo FormData
    const formData = new FormData();

    // 2. Thêm file vào FormData.
    // Tên field 'avatar' phải khớp với upload.single('avatar') trong user.route.js
    formData.append("avatar", avatarFile, avatarFile.name);

    // 3. Gọi API (PUT /me/avatar) với FormData.
    // Axios sẽ tự động set Content-Type: multipart/form-data
    const response = await axiosInstance.put("/api/users/me/avatar", formData);

    // Trả về profile đã cập nhật (chứa avatar_url mới)
    return response.data;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
};
