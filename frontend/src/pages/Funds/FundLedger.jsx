import {
  ArrowUpFromLine,
  BookOpen,
  History,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import AppLayout from "../../components/layout/AppLayout";

import { getFundLedger, searchFundParties } from "../../services/fundService";

import styles from "./FundLedger.module.css";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date) {
  if (!date) {
    return "-";
  }

  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  opening_balance: 0,

  total_deposited: 0,

  total_withdrawn: 0,

  closing_balance: 0,

  transaction_count: 0,

  period_transaction_count: 0,
};

export default function FundLedger() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryType = (searchParams.get("type") || "").toUpperCase();

  const [search, setSearch] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [type, setType] = useState(
    queryType === "DEPOSIT" || queryType === "WITHDRAWAL" ? queryType : "",
  );

  const [partyId, setPartyId] = useState("");

  const [parties, setParties] = useState([]);

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [transactions, setTransactions] = useState([]);

  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /*
   * =========================================
   * URL TYPE FILTER
   * =========================================
   */

  useEffect(() => {
    if (queryType === "DEPOSIT" || queryType === "WITHDRAWAL") {
      setType(queryType);
    } else {
      setType("");
    }
  }, [queryType]);

  /*
   * =========================================
   * SEARCH DEBOUNCE
   * =========================================
   */

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  /*
   * =========================================
   * LOAD PARTIES
   * =========================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadParties() {
      try {
        const response = await searchFundParties("");

        if (cancelled) {
          return;
        }

        setParties(
          Array.isArray(response?.data?.parties) ? response.data.parties : [],
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to load fund parties:", error);

        setParties([]);
      }
    }

    loadParties();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * =========================================
   * LOAD LEDGER
   * =========================================
   */

  const loadLedger = useCallback(async () => {
    try {
      setLoading(true);

      setError("");

      const response = await getFundLedger({
        search: debouncedSearch,

        type,

        partyId: partyId || null,

        dateFrom,

        dateTo,
      });

      const data = response?.data || {};

      setTransactions(
        Array.isArray(data.transactions) ? data.transactions : [],
      );

      setSummary({
        ...EMPTY_SUMMARY,
        ...(data.summary || {}),
      });
    } catch (error) {
      console.error("Unable to load funds ledger:", error);

      setTransactions([]);

      setSummary(EMPTY_SUMMARY);

      setError(error.message || "Unable to load funds ledger.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, type, partyId, dateFrom, dateTo]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  /*
   * =========================================
   * TYPE
   * =========================================
   */

  function handleTypeChange(nextType) {
    setType(nextType);

    const nextParams = new URLSearchParams(searchParams);

    if (nextType) {
      nextParams.set("type", nextType);
    } else {
      nextParams.delete("type");
    }

    setSearchParams(nextParams, {
      replace: true,
    });
  }

  /*
   * =========================================
   * CLEAR FILTERS
   * =========================================
   */

  function clearFilters() {
    setSearch("");

    setDebouncedSearch("");

    setType("");

    setPartyId("");

    setDateFrom("");

    setDateTo("");

    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("type");

    setSearchParams(nextParams, {
      replace: true,
    });
  }

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* HEADER */}

        <header className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleIcon}>
              <BookOpen size={22} />
            </div>

            <div>
              <h1>Funds Ledger</h1>

              <p>View deposits, withdrawals and party balances.</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadLedger}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? styles.spin : ""} />
            Refresh
          </button>
        </header>

        {/* FILTERS */}

        <section className={styles.filters}>
          <div className={styles.searchField}>
            <Search size={17} />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search party, voucher, reference..."
            />
          </div>

          <select
            value={type}
            onChange={(event) => handleTypeChange(event.target.value)}
          >
            <option value="">All Transactions</option>

            <option value="DEPOSIT">Deposits</option>

            <option value="WITHDRAWAL">Withdrawals</option>
          </select>

          <select
            value={partyId}
            onChange={(event) => setPartyId(event.target.value)}
          >
            <option value="">All Parties</option>

            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.party_name}
              </option>
            ))}
          </select>

          <div className={styles.dateField}>
            <label>From</label>

            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>

          <div className={styles.dateField}>
            <label>To</label>

            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
          >
            <X size={15} />
            Clear
          </button>
        </section>

        {/* ERROR */}

        {error && <div className={styles.error}>{error}</div>}

        {/* SUMMARY */}

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <History size={18} />
            </div>

            <div>
              <span>Total Deposits</span>

              <strong>INR {formatMoney(summary.total_deposited)}</strong>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <ArrowUpFromLine size={18} />
            </div>

            <div>
              <span>Total Withdrawals</span>

              <strong>INR {formatMoney(summary.total_withdrawn)}</strong>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <Wallet size={18} />
            </div>

            <div>
              <span>{dateTo ? "Closing Balance" : "Current Balance"}</span>

              <strong>INR {formatMoney(summary.closing_balance)}</strong>
            </div>
          </div>
        </section>

        {/* TABLE */}

        <section className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <strong>Transactions</strong>

              <span>
                {summary.transaction_count} record
                {Number(summary.transaction_count) === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>

                  <th>Voucher</th>

                  <th>Party</th>

                  <th>Method</th>

                  <th>Deposit</th>

                  <th>Withdrawal</th>

                  <th>Balance</th>

                  <th>Prepared By</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.tableState}>
                        <div className={styles.spinner} />

                        <strong>Loading ledger...</strong>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.tableState}>
                        <BookOpen size={28} />

                        <strong>No transactions found</strong>

                        <span>Try changing the filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.transaction_date)}</td>

                      <td>
                        <div className={styles.voucherCell}>
                          <strong>{transaction.voucher_number}</strong>

                          <span>
                            {transaction.reference_number || "No reference"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className={styles.partyCell}>
                          <strong>{transaction.party_name}</strong>

                          {transaction.phone && (
                            <span>{transaction.phone}</span>
                          )}
                        </div>
                      </td>

                      <td>{formatMethod(transaction.payment_method)}</td>

                      <td className={styles.amountCell}>
                        {Number(transaction.deposit) > 0
                          ? `INR ${formatMoney(transaction.deposit)}`
                          : "-"}
                      </td>

                      <td className={styles.amountCell}>
                        {Number(transaction.withdrawal) > 0
                          ? `INR ${formatMoney(transaction.withdrawal)}`
                          : "-"}
                      </td>

                      <td className={styles.balanceCell}>
                        INR {formatMoney(transaction.running_balance)}
                      </td>

                      <td>
                        <div className={styles.preparedCell}>
                          <span
                            className={
                              transaction.transaction_type === "DEPOSIT"
                                ? styles.depositBadge
                                : styles.withdrawalBadge
                            }
                          >
                            {transaction.transaction_type === "DEPOSIT"
                              ? "Deposit"
                              : "Withdrawal"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
