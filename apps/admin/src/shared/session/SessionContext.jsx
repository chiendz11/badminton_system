import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import http from "../api/http.js";
import {
  logoutSession,
  refreshSession,
} from "../api/auth.js";
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

export function SessionProvider({ children, session }) {
  const hostProvided = useRef(
    session !== undefined || window.__BADMINTON_SESSION__ !== undefined,
  );
  const initialSession = useRef(
    session !== undefined ? session : window.__BADMINTON_SESSION__,
  );
  const [current, setCurrent] = useState(() => {
    const sess = initialSession.current;
    if (sess?.profile && isAdminRole(sess.profile.role)) {
      try {
        return normalizeSession(sess);
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(
    !hostProvided.current ||
      Boolean(initialSession.current?.accessToken && !current),
  );

  const clearSession = useCallback(() => {
    window.__BADMINTON_SESSION__ = null;
    setCurrent(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    void logoutSession().catch(() => {});
  }, [clearSession]);

  const updateSession = useCallback((nextSession) => {
    const normalized = normalizeSession(nextSession);
    window.__BADMINTON_SESSION__ = normalized;
    setCurrent(normalized);
  }, []);

  const setUser = useCallback(
    (userData) => {
      if (!userData) {
        clearSession();
        return;
      }
      updateSession({
        accessToken: userData.accessToken || "mock-admin-token",
        expiresIn: 900,
        profile: {
          userId: userData.userId || userData._id || "admin-1",
          name: userData.name || "Quản trị viên",
          email: userData.email || "admin@example.com",
          role: userData.role || "super_admin",
        },
      });
    },
    [clearSession, updateSession],
  );

  const login = useCallback(
    (adminData) => {
      const defaultAdmin = {
        userId: "admin-1",
        name: "Quản trị viên (Admin)",
        email: "admin@badminton.vn",
        role: "super_admin",
      };
      const finalAdmin = adminData
        ? { ...defaultAdmin, ...adminData }
        : defaultAdmin;
      setUser(finalAdmin);
      return finalAdmin;
    },
    [setUser],
  );

  useEffect(() => {
    let active = true;
    const sess = initialSession.current;
    if (!sess?.accessToken) {
      if (hostProvided.current) {
        window.__BADMINTON_SESSION__ = null;
        setLoading(false);
        return;
      }
      refreshSession()
        .then((refreshed) => {
          if (active) updateSession(refreshed);
        })
        .catch(() => {
          if (active) clearSession();
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }
    http
      .get("/api/auth/me", {
        skipAuth: true,
        skipRefresh: true,
        headers: { Authorization: `Bearer ${sess.accessToken}` },
      })
      .then(({ data }) => {
        if (!active) return;
        // The server validates the JWT and returns the current role.
        const payload = JSON.parse(
          atob(
            sess.accessToken
              .split(".")[1]
              .replace(/-/g, "+")
              .replace(/_/g, "/"),
          ),
        );
        updateSession({
          ...sess,
          profile: data.profile,
          expiresIn: payload.exp - Date.now() / 1000,
        });
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clearSession, updateSession]);

  useEffect(() => {
    if (!current) return;
    const remaining = Math.max(0, current.expiresAt - Date.now());
    const expiryTimer = setTimeout(clearSession, remaining);
    const timers = [expiryTimer];
    if (remaining > 30_000) {
      timers.push(
        setTimeout(() => {
          void refreshSession()
            .then(updateSession)
            .catch(() => {});
        }, remaining - 30_000),
      );
    }
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [clearSession, current, updateSession]);

  useEffect(() => {
    const interceptor = http.interceptors.response.use(
      undefined,
      async (error) => {
        const originalConfig = error?.config;
        if (
          error.response?.status === 401 &&
          originalConfig &&
          !originalConfig._retried &&
          !originalConfig.skipAuth &&
          !originalConfig.skipRefresh &&
          current &&
          originalConfig.headers?.Authorization ===
            `Bearer ${current.accessToken}` &&
          window.__BADMINTON_SESSION__?.accessToken === current.accessToken
        ) {
          try {
            const refreshed = await refreshSession();
            updateSession(refreshed);
            const headers = {
              ...originalConfig.headers,
              Authorization: `Bearer ${refreshed.accessToken}`,
            };
            return http({ ...originalConfig, headers, _retried: true });
          } catch {
            clearSession();
          }
        }
        return Promise.reject(error);
      },
    );
    return () => http.interceptors.response.eject(interceptor);
  }, [clearSession, current, updateSession]);

  const value = useMemo(
    () => ({
      admin: current?.profile ?? null,
      setAdmin: setUser,
      user: current?.profile ?? null,
      setUser,
      updateSession,
      login,
      logout,
      loading,
    }),
    [current, setUser, updateSession, login, logout, loading],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
