import { createContext, useCallback, useMemo, useState } from "react";

export const SessionContext = createContext(null);

export function SessionProvider({
  children,
  session = window.__BADMINTON_SESSION__,
}) {
  const [profile, setProfile] = useState(() => {
    if (session?.profile) {
      return {
        ...session.profile,
        _id: session.profile._id || session.profile.userId,
        userId: session.profile.userId || session.profile._id,
      };
    }
    try {
      const stored = localStorage.getItem("badminton_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.userId || parsed._id)) {
          return {
            ...parsed,
            _id: parsed._id || parsed.userId,
            userId: parsed.userId || parsed._id,
          };
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const setUser = useCallback((user) => {
    if (user) {
      const normalized = {
        ...user,
        _id: user._id || user.userId,
        userId: user.userId || user._id,
      };
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
      const finalUser = userData ? { ...defaultUser, ...userData } : defaultUser;
      setUser(finalUser);
      return finalUser;
    },
    [setUser],
  );

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  const value = useMemo(
    () => ({ user: profile, setUser, login, logout, loading: false }),
    [profile, setUser, login, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
