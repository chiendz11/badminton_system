import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import http from "../api/http.js";
import { logoutSession, refreshSession } from "../api/auth.js";

export const SessionContext = createContext(null);

function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    ...profile,
    _id: profile._id || profile.userId,
    userId: profile.userId || profile._id,
  };
}

function readStoredProfile() {
  try {
    const stored = localStorage.getItem("badminton_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && (parsed.userId || parsed._id)) {
        return normalizeProfile(parsed);
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function SessionProvider({ children, session }) {
  const hostProvided = useRef(
    session !== undefined || window.__BADMINTON_SESSION__ !== undefined,
  );
  const initialSession =
    session !== undefined ? session : window.__BADMINTON_SESSION__;

  const [profile, setProfile] = useState(() => {
    if (initialSession?.profile) {
      return normalizeProfile(initialSession.profile);
    }
    return hostProvided.current ? null : readStoredProfile();
  });
  const [expiresAt, setExpiresAt] = useState(() =>
    Number.isFinite(initialSession?.expiresIn) && initialSession.expiresIn > 0
      ? Date.now() + initialSession.expiresIn * 1000
      : null,
  );
  const [loading, setLoading] = useState(!hostProvided.current);

  const clearSession = useCallback(() => {
    setProfile(null);
    setExpiresAt(null);
    try {
      localStorage.removeItem("badminton_user");
    } catch {
      // ignore
    }
    window.__BADMINTON_SESSION__ = null;
  }, []);

  const setUser = useCallback(
    (user) => {
      if (user) {
        const normalized = normalizeProfile(user);
        setProfile(normalized);
        try {
          localStorage.setItem("badminton_user", JSON.stringify(normalized));
        } catch {
          // ignore
        }
        if (!window.__BADMINTON_SESSION__) {
          window.__BADMINTON_SESSION__ = {
            accessToken: user.accessToken || "mock-jwt-token-for-dev",
            profile: normalized,
          };
        } else {
          window.__BADMINTON_SESSION__.profile = normalized;
          if (user.accessToken) {
            window.__BADMINTON_SESSION__.accessToken = user.accessToken;
          }
        }
      } else {
        clearSession();
      }
    },
    [clearSession],
  );

  const updateSession = useCallback(
    (nextSession) => {
      window.__BADMINTON_SESSION__ = nextSession;
      if (nextSession?.profile) {
        setUser({
          ...nextSession.profile,
          accessToken: nextSession.accessToken,
        });
        setExpiresAt(
          Number.isFinite(nextSession.expiresIn) && nextSession.expiresIn > 0
            ? Date.now() + nextSession.expiresIn * 1000
            : null,
        );
      } else {
        clearSession();
      }
    },
    [clearSession, setUser],
  );

  const login = useCallback(
    (userData) => {
      const defaultUser = {
        userId: "user-1",
        name: "Nguyễn Văn A",
        email: "nguyenvana@gmail.com",
        phone: "0912345678",
        role: "user",
        avatar_url: "/images/user_avatar.png",
      };
      const finalUser = userData
        ? { ...defaultUser, ...userData }
        : defaultUser;
      setUser(finalUser);
      return finalUser;
    },
    [setUser],
  );

  const logout = useCallback(() => {
    clearSession();
    void logoutSession().catch(() => {});
  }, [clearSession]);

  useEffect(() => {
    if (hostProvided.current) return;
    let active = true;
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
  }, [clearSession, updateSession]);

  useEffect(() => {
    if (!expiresAt) return;
    const refreshDelay = expiresAt - Date.now() - 30_000;
    if (refreshDelay <= 0) return;
    const timer = setTimeout(() => {
      void refreshSession()
        .then(updateSession)
        .catch(() => {});
    }, refreshDelay);
    return () => clearTimeout(timer);
  }, [expiresAt, updateSession]);

  useEffect(() => {
    const interceptor = http.interceptors.response.use(
      undefined,
      async (error) => {
        const originalConfig = error?.config;
        const activeToken = window.__BADMINTON_SESSION__?.accessToken;
        if (
          error?.response?.status === 401 &&
          originalConfig &&
          !originalConfig._retried &&
          !originalConfig.skipAuth &&
          !originalConfig.skipRefresh &&
          activeToken &&
          originalConfig.headers?.Authorization === `Bearer ${activeToken}`
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
  }, [clearSession, updateSession]);

  const value = useMemo(
    () => ({
      user: profile,
      setUser,
      updateSession,
      login,
      logout,
      loading,
    }),
    [profile, setUser, updateSession, login, logout, loading],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
