import http from "../../../shared/api/http.js";

export async function listUsers(params) {
  const { data } = await http.get("/api/identity/users", { params });
  return data;
}
export async function listManagers() {
  const users = [];
  let total;
  do {
    const page = await listUsers({
      role: "center_manager",
      isActive: "true",
      offset: users.length,
      limit: 100,
    });
    users.push(...page.users);
    total = page.total;
    if (page.users.length === 0) break;
  } while (users.length < total);
  return users;
}
export async function changeStatus(userId, isActive, reason) {
  const { data } = await http.patch(
    `/api/identity/users/${encodeURIComponent(userId)}/status`,
    { isActive, reason },
  );
  return data;
}
export async function changeRole(userId, role, reason) {
  const { data } = await http.put(
    `/api/identity/users/${encodeURIComponent(userId)}/role`,
    { role, reason },
  );
  return data;
}
export async function assignManager(assignment) {
  const { data } = await http.put(
    "/api/identity/center-assignments",
    assignment,
  );
  return data;
}
