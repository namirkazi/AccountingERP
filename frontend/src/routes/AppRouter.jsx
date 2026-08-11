import {
    HashRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";


import Transactions from "../pages/Transactions/Transactions";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Customers from "../pages/Customers/Customers";
import Openings from "../pages/Opening/Opening";
import ProtectedRoute from "./ProtectedRoute";


export default function AppRouter() {

    return (

        <HashRouter>

            <Routes>

                <Route
                    path="/"
                    element={<Login />}
                />

                <Route element={<ProtectedRoute />}>

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />
                    <Route
                        path="/customers"
                        element={<Customers />}
                    />
                    <Route
                        path="/opening"
                        element={<Openings />}
                    />
                    <Route
                        path="/transactions"
                        element={<Transactions />}
                    />
                </Route>

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>

        </HashRouter>

    );
}