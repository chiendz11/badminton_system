import http from "./http.js";

let pendingRefresh = null;

export async function refreshSession() {
  if (!pendingRefresh) {
    pendingRefresh = http
      .post("/api/auth/refresh", null, {
        skipAuth: true,
        skipRefresh: true,
      })
      .then(({ data }) => data)
      .finally(() => {
        pendingRefresh = null;
      });
  }

  return pendingRefresh;
}

export async function logoutSession() {
  await http.post("/api/auth/logout", null, {
    skipAuth: true,
    skipRefresh: true,
  });
}
