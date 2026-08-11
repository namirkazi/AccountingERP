import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { menuItems } from "./menu";
import styles from "./Sidebar.module.css";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ collapsed }) {
  const [openMenus, setOpenMenus] = useState({
    Masters: true,
    Accounting: true,
    Opening: true,
  });
  const navigate = useNavigate();
  const toggleMenu = (title) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""
        }`}
    >
      <div className={styles.logo}>
        <div className={styles.logoCircle}>M</div>

        {!collapsed && (
          <div>
            <h3>Accounting ERP</h3>
            <span>Mohinii</span>
          </div>
        )}
      </div>

      <nav className={styles.menu}>
        {menuItems.map((item) => {
          const Icon = item.icon;

          if (!item.children) {
            return (
              <button
                key={item.title}
                className={styles.menuItem}
                onClick={() => navigate(item.path)}
              >
                <Icon size={20} />

                {!collapsed && <span>{item.title}</span>}
              </button>
            );
          }

          return (
            <div key={item.title}>
              <button
                className={styles.menuItem}
                onClick={() => toggleMenu(item.title)}
              >
                <div className={styles.left}>
                  <Icon size={20} />

                  {!collapsed && <span>{item.title}</span>}
                </div>

                {!collapsed &&
                  (openMenus[item.title] ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>

              {!collapsed && openMenus[item.title] && (
                <div className={styles.submenu}>
                  {item.children.map((sub) => {
                    const SubIcon = sub.icon;

                    return (
                      <button
                        key={sub.title}
                        className={styles.submenuItem}
                        onClick={() => navigate(sub.path)}
                      >
                        <SubIcon size={18} />

                        <span>{sub.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}