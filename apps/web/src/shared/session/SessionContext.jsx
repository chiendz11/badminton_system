import {
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";

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
  const [profile, setProfile] = useState(() =>
    normalizeProfile(session?.profile),
  );

  const updateSession = useCallback((nextSession) => {
    window.__BADMINTON_SESSION__ = nextSession;

    setProfile(normalizeProfile(nextSession.profile));
  }, []);

  const value = useMemo(
    () => ({
      user: profile,
      setUser: setProfile,
      updateSession,
      loading: false,
    }),
    [profile, updateSession],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}