import axiosInstance from "../../../../shared/api/http.js";

export const getAllNotification = async () => {
  try {
    const response = await axiosInstance.get("/api/notification");
    return response.data;
  } catch (error) {
    console.error("Error searching notification:", error);
    throw error;
  }
};

export const getNumberOfUnread = async () => {
  try {
    const response = await axiosInstance.get("/api/notification/unread");
    return response.data;
  } catch (error) {
    console.error("Error searching notification:", error);
    throw error;
  }
};

export const readAll = async () => {
  try {
    // Matches: router.get("/social/search-friends"...)
    const response = await axiosInstance.patch("/api/notification/read");
    return response.data;
  } catch (error) {
    console.error("Error searching notification:", error);
    throw error;
  }
};
