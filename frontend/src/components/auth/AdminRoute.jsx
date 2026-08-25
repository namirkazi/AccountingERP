import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminRoute() {
  const { user, loading, activeCompany } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = String(activeCompany?.role || user?.role || "").toLowerCase();

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
