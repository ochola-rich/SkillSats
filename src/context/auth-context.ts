import { createContext } from "react";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: "LEARNER" | "CREATOR" | "ADVERTISER";
  balanceSats: number;
};

export type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
