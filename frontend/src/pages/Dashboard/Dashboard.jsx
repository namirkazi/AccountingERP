import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { useAuth } from "../../context/AuthContext";
import { getDashboardBalances } from "../../services/dashboardService";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  ChevronRight,
  Landmark,
  Users,
  Wallet,
  X,
} from "lucide-react";

import styles from "./Dashboard.module.css";

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    cash: 0,
    bank: 0,
    receivable: 0,
    payable: 0,
    capital: 0,
    sales: 0,
    receipts: 0,
    payments: 0,
    expenses: 0,
    profit: 0,
  });

  const [bankAccounts, setBankAccounts] = useState([]);

  const [receivables, setReceivables] = useState([]);

  const [payables, setPayables] = useState([]);

  const [capitalInvestors, setCapitalInvestors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [detailType, setDetailType] = useState(null);

  const { user } = useAuth();

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "User";

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        setError("");

        const response = await getDashboardBalances();

        const data = response?.data || {};

        setSummary(data.summary || {});

        setReceivables(Array.isArray(data.receivables) ? data.receivables : []);

        setPayables(Array.isArray(data.payables) ? data.payables : []);

        setBankAccounts(
          Array.isArray(data.bank_accounts)
            ? data.bank_accounts.filter(
                (account) => Number(account.is_active) === 1,
              )
            : [],
        );

        setCapitalInvestors(
          Array.isArray(data.capital_investors) ? data.capital_investors : [],
        );
      } catch (error) {
        console.error("Dashboard error:", error);

        setError(error.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  /*
   * =====================================================
   * TOTAL BANK BALANCE
   * =====================================================
   *
   * Do NOT use summary.bank here.
   *
   * Each physical bank account has its own accounting
   * ledger account, so the dashboard calculates the
   * total from the individual bank balances.
   */

  const totalBankBalance = bankAccounts.reduce(
    (total, account) => total + Number(account.balance || 0),
    0,
  );

  /*
   * =====================================================
   * MODAL DATA
   * =====================================================
   */

  const detailItems =
    detailType === "receivable"
      ? receivables
      : detailType === "payable"
        ? payables
        : detailType === "capital"
          ? capitalInvestors
          : bankAccounts;

  const detailTotal =
    detailType === "receivable"
      ? summary.receivable
      : detailType === "payable"
        ? summary.payable
        : detailType === "capital"
          ? summary.capital_investor_total
          : totalBankBalance;

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* =========================================
                        HEADER
                    ========================================= */}

        <div className={styles.header}>
          <div>
            <h1>Dashboard</h1>

            <p>Good morning, {firstName}. Here's your business overview.</p>
          </div>

          <div className={styles.company}>
            {user?.logo ? (
              <img src={user.logo} alt={user.company_name} />
            ) : (
              <div className={styles.companyLogo}>
                {user?.company_code?.charAt(0) || "C"}
              </div>
            )}

            <div>
              <strong>{user?.company_name || "Company"}</strong>

              <span>{user?.role === "admin" ? "Administrator" : "User"}</span>
            </div>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* =========================================
                        ASSETS / LIABILITIES
                    ========================================= */}

        <section>
          <div className={styles.sectionHeader}>
            <h2>Accounting Overview</h2>

            <span>Current Position</span>
          </div>

          <div className={styles.positionGrid}>
            {/* =================================
                                ASSETS
                            ================================= */}

            <div className={styles.positionCard}>
              <div className={styles.positionHeader}>
                <div>
                  <div className={styles.positionIcon}>
                    <Wallet size={19} />
                  </div>

                  <div>
                    <h3>Assets</h3>

                    <span>Business inflows and receivables</span>
                  </div>
                </div>
              </div>

              <div className={styles.positionRows}>
                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => navigate("/ledger?type=sales")}
                >
                  <div className={styles.rowIcon}>
                    <Wallet size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Sales</strong>

                    <span>Total sales</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.sales)}
                  </strong>
                </button>

                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => navigate("/ledger?type=receipt")}
                >
                  <div className={styles.rowIcon}>
                    <ArrowDownToLine size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Receipts</strong>

                    <span>Money received</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.receipts)}
                  </strong>
                </button>

                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => setDetailType("receivable")}
                >
                  <div className={styles.rowIcon}>
                    <Users size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Receivable</strong>

                    <span>Money owed by customers</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.receivable)}
                  </strong>

                  <ChevronRight size={17} className={styles.rowArrow} />
                </button>
              </div>
            </div>

            {/* =================================
                                LIABILITIES
                            ================================= */}

            <div className={styles.positionCard}>
              <div className={styles.positionHeader}>
                <div>
                  <div className={styles.positionIcon}>
                    <Landmark size={19} />
                  </div>

                  <div>
                    <h3>Liabilities</h3>

                    <span>Business outflows and obligations</span>
                  </div>
                </div>
              </div>

              <div className={styles.positionRows}>
                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => navigate("/ledger?type=expense")}
                >
                  <div className={styles.rowIcon}>
                    <ArrowUpFromLine size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Expenses</strong>

                    <span>Total expenses</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.expenses)}
                  </strong>
                </button>

                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => navigate("/ledger?type=payments")}
                >
                  <div className={styles.rowIcon}>
                    <ArrowUpFromLine size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Payments</strong>

                    <span>Money paid</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.payments)}
                  </strong>
                </button>

                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => setDetailType("payable")}
                >
                  <div className={styles.rowIcon}>
                    <Building2 size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Payable</strong>

                    <span>Money owed to suppliers</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.payable)}
                  </strong>

                  <ChevronRight size={17} className={styles.rowArrow} />
                </button>
              </div>
            </div>

            {/* =========================================
                        CASH / BANK
                    ========================================= */}

            <div className={styles.positionCard}>
              <div className={styles.positionHeader}>
                <div>
                  <div className={styles.positionIcon}>
                    <Wallet size={19} />
                  </div>

                  <div>
                    <h3>Cash in Hand & Bank</h3>

                    <span>Current cash and bank balances</span>
                  </div>
                </div>
              </div>

              <div className={styles.positionRows}>
                {/* ================================
                            CASH
                        ================================= */}

                <div className={`${styles.positionRow} ${styles.clickableRow}`}>
                  <div className={styles.rowIcon}>
                    <Wallet size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Cash in Hand</strong>

                    <span>Cash balance</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.cash)}
                  </strong>
                </div>

                {/* ================================
                            BANK
                        ================================= */}

                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => setDetailType("bank")}
                >
                  <div className={styles.rowIcon}>
                    <Building2 size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Bank</strong>

                    <span>All bank accounts</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(totalBankBalance)}
                  </strong>

                  <ChevronRight size={17} className={styles.rowArrow} />
                </button>
              </div>
            </div>

            {/* =================================
                                CAPITAL
                            ================================= */}

            <div className={styles.positionCard}>
              <div className={styles.positionHeader}>
                {/* INVESTOR CAPITAL */}

                <button
                  type="button"
                  className={`${styles.positionRow} ${styles.clickableRow}`}
                  onClick={() => setDetailType("capital")}
                >
                  <div className={styles.rowIcon}>
                    <Landmark size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Investor Capital</strong>

                    <span>Total contributed by investors</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.capital_investor_total)}
                  </strong>

                  <ChevronRight size={17} className={styles.rowArrow} />
                </button>

                {/* CAPITAL ALLOCATED */}

                <div className={styles.positionRow}>
                  <div className={styles.rowIcon}>
                    <ArrowDownToLine size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Capital Allocated</strong>

                    <span>Moved into Cash and Bank</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.capital_transferred)}
                  </strong>
                </div>

                {/* AVAILABLE CAPITAL */}

                <div className={styles.positionRow}>
                  <div className={styles.rowIcon}>
                    <Wallet size={16} />
                  </div>

                  <div className={styles.rowContent}>
                    <strong>Available Capital</strong>

                    <span>Capital not yet allocated</span>
                  </div>

                  <strong className={styles.rowAmount}>
                    AED {formatAmount(summary.capital_available)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
                        DETAIL MODAL
                    ========================================= */}

        {detailType && (
          <div
            className={styles.modalOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setDetailType(null);
              }
            }}
          >
            <div className={styles.detailModal}>
              <div className={styles.modalHeader}>
                <div>
                  <h2>
                    {detailType === "receivable"
                      ? "Accounts Receivable"
                      : detailType === "payable"
                        ? "Accounts Payable"
                        : detailType === "capital"
                          ? "Capital by Investor"
                          : "Bank Accounts"}
                  </h2>

                  <p>
                    {detailType === "receivable"
                      ? "Outstanding amounts from customers"
                      : detailType === "payable"
                        ? "Outstanding amounts owed to suppliers"
                        : detailType === "capital"
                          ? "Original capital contributed by each investor"
                          : "Current balance of each bank account"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailType(null)}
                  className={styles.closeButton}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.detailTotal}>
                <span>
                  {detailType === "capital"
                    ? "Total Investor Capital"
                    : detailType === "bank"
                      ? "Total Bank Balance"
                      : "Total Outstanding"}
                </span>

                <strong>AED {formatAmount(detailTotal)}</strong>
              </div>

              <div className={styles.detailList}>
                {loading ? (
                  <div className={styles.detailEmpty}>Loading...</div>
                ) : detailItems.length === 0 ? (
                  <div className={styles.detailEmpty}>
                    {detailType === "capital"
                      ? "No investor capital found."
                      : detailType === "bank"
                        ? "No active bank accounts found."
                        : "No outstanding balances found."}
                  </div>
                ) : (
                  detailItems.map((item) => (
                    <div
                      key={
                        detailType === "bank"
                          ? item.id
                          : item.party_id || item.investor_id
                      }
                      className={styles.detailRow}
                    >
                      <div>
                        <strong>
                          {detailType === "bank"
                            ? item.bank_name
                            : item.party_name || item.investor_name}
                        </strong>

                        <span>
                          {detailType === "bank"
                            ? item.account_name
                            : detailType === "capital"
                              ? "Investor"
                              : item.party_type}
                        </span>
                      </div>

                      <strong>
                        {detailType === "bank"
                          ? `${item.currency || "AED"} ${formatAmount(
                              item.balance,
                            )}`
                          : `AED ${formatAmount(item.balance)}`}
                      </strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
