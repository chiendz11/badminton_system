import http from "./http.js";

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

export async function register({ email, username, password }) {
  const { data, status } = await http.post(
    "/api/auth/register",
    { email, username, password },
    { timeout: 15000 },
  );
  if (
    status !== 201 ||
    typeof data?.userId !== "string" ||
    data.role !== "user" ||
    data.isVerified !== false ||
    typeof data.verificationEmailSent !== "boolean"
  ) {
    throw new Error("Kết quả đăng ký không hợp lệ");
  }
  return data;
}

export async function resendVerificationEmail(email) {
  const { status } = await http.post("/api/auth/resend-verification", { email }, { timeout: 12000 });
  if (status !== 202) throw new Error("Kết quả gửi lại thư không hợp lệ");
}

export async function verifyEmail(token) {
  const { status } = await http.post("/api/auth/verify-email", { token }, { timeout: 12000 });
  if (status !== 204) throw new Error("Kết quả xác minh không hợp lệ");
}
