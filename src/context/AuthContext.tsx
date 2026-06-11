import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "../api/client";

export interface User {
  id: string;
  email: string;
  username: string;
  role: "LEARNER" | "CREATOR" | "ADVERTISER";
  balanceSats: number;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await apiClient.get<User>("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setUser(response.data);
      setToken(authToken);
    } catch (err) {
      console.error("Failed to fetch user with token:", err);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      setUser(null);
      setToken(null);
    }
  };

  const login = async (newToken: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", newToken);
    }
    await fetchUser(newToken);
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    let currentToken = token;
    if (typeof window !== "undefined") {
      currentToken = localStorage.getItem("token") || token;
    }
    if (currentToken) {
      await fetchUser(currentToken);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== "undefined") {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
          await fetchUser(storedToken);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
