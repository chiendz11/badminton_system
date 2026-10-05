import axiosInstance from "../../../../../shared/api/http.js";
export const getCommentsForCenter = async (centerId) => {
  try {
    const response = await axiosInstance.get(`/api/ratings/${centerId}`);
    return response.data; // { reviews: [...] }
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Gửi đánh giá
export const submitRating = async (ratingData) => {
  try {
    const response = await axiosInstance.post("/api/ratings", ratingData);
    return response.data;
  } catch (error) {
    throw error.response && error.response.data.message
      ? error.response.data.message
      : error.message;
  }
};
