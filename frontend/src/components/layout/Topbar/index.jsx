import { Bell, ChevronDown, LogOut, Menu, Search, User } from "lucide-react";

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

import styles from "./Topbar.module.css";
function getPageTitle(pathname, portal) {
  if (pathname === "/dashboard") {
    return "Dashboard";
  }

  if (pathname === "/opening") {
    return "Capital & Balances";
  }

  if (pathname === "/transactions") {
    return "Accounting";
  }

  if (pathname === "/ledger") {
    return "General Ledger";
  }

  if (pathname === "/companies/add") {
    return "Add Company";
  }

  if (pathname === "/settings") {
    return "Settings";
  }

  if (pathname === "/funds/dashboard") {
    return "Funds Dashboard";
  }

  if (pathname === "/funds/ledger") {
    return "Funds Ledger";
  }

  return portal === "funds" ? "Funds Management" : "Accounting ERP";
}
export default function Topbar({ collapsed, setCollapsed }) {
  const { user, portal, activeCompany, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const initials =
    user?.full_name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  return (
    <header className={styles.topbar}>
      {/* Left */}

      <div className={styles.left}>
        <button
          className={styles.menuButton}
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={22} />
        </button>

        <div>
          <h2>{getPageTitle(location.pathname, portal)}</h2>

          <p>
            {portal === "funds"
              ? "Funds Management System"
              : activeCompany?.company_name || "Accounting ERP"}
          </p>
        </div>
      </div>

      {/* Right */}

      <div className={styles.right}>
        {/* Search */}

        <div className={styles.search}>
          <Search size={18} />

          <input placeholder="Search..." />
        </div>

        {/* Notifications */}

        <button className={styles.notification}>
          <Bell size={20} />
        </button>

        {/* Profile */}

        <div className={styles.profileWrapper}>
          <button
            className={styles.profile}
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className={styles.avatar}>{initials}</div>

            <div className={styles.userInfo}>
              <span>{user?.full_name || "User"}</span>

              <small>
                {portal === "funds"
                  ? user?.role === "admin"
                    ? "Funds Administrator"
                    : "Funds Operator"
                  : user?.role === "admin"
                    ? "Administrator"
                    : "User"}
              </small>
            </div>

            <ChevronDown
              size={18}
              className={profileOpen ? styles.rotate : ""}
            />
          </button>

          {/* Dropdown */}

          {profileOpen && (
            <div className={styles.profileMenu}>
              <div className={styles.profileHeader}>
                <div className={styles.largeAvatar}>{initials}</div>

                <div>
                  <strong>{user?.full_name}</strong>

                  <span>
                    {portal === "funds"
                      ? "Funds Management System"
                      : activeCompany?.company_name || "Accounting ERP"}
                  </span>
                </div>
              </div>

              <div className={styles.menuDivider} />

              <button className={styles.profileItem}>
                <User size={18} />
                Profile
              </button>

              <button
                className={`${styles.profileItem} ${styles.logoutItem}`}
                onClick={handleLogout}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
