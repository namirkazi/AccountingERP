import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {

    const {
        isAuthenticated,
        loading
    } = useAuth();

    if (loading) {

        return (
            <div
                style={{
                    height: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                Loading...
            </div>
        );

    }

    if (!isAuthenticated) {

        return <Navigate to="/" replace />;

    }

    return <Outlet />;
}