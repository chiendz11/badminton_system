import { createContext, useMemo, useState } from "react";
export const SessionContext = createContext(null);
export function SessionProvider({
  children,
  session = window.__BADMINTON_SESSION__,
}) {
  const [profile, setProfile] = useState(
    session?.profile
      ? {
          ...session.profile,
          _id: session.profile._id || session.profile.userId,
          userId: session.profile.userId || session.profile._id,
        }
      : null,
  );
  const value = useMemo(
    () => ({ user: profile, setUser: setProfile, loading: false }),
    [profile],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
