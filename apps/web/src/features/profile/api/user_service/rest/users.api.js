import api from "../../../../../shared/api/http.js"; // (Giả sử bạn import axios instance là 'api')
import axiosInstance from "../../../../../shared/api/http.js";

/**
 * Lấy thông tin hồ sơ của người dùng (profile) hiện tại đã đăng nhập.
 * Gọi GET /api/users/me
 */
export const fetchUserInfo = async () => {
  try {
    const response = await api.get("/api/users/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
};

export const fetchUsersByKeyword = async (keyword) => {
  try {
    const res = await axiosInstance.get(`/api/users/${keyword}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching users by keyword:", error);
    throw error;
  }
};

export const fetchUserExtra = async () => {
  try {
    const res = await axiosInstance.get("/api/users/users-extra");
    return res.data;
  } catch (error) {
    console.error("Error fetching user extra info:", error);
    throw error;
  }
};

export const updateUserExtra = async (extraData) => {
  try {
    const response = await axiosInstance.patch(
      "/api/users/users-extra",
      extraData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user extra info:", error);
    throw error;
  }
};

/**
 * Cập nhật hồ sơ (JSON data: name, phone_number...).
 * Gọi PATCH /api/users/me
 * @param {object} profileData - Dữ liệu JSON (vd: { name: 'New Name' })
 */
export const updateMyProfile = async (profileData) => {
  try {
    // API này CHỈ gửi JSON
    const response = await api.patch("/api/users/me", profileData, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * 💡 API ĐÃ SỬA: Cập nhật ảnh đại diện (File upload).
 * Gọi PUT /api/users/me/avatar
 * @param {File} avatarFile - File ảnh thô (raw file) từ input
 */
export const updateAvatar = async (avatarFile) => {
  try {
    // 1. Tạo FormData
    const formData = new FormData();

    // 2. Thêm file vào FormData.
    // Lưu ý: Tham số thứ 3 (filename) là optional nhưng nên có để server nhận đúng tên file gốc
    formData.append("avatar", avatarFile, avatarFile.name);

    // 3. Gọi API với cấu hình header RIÊNG BIỆT
    // Phải set 'Content-Type': 'multipart/form-data' để ghi đè cấu hình JSON mặc định của axiosInstance
    const response = await api.put("/api/users/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Trả về profile đã cập nhật
    return response.data;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
};
