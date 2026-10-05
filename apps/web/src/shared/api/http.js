import axios from "axios";
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
axiosInstance.interceptors.request.use((config) => {
  const token = window.__BADMINTON_SESSION__?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (import.meta.env.VITE_CLIENT_ID)
    config.headers["x-client-id"] = import.meta.env.VITE_CLIENT_ID;
  return config;
});
export default axiosInstance;
