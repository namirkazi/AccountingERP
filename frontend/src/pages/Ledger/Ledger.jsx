import { BookOpen, RefreshCw } from "lucide-react";
import PrintableVoucher from "../../components/accounting/PrintableVoucher";
import { useSearchParams } from "react-router-dom";

import AppLayout from "../../components/layout/AppLayout";

import LedgerFilters from "./components/LedgerFilters";

import LedgerTable from "./components/LedgerTable";

import LedgerSummary from "./components/LedgerSummary";

import styles from "./Ledger.module.css";

import { useCallback, useEffect, useRef, useState } from "react";

import { getLedger, getVoucher } from "../../services/ledgerService";

const VOUCHER_TYPES = [
  {
    value: "SALE",
    label: "Sales",
  },
  {
    value: "RECEIPT",
    label: "Receipts",
  },
  {
    value: "PAYMENT",
    label: "Payments",
  },
  {
    value: "EXPENSE",
    label: "Expenses",
  },
];

export default function Ledger() {
  const [searchParams, setSearchParams] = useSearchParams();

  const voucherPrintRef = useRef(null);
  /*
   * Dashboard navigation type.
   *
   * Examples:
   *
   * /ledger?type=sales
   * /ledger?type=receipt
   * /ledger?type=expense
   * /ledger?type=payments
   *
   */
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [savingVoucher, setSavingVoucher] = useState(false);

  const [editDate, setEditDate] = useState("");
  const [editParty, setEditParty] = useState(null);
  const [editReferenceNumber, setEditReferenceNumber] = useState("");
  const [editItems, setEditItems] = useState([]);
  const [editDiscount, setEditDiscount] = useState("");
  const [editDiscountMode, setEditDiscountMode] = useState("after_tax");
  const [editVatRate, setEditVatRate] = useState("");
  const [editNarration, setEditNarration] = useState("");
  const [editAttachment, setEditAttachment] = useState(null);
  const type = searchParams.get("type") || "";

  const [search, setSearch] = useState("");

  const [selectedAccounts, setSelectedAccounts] = useState([]);

  const [selectedVoucherTypes, setSelectedVoucherTypes] = useState([]);

  const [selectedParties, setSelectedParties] = useState([]);

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [entries, setEntries] = useState([]);

  const [accountOptions, setAccountOptions] = useState([]);

  const [partyOptions, setPartyOptions] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [sales, setSales] = useState(0);

  const [expenses, setExpenses] = useState(0);

  const [netActivity, setNetActivity] = useState(0);

  const [viewingVoucher, setViewingVoucher] = useState(null);

  const [loadingVoucher, setLoadingVoucher] = useState(false);

  const [voucherError, setVoucherError] = useState("");

  /*
   * =====================================================
   * DASHBOARD TYPE → VOUCHER TYPE FILTER
   * =====================================================
   *
   * The Dashboard sends a simple type through the URL.
   *
   * Example:
   *
   * /ledger?type=sales
   *
   * That needs to activate the existing Voucher Type
   * filter rather than creating a second filter system.
   *
   */

  useEffect(() => {
    const typeMap = {
      sales: ["SALE"],
      receipt: ["RECEIPT"],
      expense: ["EXPENSE"],
      payments: ["PAYMENT"],
    };

    const voucherType = typeMap[type];

    if (!voucherType) {
      return;
    }

    setSelectedVoucherTypes(voucherType);

    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("type");

    setSearchParams(nextParams, {
      replace: true,
    });
  }, [type, searchParams, setSearchParams]);

  /*
   * =====================================================
   * CLEAR FILTERS
   * =====================================================
   */

  function clearFilters() {
    setSearch("");

    setSelectedAccounts([]);

    setSelectedVoucherTypes([]);

    setSelectedParties([]);

    setDateFrom("");

    setDateTo("");
  }

  function startEditVoucher(voucher) {
    if (!voucher || voucher.type !== "expense") {
      return;
    }

    setEditDate(voucher.date || voucher.voucher_date || "");

    setEditParty(voucher.party || null);
    setEditReferenceNumber(voucher.billReference || "");

    setEditItems(
      Array.isArray(voucher.items)
        ? voucher.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity || 1),
            rate: Number(item.rate || 0),
            amount: Number(item.quantity || 1) * Number(item.rate || 0),
          }))
        : [],
    );

    setEditDiscount(voucher.discountAmount ?? "");

    setEditDiscountMode(voucher.discountMode || "after_tax");

    setEditVatRate(String(voucher.vatRate ?? 0));

    setEditNarration(voucher.narration || "");

    setEditAttachment(null);

    setEditingVoucher(voucher);
  }
  /*
   * =====================================================
   * LOAD LEDGER
   * =====================================================
   */
  const loadLedger = useCallback(async () => {
    setLoading(true);

    setError("");

    try {
      const response = await getLedger({
        type: "",
        search,
        accountIds: selectedAccounts,
        voucherTypes: selectedVoucherTypes,
        partyIds: selectedParties,
        dateFrom,
        dateTo,
      });

      const data = response?.data || {};

      /*
       * Ledger entries
       */

      setEntries(Array.isArray(data.entries) ? data.entries : []);

      /*
       * Totals
       */

      setSales(Number(data.totals?.sales || 0));

      setExpenses(Number(data.totals?.expenses || 0));

      setNetActivity(Number(data.totals?.net_activity || 0));

      /*
       * Build Account filter options.
       */

      setAccountOptions(
        (data.filters?.accounts || []).map((account) => ({
          value: String(account.id),

          label: account.account_name,
        })),
      );

      /*
       * Build Party filter options.
       */

      setPartyOptions(
        (data.filters?.parties || []).map((party) => ({
          value: String(party.id),

          label: party.party_name,
        })),
      );
    } catch (requestError) {
      console.error("Ledger loading failed:", requestError);

      setEntries([]);

      setSales(0);

      setExpenses(0);

      setNetActivity(0);

      setError(requestError.message || "Unable to load ledger.");
    } finally {
      setLoading(false);
    }
  }, [
    type,
    search,
    selectedAccounts,
    selectedVoucherTypes,
    selectedParties,
    dateFrom,
    dateTo,
  ]);

  /*
   * =====================================================
   * LOAD WHEN FILTERS CHANGE
   * =====================================================
   */

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  /*
   * =====================================================
   * VIEW VOUCHER
   * =====================================================
   */
  const handlePrintViewedVoucher = () => {
    if (!voucherPrintRef.current) {
      return;
    }

    window.print();
  };
  async function handleViewVoucher(entry) {
    const voucherId = Number(entry?.voucher_id);

    if (!voucherId) {
      setVoucherError("This ledger entry does not have a valid voucher.");

      return;
    }

    try {
      setVoucherError("");
      setLoadingVoucher(true);

      const response = await getVoucher(voucherId);

      const voucher = response?.data || response?.voucher || null;

      if (!voucher) {
        throw new Error("Unable to load this voucher.");
      }

      setViewingVoucher(voucher);
    } catch (error) {
      console.error("Unable to view voucher:", error);

      setVoucherError(error.message || "Unable to load voucher.");
    } finally {
      setLoadingVoucher(false);
    }
  }

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* =================================================
                    HEADER
                ================================================= */}

        <header className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleIcon}>
              <BookOpen size={22} />
            </div>

            <div>
              <h1>General Ledger</h1>

              <p>View and filter all accounting transactions.</p>
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

        {/* =================================================
                    ACTIVE DASHBOARD FILTER
                ================================================= */}

        {type && (
          <div className={styles.activeTypeFilter}>
            <span className={styles.activeTypeLabel}>Showing:</span>

            <strong>
              {type === "sales"
                ? "Sales"
                : type === "receipt"
                  ? "Receipts"
                  : type === "expense"
                    ? "Expenses"
                    : type === "payments"
                      ? "Payments"
                      : type === "receivable"
                        ? "Receivables"
                        : type === "payable"
                          ? "Payables"
                          : type === "cash"
                            ? "Cash"
                            : type === "bank"
                              ? "Bank"
                              : type === "capital"
                                ? "Capital"
                                : type}
            </strong>
          </div>
        )}

        {/* =================================================
                    FILTERS
                ================================================= */}

        <LedgerFilters
          search={search}
          setSearch={setSearch}
          accountOptions={accountOptions}
          selectedAccounts={selectedAccounts}
          setSelectedAccounts={setSelectedAccounts}
          voucherTypeOptions={VOUCHER_TYPES}
          selectedVoucherTypes={selectedVoucherTypes}
          setSelectedVoucherTypes={setSelectedVoucherTypes}
          partyOptions={partyOptions}
          selectedParties={selectedParties}
          setSelectedParties={setSelectedParties}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          clearFilters={clearFilters}
        />

        {/* =================================================
                    ERROR
                ================================================= */}

        {error && <div className={styles.error}>{error}</div>}

        {/* =================================================
                    SUMMARY
                ================================================= */}

        <LedgerSummary
          entries={entries}
          sales={sales}
          expenses={expenses}
          netActivity={netActivity}
        />

        {/* =================================================
                    TABLE
                ================================================= */}

        <section className={styles.tableCard}>
          <LedgerTable
            entries={entries}
            loading={loading}
            onViewVoucher={handleViewVoucher}
          />
        </section>
      </div>
      {loadingVoucher && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "24px 32px",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            Loading bill...
          </div>
        </div>
      )}

      {voucherError && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 10000,
            background: "#ffffff",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "14px 18px",
            color: "#b91c1c",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          {voucherError}
        </div>
      )}

      {viewingVoucher && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(15, 23, 42, 0.72)",
            overflowY: "auto",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: 980,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <button
                type="button"
                onClick={() => startEditVoucher(viewingVoucher)}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={handlePrintViewedVoucher}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  background: "#111827",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Print
              </button>

              <button
                type="button"
                onClick={() => setViewingVoucher(null)}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  background: "#ffffff",
                  color: "#111827",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div
              ref={voucherPrintRef}
              className={styles.ledgerVoucherPrintArea}
            >
              <PrintableVoucher
                type={viewingVoucher.type}
                date={viewingVoucher.date}
                party={viewingVoucher.party}
                company={viewingVoucher.company}
                referenceNumber={viewingVoucher.referenceNumber}
                billReference={
                  viewingVoucher.type === "expense"
                    ? viewingVoucher.billReference || ""
                    : viewingVoucher.type === "payment"
                      ? viewingVoucher.selectedPaymentBill?.voucher_number ||
                        viewingVoucher.selectedPaymentBill?.voucher_no ||
                        ""
                      : ""
                }
                voucherNumber={viewingVoucher.voucherNumber}
                items={viewingVoucher.items}
                amount={viewingVoucher.amount}
                discountAmount={viewingVoucher.discountAmount}
                vatRate={viewingVoucher.vatRate}
                vatAmount={viewingVoucher.vatAmount}
                totalAmount={viewingVoucher.totalAmount}
                paymentAmount={viewingVoucher.paymentAmount}
                receiptAmount={viewingVoucher.receiptAmount}
                paymentAccount={viewingVoucher.paymentAccount}
                selectedPaymentBill={viewingVoucher.selectedPaymentBill}
                selectedReceiptBill={viewingVoucher.selectedReceiptBill}
                narration={viewingVoucher.narration}
                documentStatus="COPY"
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
