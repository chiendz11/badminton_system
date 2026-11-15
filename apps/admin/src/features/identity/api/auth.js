import http from "../../../shared/api/http.js";
export {
  logoutSession,
  refreshSession,
} from "../../../shared/api/auth.js";

export async function login(credentials) {
  const { data } = await http.post("/api/auth/login", credentials, {
    skipAuth: true,
    skipRefresh: true,
  });
  return data;
}
