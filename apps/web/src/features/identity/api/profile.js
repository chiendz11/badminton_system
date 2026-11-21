import http from "../../../shared/api/http.js";

export async function getProfile() {
  const { data } = await http.get("/api/identity/me");
  return data.profile;
}

export async function updateProfile(patch) {
  const { data } = await http.patch("/api/identity/me", patch);
  return data.profile;
}
