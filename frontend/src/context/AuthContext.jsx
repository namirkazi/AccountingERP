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
    const response = await loginRequest(username, password);

    const data = response.data;

    setUser(data.user);

    setCompanies(Array.isArray(data.companies) ? data.companies : []);

    setActiveCompany(data.active_company || null);

    return response;
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

    setActiveCompany(data.active_company || null);

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
