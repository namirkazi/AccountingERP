import { Navigate, Outlet } from "react-router-dom";

import { useFundAuth } from "../../context/FundAuthContext";

export default function FundProtectedRoute({ children }) {
  const { user, loading } = useFundAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/funds/login" replace />;
  }

  return children || <Outlet />;
}
