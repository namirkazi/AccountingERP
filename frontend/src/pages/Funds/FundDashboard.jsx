import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  RefreshCw,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

import AppLayout from "../../components/layout/AppLayout";

import { getFundDashboard } from "../../services/fundService";

import styles from "./FundDashboard.module.css";

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN");
}

function formatMethod(method) {
  if (method === "BANK_TRANSFER") {
    return "Bank Transfer";
  }

  if (method === "OTHER") {
    return "Others";
  }

  return method || "-";
}

const EMPTY_SUMMARY = {
  total_deposited: 0,
  total_withdrawn: 0,
  total_payable: 0,
  current_balance: 0,
  transaction_count: 0,
  active_parties: 0,
  parties_with_balance: 0,
};

export default function FundDashboard() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [partyBalances, setPartyBalances] = useState([]);

  const [recentTransactions, setRecentTransactions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [payableOpen, setPayableOpen] = useState(false);

  async function loadDashboard() {
    try {
      setLoading(true);

      setError("");

      const response = await getFundDashboard();

      const data = response?.data || {};

      setSummary({
        ...EMPTY_SUMMARY,
        ...(data.summary || {}),
      });

      setPartyBalances(
        Array.isArray(data.party_balances) ? data.party_balances : [],
      );

      setRecentTransactions(
        Array.isArray(data.recent_transactions) ? data.recent_transactions : [],
      );
    } catch (error) {
      console.error("Fund dashboard error:", error);

      setSummary(EMPTY_SUMMARY);

      setPartyBalances([]);

      setRecentTransactions([]);

      setError(error.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* HEADER */}

        <div className={styles.header}>
          <div>
            <h1>Funds Dashboard</h1>

            <p>Overview of deposits, withdrawals and funds currently held.</p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? styles.spin : ""} />
            Refresh
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* SUMMARY */}

        <section>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Funds Overview</h2>

              <span>Current Position</span>
            </div>
          </div>

          <div className={styles.summaryGrid}>
            {/* DEPOSITS */}

            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>
                <ArrowDownToLine size={20} />
              </div>

              <div className={styles.summaryContent}>
                <span>Total Deposits</span>

                <strong>INR {formatAmount(summary.total_deposited)}</strong>

                <small>Money received from parties</small>
              </div>
            </div>

            {/* WITHDRAWALS */}

            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>
                <ArrowUpFromLine size={20} />
              </div>

              <div className={styles.summaryContent}>
                <span>Total Withdrawals</span>

                <strong>INR {formatAmount(summary.total_withdrawn)}</strong>

                <small>Money returned to parties</small>
              </div>
            </div>

            {/* TOTAL PAYABLE */}

            <button
              type="button"
              className={`${styles.summaryCard} ${styles.payableCard}`}
              onClick={() => setPayableOpen(true)}
            >
              <div className={styles.summaryIcon}>
                <Wallet size={20} />
              </div>

              <div className={styles.summaryContent}>
                <span>Total Amount</span>

                <strong>INR {formatAmount(summary.total_payable)}</strong>

                <small>Amount currently held for parties</small>
              </div>

              <ChevronRight size={19} className={styles.cardArrow} />
            </button>
          </div>
        </section>

        {/* SMALL STATS */}

        <section>
          <div className={styles.smallStats}>
            <div>
              <Users size={18} />

              <span>Parties With Balance</span>

              <strong>{summary.parties_with_balance}</strong>
            </div>

            <div>
              <Wallet size={18} />

              <span>Transactions</span>

              <strong>{summary.transaction_count}</strong>
            </div>
          </div>
        </section>

        {/* RECENT TRANSACTIONS */}

        <section>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Recent Transactions</h2>

              <span>Latest 10 entries</span>
            </div>
          </div>

          <div className={styles.tableCard}>
            {loading ? (
              <div className={styles.emptyState}>Loading...</div>
            ) : recentTransactions.length === 0 ? (
              <div className={styles.emptyState}>No transactions yet.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>

                      <th>Voucher</th>

                      <th>Party</th>

                      <th>Method</th>

                      <th>Type</th>

                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.transaction_date)}</td>

                        <td>
                          <strong>{transaction.voucher_number}</strong>
                        </td>

                        <td>{transaction.party_name}</td>

                        <td>{formatMethod(transaction.payment_method)}</td>

                        <td>
                          <span
                            className={
                              transaction.transaction_type === "DEPOSIT"
                                ? styles.depositBadge
                                : styles.withdrawalBadge
                            }
                          >
                            {transaction.transaction_type}
                          </span>
                        </td>

                        <td className={styles.amountCell}>
                          INR {formatAmount(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* TOTAL PAYABLE MODAL */}

      {payableOpen && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPayableOpen(false);
            }
          }}
        >
          <div className={styles.detailModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Total Amount</h2>

                <p>Money currently held on behalf of each party.</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setPayableOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.detailTotal}>
              <div>
                <span>Total Amount Held</span>

                <strong>INR {formatAmount(summary.total_payable)}</strong>
              </div>

              <span className={styles.partyCount}>
                {summary.parties_with_balance} part
                {Number(summary.parties_with_balance) === 1 ? "y" : "ies"}
              </span>
            </div>

            <div className={styles.detailList}>
              {loading ? (
                <div className={styles.detailEmpty}>Loading...</div>
              ) : partyBalances.length === 0 ? (
                <div className={styles.detailEmpty}>
                  No party balances found.
                </div>
              ) : (
                partyBalances.map((party) => (
                  <div key={party.party_id} className={styles.detailRow}>
                    <div className={styles.partyInfo}>
                      <strong>{party.party_name}</strong>
                    </div>

                    <div className={styles.partyAmounts}>
                      <small>
                        Deposited: INR {formatAmount(party.total_deposited)}
                      </small>

                      <small>
                        Withdrawn: INR {formatAmount(party.total_withdrawn)}
                      </small>

                      <strong>INR {formatAmount(party.balance)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
