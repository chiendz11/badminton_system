import http from "../../../shared/api/http.js";

export async function login(credentials) {
  const { data } = await http.post("/api/auth/login", credentials);

  if (
    typeof data?.accessToken !== "string" ||
    !data.accessToken ||
    typeof data?.profile?.userId !== "string"
  ) {
    throw new Error("Kết quả đăng nhập không hợp lệ");
  }

  return data;
}