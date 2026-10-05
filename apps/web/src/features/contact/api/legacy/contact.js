import axiosInstance from "../../../../shared/api/http.js";

export const createContact = async (payload) => {
  try {
    const response = await axiosInstance.post("api/contact/", payload);
    return response.data;
  } catch (error) {
    console.error(
      "Error creating contact:",
      error.response?.data || error.message,
    );
    throw error;
  }
};
