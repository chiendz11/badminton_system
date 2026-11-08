import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import http from "../api/http.js";
import { ROLES } from "../constants/roles.js";

export const SessionContext = createContext(null);
export const isAdminRole = (role) =>
  [ROLES.SUPER_ADMIN, ROLES.CENTER_MANAGER].includes(role);

function normalizeSession(session) {
  if (
    !session?.accessToken ||
    typeof session.accessToken !== "string" ||
    typeof session.profile?.userId !== "string" ||
    !session.profile.userId ||
    !isAdminRole(session.profile.role) ||
    !Number.isFinite(session.expiresIn) ||
    session.expiresIn <= 0
  ) {
    throw new Error(
      "Tài khoản không có quyền quản trị hoặc phiên không hợp lệ.",
    );
  }
  return {
    ...session,
    profile: { ...session.profile, _id: session.profile.userId },
    expiresAt: Date.now() + session.expiresIn * 1000,
  };
}

export function SessionProvider({
  children,
  session = window.__BADMINTON_SESSION__,
}) {
  const initialSession = useRef(session);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(Boolean(session?.accessToken));

  const logout = useCallback(() => {
    window.__BADMINTON_SESSION__ = null;
    setCurrent(null);
  }, []);

  const updateSession = useCallback((nextSession) => {
    const normalized = normalizeSession(nextSession);
    window.__BADMINTON_SESSION__ = normalized;
    setCurrent(normalized);
  }, []);

  useEffect(() => {
    let active = true;
    const session = initialSession.current;
    if (!session?.accessToken) {
      window.__BADMINTON_SESSION__ = null;
      setLoading(false);
      return;
    }
    http
      .get("/api/auth/me", {
        skipAuth: true,
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      .then(({ data }) => {
        if (!active) return;
        // The server validates the JWT and returns the current role.
        const payload = JSON.parse(
          atob(
            session.accessToken
              .split(".")[1]
              .replace(/-/g, "+")
              .replace(/_/g, "/"),
          ),
        );
        updateSession({
          ...session,
          profile: data.profile,
          expiresIn: payload.exp - Date.now() / 1000,
        });
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [logout, updateSession]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(
      logout,
      Math.max(0, current.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [current, logout]);

  useEffect(() => {
    const interceptor = http.interceptors.response.use(undefined, (error) => {
      if (
        error.response?.status === 401 &&
        current &&
        error.config?.headers?.Authorization ===
          `Bearer ${current.accessToken}` &&
        window.__BADMINTON_SESSION__?.accessToken === current.accessToken
      ) {
        logout();
      }
      return Promise.reject(error);
    });
    return () => http.interceptors.response.eject(interceptor);
  }, [current, logout]);

  const value = useMemo(
    () => ({
      admin: current?.profile ?? null,
      user: current?.profile ?? null,
      updateSession,
      logout,
      loading,
    }),
    [current, updateSession, logout, loading],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
