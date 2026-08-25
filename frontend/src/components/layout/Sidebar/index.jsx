import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { ChevronDown, ChevronRight, Check, Building2 } from "lucide-react";
import { menuItems } from "./menu";
import styles from "./Sidebar.module.css";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ collapsed }) {
  const [openMenus, setOpenMenus] = useState({
    Masters: true,
    Accounting: true,
    Opening: true,
  });

  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);

  const navigate = useNavigate();

  const { companies = [], activeCompany, switchCompany } = useAuth();

  const toggleMenu = (title) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleCompanySwitch = async (company) => {
    if (activeCompany?.company_id === company.company_id) {
      setCompanyMenuOpen(false);
      return;
    }

    try {
      await switchCompany(company.company_id);

      setCompanyMenuOpen(false);

      window.location.reload();
    } catch (error) {
      console.error("Unable to switch company:", error);
    }
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* APP HEADER */}
      {/* COMPANY SWITCHER */}

      {!collapsed && (
        <div className={styles.companySwitcherWrapper}>
          <button
            type="button"
            className={styles.companySwitcher}
            onClick={() => setCompanyMenuOpen((open) => !open)}
          >
            <div className={styles.companyInfo}>
              {activeCompany?.logo ? (
                <img
                  src={activeCompany.logo}
                  alt=""
                  className={styles.companyLogo}
                />
              ) : (
                <div className={styles.companyLogoPlaceholder}>
                  <Building2 size={18} />
                </div>
              )}

              <div className={styles.companyText}>
                <span className={styles.companyLabel}>COMPANY</span>

                <strong>
                  {activeCompany?.company_name || "Select Company"}
                </strong>
              </div>
            </div>

            <ChevronDown
              size={17}
              className={
                companyMenuOpen ? styles.arrowOpen : styles.companyArrow
              }
            />
          </button>

          {/* COMPANY DROPDOWN */}

          {companyMenuOpen && (
            <div className={styles.companyDropdown}>
              <div className={styles.dropdownHeader}>Switch company</div>

              <div className={styles.companyList}>
                {companies.length === 0 ? (
                  <div className={styles.emptyCompanies}>
                    No companies available
                  </div>
                ) : (
                  companies.map((company) => {
                    const isActive =
                      activeCompany?.company_id === company.company_id;

                    return (
                      <button
                        key={company.company_id}
                        type="button"
                        className={`${styles.companyOption} ${
                          isActive ? styles.activeCompanyOption : ""
                        }`}
                        onClick={() => handleCompanySwitch(company)}
                      >
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt=""
                            className={styles.companyOptionLogo}
                          />
                        ) : (
                          <div className={styles.companyOptionLogoPlaceholder}>
                            <Building2 size={16} />
                          </div>
                        )}

                        <div className={styles.companyOptionInfo}>
                          <strong>{company.company_name}</strong>

                          <span>{company.company_code}</span>
                        </div>

                        {isActive && (
                          <Check size={17} className={styles.activeCheck} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NAVIGATION */}

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
                <div className={styles.left}>
                  <Icon size={20} />

                  {!collapsed && <span>{item.title}</span>}
                </div>
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
