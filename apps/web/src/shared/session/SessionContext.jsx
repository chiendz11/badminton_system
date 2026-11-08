import { createContext, useCallback, useMemo, useState } from "react";

export const SessionContext = createContext(null);

function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    ...profile,
    _id: profile._id || profile.userId,
    userId: profile.userId || profile._id,
  };
}

export function SessionProvider({
  children,
  session = window.__BADMINTON_SESSION__,
}) {
  const [profile, setProfile] = useState(() => {
    if (session?.profile) {
      return normalizeProfile(session.profile);
    }
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
  });

  const setUser = useCallback((user) => {
    if (user) {
      const normalized = normalizeProfile(user);
      setProfile(normalized);
      try {
        localStorage.setItem("badminton_user", JSON.stringify(normalized));
      } catch {}
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
      setProfile(null);
      try {
        localStorage.removeItem("badminton_user");
      } catch {}
      if (window.__BADMINTON_SESSION__) {
        delete window.__BADMINTON_SESSION__.profile;
      }
    }
  }, []);

  const updateSession = useCallback(
    (nextSession) => {
      window.__BADMINTON_SESSION__ = nextSession;
      if (nextSession?.profile) {
        setUser({
          ...nextSession.profile,
          accessToken: nextSession.accessToken,
        });
      } else {
        setUser(null);
      }
    },
    [setUser],
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
    setUser(null);
  }, [setUser]);

  const value = useMemo(
    () => ({
      user: profile,
      setUser,
      updateSession,
      login,
      logout,
      loading: false,
    }),
    [profile, setUser, updateSession, login, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
