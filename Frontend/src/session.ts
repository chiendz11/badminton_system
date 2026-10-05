import { useState } from "react";
import { ROLES, type Actor } from "@badminton/auth-contracts";
import { apiClient } from "@badminton/booking-ui";
const key = "badminton.session";
function read(): { token: string; actor: Actor } | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(key) || "null");
    if (
      !session ||
      typeof session.token !== "string" ||
      typeof session.actor?.userId !== "string" ||
      typeof session.actor?.name !== "string" ||
      !ROLES.includes(session.actor.role)
    )
      return null;
    return session;
  } catch {
    return null;
  }
}
export function useSession() {
  const [session, setSession] = useState(read);
  const api = apiClient(
    import.meta.env.VITE_API_URL || "",
    () => session?.token,
  );
  async function demo(profile: string) {
    const result = await api.call<{ token: string; actor: Actor }>(
      "/api/v1/dev/session",
      { method: "POST", body: JSON.stringify({ profile }) },
    );
    sessionStorage.setItem(key, JSON.stringify(result));
    setSession(result);
  }
  function logout() {
    sessionStorage.removeItem(key);
    setSession(null);
  }
  return { session, api, demo, logout };
}
