import axiosInstance from "../../../../../shared/api/http.js";

// Khai báo base path, không phải endpoint hoàn chỉnh
const REST_UPLOAD_BASE_PATH = "/api/v1/centers";

export const uploadImageREST = async (centerId, file, type) => {
  // 💡 SỬA ĐỔI CHÍNH: Tạo URL động, nhúng centerId vào path
  // Ví dụ: /api/v1/centers/C001/files
  const UPLOAD_URL = `${REST_UPLOAD_BASE_PATH}/${centerId}/files`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  // Sử dụng UPLOAD_URL mới
  const response = await axiosInstance.post(UPLOAD_URL, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
