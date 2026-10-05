import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ portal: requiredPortal = null }) {
  const { isAuthenticated, loading, portal } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  /*
   * Prevent a Funds user from manually
   * opening Accounting URLs and vice versa.
   */

  if (requiredPortal && portal !== requiredPortal) {
    return (
      <Navigate
        to={portal === "funds" ? "/funds/dashboard" : "/dashboard"}
        replace
      />
    );
  }

  return <Outlet />;
}
