import http from "../../../shared/api/http.js";

export async function login(credentials) {
  const { data } = await http.post("/api/auth/login", credentials, {
    skipAuth: true,
  });
  return data;
}
