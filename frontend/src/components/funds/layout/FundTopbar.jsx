import { ChevronDown, LogOut, Menu, User } from "lucide-react";

import { useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { useFundAuth } from "../../../context/FundAuthContext";

import styles from "../../layout/Topbar/Topbar.module.css";

function getPageTitle(pathname) {
  if (pathname.includes("/funds/transactions")) {
    return "Deposit / Withdrawal";
  }

  if (pathname.includes("/funds/ledger")) {
    return "Funds Ledger";
  }

  return "Funds Dashboard";
}

export default function FundTopbar({ collapsed, setCollapsed }) {
  const { user, logout } = useFundAuth();

  const navigate = useNavigate();

  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();

      navigate("/funds/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Funds logout failed:", error);
    }
  }

  const initials =
    user?.full_name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FU";

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={22} />
        </button>

        <div>
          <h2>{getPageTitle(location.pathname)}</h2>

          <p>Funds Management System</p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.profileWrapper}>
          <button
            type="button"
            className={styles.profile}
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className={styles.avatar}>{initials}</div>

            <div className={styles.userInfo}>
              <span>{user?.full_name || "Funds User"}</span>

              <small>
                {user?.role === "admin" ? "Administrator" : "Operator"}
              </small>
            </div>

            <ChevronDown
              size={18}
              className={profileOpen ? styles.rotate : ""}
            />
          </button>

          {profileOpen && (
            <div className={styles.profileMenu}>
              <div className={styles.profileHeader}>
                <div className={styles.largeAvatar}>{initials}</div>

                <div>
                  <strong>{user?.full_name}</strong>

                  <span>Funds System</span>
                </div>
              </div>

              <div className={styles.menuDivider} />

              <button type="button" className={styles.profileItem}>
                <User size={18} />

                {user?.username}
              </button>

              <button
                type="button"
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
