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
      const stored = localStorage.getItem("badminton_admin");
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
        localStorage.setItem("badminton_admin", JSON.stringify(normalized));
      } catch {}
      if (!window.__BADMINTON_SESSION__) {
        window.__BADMINTON_SESSION__ = {
          accessToken: user.accessToken || "mock-admin-token",
          profile: normalized,
        };
      } else {
        window.__BADMINTON_SESSION__.profile = normalized;
      }
    } else {
      setProfile(null);
      try {
        localStorage.removeItem("badminton_admin");
      } catch {}
      if (window.__BADMINTON_SESSION__) {
        delete window.__BADMINTON_SESSION__.profile;
      }
    }
  }, []);

  const login = useCallback(
    (adminData) => {
      const defaultAdmin = {
        userId: "admin-1",
        name: "Quản trị viên (Admin)",
        email: "admin@badminton.vn",
        role: "super_admin",
      };
      const finalAdmin = adminData ? { ...defaultAdmin, ...adminData } : defaultAdmin;
      setUser(finalAdmin);
      return finalAdmin;
    },
    [setUser],
  );

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  const value = useMemo(
    () => ({
      admin: profile,
      setAdmin: setUser,
      user: profile,
      setUser,
      login,
      logout,
      loading: false,
    }),
    [profile, setUser, login, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
