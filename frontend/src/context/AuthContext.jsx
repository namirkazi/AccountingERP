import { createContext, useContext, useEffect, useState } from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  switchCompany as switchCompanyService,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [portal, setPortal] = useState(null);

  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState([]);

  const [activeCompany, setActiveCompany] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  function applyAuthData(data) {
    const nextPortal = data?.portal || data?.user?.portal || null;

    const nextUser = data?.user
      ? {
          ...data.user,
          portal: nextPortal,
        }
      : null;

    setPortal(nextPortal);

    setUser(nextUser);

    setCompanies(Array.isArray(data?.companies) ? data.companies : []);

    setActiveCompany(data?.active_company || null);
  }

  function clearAuthData() {
    setUser(null);

    setPortal(null);

    setCompanies([]);

    setActiveCompany(null);
  }

  async function checkAuthentication() {
    try {
      const response = await getCurrentUser();

      if (response?.success) {
        applyAuthData(response.data);
      } else {
        clearAuthData();
      }
    } catch {
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    while (loading) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    /*
     * Establish either:
     *
     * Accounting session
     *
     * OR
     *
     * Funds session
     */

    await loginRequest(username, password);

    /*
     * Load canonical session state.
     */

    const currentUserResponse = await getCurrentUser();

    if (!currentUserResponse?.success) {
      throw new Error(
        currentUserResponse?.message || "Unable to load authenticated user.",
      );
    }

    applyAuthData(currentUserResponse.data);

    return currentUserResponse;
  }

  async function logout() {
    await logoutRequest();

    clearAuthData();
  }

  async function switchCompany(companyId) {
    if (portal !== "accounting") {
      throw new Error(
        "Company switching is only available in the Accounting portal.",
      );
    }

    const response = await switchCompanyService(companyId);

    if (!response?.success) {
      throw new Error(response?.message || "Unable to switch company.");
    }

    const currentUserResponse = await getCurrentUser();

    if (currentUserResponse?.success) {
      applyAuthData(currentUserResponse.data);
    }

    return response;
  }

  return (
    <AuthContext.Provider
      value={{
        user,

        portal,

        loading,

        login,

        logout,

        isAuthenticated: !!user,

        companies,

        activeCompany,

        activeCompanyId: activeCompany?.company_id || null,

        switchCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
