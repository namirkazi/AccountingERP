import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminRoute from "../components/auth/AdminRoute";
import Transactions from "../pages/Transactions/Transactions";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Customers from "../pages/Customers/Customers";
import Openings from "../pages/Opening/Opening";
import ProtectedRoute from "./ProtectedRoute";
import Ledger from "../pages/Ledger/Ledger";
import Settings from "../pages/Settings/Settings";
import AddCompany from "../pages/Companies/AddCompany";

export default function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/opening" element={<Openings />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/settings" element={<Settings />} />
          <Route element={<AdminRoute />}>
            <Route path="/companies/add" element={<AddCompany />} />
          </Route>{" "}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
