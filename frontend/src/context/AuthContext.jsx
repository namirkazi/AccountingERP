import { createContext, useContext, useEffect, useState } from "react";

import {
  login as loginRequest,
  logout as logoutRequest,
  getCurrentUser,
  switchCompany as switchCompanyService,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  async function checkAuthentication() {
    try {
      const response = await getCurrentUser();

      if (response?.success) {
        const data = response.data;

        setUser(data.user);

        setCompanies(Array.isArray(data.companies) ? data.companies : []);

        setActiveCompany(data.active_company || null);
      } else {
        setUser(null);
        setCompanies([]);
        setActiveCompany(null);
      }
    } catch {
      setUser(null);
      setCompanies([]);
      setActiveCompany(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    // First establish the PHP session.
    await loginRequest(username, password);

    // Then fetch the canonical authenticated state.
    // /me.php determines the role from the active company.
    const currentUserResponse = await getCurrentUser();

    if (!currentUserResponse?.success) {
      throw new Error(
        currentUserResponse?.message || "Unable to load authenticated user.",
      );
    }

    const data = currentUserResponse.data;

    setUser(data.user);

    setCompanies(Array.isArray(data.companies) ? data.companies : []);

    setActiveCompany(data.active_company || null);

    return currentUserResponse;
  }

  async function logout() {
    await logoutRequest();

    setUser(null);
    setCompanies([]);
    setActiveCompany(null);
  }

  async function switchCompany(companyId) {
    const response = await switchCompanyService(companyId);

    if (!response?.success) {
      throw new Error(response?.message || "Unable to switch company.");
    }

    const data = response.data;

    // Update the active company immediately.
    setActiveCompany(data.active_company || null);

    // Re-fetch the complete user state so the
    // company-specific role is also updated.
    const currentUserResponse = await getCurrentUser();

    if (currentUserResponse?.success) {
      const currentData = currentUserResponse.data;

      setUser(currentData.user);

      setCompanies(
        Array.isArray(currentData.companies) ? currentData.companies : [],
      );

      setActiveCompany(currentData.active_company || null);
    }

    return response;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
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
