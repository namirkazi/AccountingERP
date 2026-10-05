import { Wallet } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { fundMenuItems } from "./fundMenu";

import styles from "../../layout/Sidebar/Sidebar.module.css";

export default function FundSidebar({ collapsed }) {
  const navigate = useNavigate();

  const location = useLocation();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.logo}>
        <div className={styles.logoCircle}>
          <Wallet size={24} />
        </div>

        {!collapsed && (
          <div>
            <h3>Funds System</h3>
            <span>Deposit & Withdrawal</span>
          </div>
        )}
      </div>

      <nav className={styles.menu}>
        {fundMenuItems.map((item) => {
          const Icon = item.icon;

          const active = location.pathname === item.path.split("?")[0];

          return (
            <button
              key={item.title}
              type="button"
              className={styles.menuItem}
              onClick={() => navigate(item.path)}
              style={
                active
                  ? {
                      background: "#eff6ff",
                      color: "#2563eb",
                    }
                  : undefined
              }
            >
              <div className={styles.left}>
                <Icon size={20} />

                {!collapsed && <span>{item.title}</span>}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
