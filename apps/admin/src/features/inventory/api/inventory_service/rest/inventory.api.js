import axiosInstance from "../../../../../shared/api/http.js";

/** ✔ Nhập kho = Transaction Service → /api/transactions/stock */
export async function importStock(data) {
  try {
    const response = await axiosInstance.post("/api/transactions/stock", data);
    return response;
  } catch (error) {
    console.error("Error importing stock:", error);
    throw error;
  }
}

export async function importNewStock(payload) {
  try {
    // API này gọi sang TransactionController.importNewStock
    const response = await axiosInstance.post(
      "/api/transactions/stock/new",
      payload,
    );
    return response;
  } catch (error) {
    console.error("Error importing NEW stock:", error);
    throw error;
  }
}

/** ✔ Lịch sử nhập kho = Transaction Service → /api/transactions/stock */
export async function getStockHistory(params = {}) {
  try {
    const response = await axiosInstance.get("/api/transactions/stock", {
      params,
    });
    return response;
  } catch (error) {
    console.error("Error fetching stock history:", error);
    throw error;
  }
}

/** ✔ Bán hàng (xuất kho) = Transaction Service → /api/transactions/sell */
export async function sellStock(data) {
  try {
    const response = await axiosInstance.post("/api/transactions/sell", data);
    return response;
  } catch (error) {
    console.error("Error selling stock:", error);
    throw error;
  }
}

/** ✔ Lấy danh sách tồn kho = Inventory Service → /api/inventories/center/:centerId */
export async function getInventoryList(centerId) {
  try {
    const response = await axiosInstance.get(
      `/api/inventories/center/${centerId}`,
    );
    return response;
  } catch (error) {
    console.error("Error fetching inventory list:", error);
    throw error;
  }
}
