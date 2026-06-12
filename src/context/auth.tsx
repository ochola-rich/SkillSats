import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";

import { AuthContext, type AuthUser } from "./auth-context";
import { getMe } from "../server/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const getCurrentUser = useServerFn(getMe);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
    }
  }, [getCurrentUser]);

  useEffect(() => {
    void refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, setUser, isLoading, refreshUser }),
    [user, isLoading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
