import axiosInstance from "../../../../../shared/api/http.js";

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

export const getBookingStatusFromBookingId = async (bookingId) => {
  try {
    const response = await axiosInstance.get(
      `/api/booking/${bookingId}/status`,
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching booking status:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const confirmBookingToDB = async ({
  centerId,
  bookDate,
  userName,
  courtBookingDetails,
}) => {
  try {
    const response = await axiosInstance.post(
      "/api/booking/pending/pendingBookingToDB",
      {
        centerId,
        userName,
        courtBookingDetails,
        bookDate,
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error confirming booking to DB:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const cancelBooking = async (bookingId) => {
  return axiosInstance.patch(`/api/booking/${bookingId}`, {
    status: "cancelled",
  });
};

export const deleteBooking = async (bookingId) => {
  return axiosInstance.delete(`/api/booking/${bookingId}`);
};
