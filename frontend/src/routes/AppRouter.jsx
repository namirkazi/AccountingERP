import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import AdminRoute from "../components/auth/AdminRoute";

import Transactions from "../pages/Transactions/Transactions";

import FundTransactions from "../pages/Funds/FundTransactions";

import FundLedger from "../pages/Funds/FundLedger";

import Login from "../pages/Login/Login";

import Dashboard from "../pages/Dashboard/Dashboard";

import Customers from "../pages/Customers/Customers";

import Openings from "../pages/Opening/Opening";

import ProtectedRoute from "./ProtectedRoute";

import Ledger from "../pages/Ledger/Ledger";

import Settings from "../pages/Settings/Settings";

import AddCompany from "../pages/Companies/AddCompany";

import FundDashboard from "../pages/Funds/FundDashboard";

export default function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        {/* =================================
            SHARED LOGIN
        ================================= */}

        <Route path="/" element={<Login />} />

        {/* =================================
            ACCOUNTING PORTAL
        ================================= */}

        <Route element={<ProtectedRoute portal="accounting" />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/customers" element={<Customers />} />

          <Route path="/opening" element={<Openings />} />

          <Route path="/transactions" element={<Transactions />} />

          <Route path="/ledger" element={<Ledger />} />

          <Route path="/settings" element={<Settings />} />

          <Route element={<AdminRoute />}>
            <Route path="/companies/add" element={<AddCompany />} />
          </Route>
        </Route>

        {/* =================================
            FUNDS PORTAL
        ================================= */}

        <Route element={<ProtectedRoute portal="funds" />}>
          <Route path="/funds/dashboard" element={<FundDashboard />} />

          <Route path="/funds/transactions" element={<FundTransactions />} />

          <Route path="/funds/ledger" element={<FundLedger />} />
        </Route>
        {/* =================================
            FALLBACK
        ================================= */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
