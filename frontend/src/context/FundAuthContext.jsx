import { createContext, useContext, useEffect, useState } from "react";

import {
  fundLogin,
  fundLogout,
  getCurrentFundUser,
} from "../services/fundAuthService";

const FundAuthContext = createContext(null);

export function FundAuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await getCurrentFundUser();

        if (cancelled) {
          return;
        }

        setUser(response?.data?.user || null);
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(username, password) {
    const response = await fundLogin(username, password);

    const loggedInUser = response?.data?.user;

    if (!loggedInUser) {
      throw new Error("Unable to load Funds user.");
    }

    setUser(loggedInUser);

    return loggedInUser;
  }

  async function logout() {
    try {
      await fundLogout();
    } finally {
      setUser(null);
    }
  }

  return (
    <FundAuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </FundAuthContext.Provider>
  );
}

export function useFundAuth() {
  const context = useContext(FundAuthContext);

  if (!context) {
    throw new Error("useFundAuth must be used inside FundAuthProvider.");
  }

  return context;
}
