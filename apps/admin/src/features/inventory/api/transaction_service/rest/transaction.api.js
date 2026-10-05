import axiosInstance from "../../../../../shared/api/http.js";

const SELL_ENDPOINT = "/api/transactions/sell";

export async function getSellHistories(params = {}) {
  try {
    const response = await axiosInstance.get(SELL_ENDPOINT, { params });
    console.log("Sell histories response:", response);
    return response;
  } catch (error) {
    console.error("Error fetching sell histories:", error);
    throw error;
  }
}
