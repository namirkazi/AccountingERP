import { BookOpen, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import PartySelector from "../../components/accounting/PartySelector";
import PrintableCapitalVoucher from "../../components/accounting/PrintableCapitalVoucher";
import PrintableVoucher from "../../components/accounting/PrintableVoucher";
import AppLayout from "../../components/layout/AppLayout";

import LedgerFilters from "./components/LedgerFilters";
import LedgerSummary from "./components/LedgerSummary";
import LedgerTable from "./components/LedgerTable";

import { getLedger, getVoucher } from "../../services/ledgerService";

import { apiRequest } from "../../services/api";

import styles from "./Ledger.module.css";

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
  {
    value: "CAPITAL",
    label: "Capital",
  },
];

const SUPPORTED_EDIT_TYPES = [
  "sale",
  "receipt",
  "payment",
  "expense",
  "capital",
];

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normaliseItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const quantity = Number(item.quantity ?? item.qty ?? 1);

    const rate = Number(item.rate ?? 0);

    return {
      ...item,

      description: item.description || "",

      unit: item.unit || "",

      quantity,

      rate,

      amount: quantity * rate,
    };
  });
}

export default function Ledger() {
  const [searchParams, setSearchParams] = useSearchParams();

  const voucherPrintRef = useRef(null);

  /*
   * =====================================================
   * LEDGER FILTER STATE
   * =====================================================
   */

  const type = searchParams.get("type") || "";

  const [search, setSearch] = useState("");

  const [selectedAccounts, setSelectedAccounts] = useState([]);

  const [selectedVoucherTypes, setSelectedVoucherTypes] = useState([]);

  const [selectedParties, setSelectedParties] = useState([]);

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  /*
   * =====================================================
   * LEDGER DATA
   * =====================================================
   */

  const [entries, setEntries] = useState([]);

  const [accountOptions, setAccountOptions] = useState([]);

  const [partyOptions, setPartyOptions] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const [sales, setSales] = useState(0);

  const [expenses, setExpenses] = useState(0);

  const [payments, setPayments] = useState(0);

  const [payable, setPayable] = useState(0);

  const [receipts, setReceipts] = useState(0);

  const [receivable, setReceivable] = useState(0);

  /*
   * =====================================================
   * VIEW VOUCHER
   * =====================================================
   */

  const [viewingVoucher, setViewingVoucher] = useState(null);

  const [loadingVoucher, setLoadingVoucher] = useState(false);

  const [voucherError, setVoucherError] = useState("");

  /*
   * =====================================================
   * EDIT VOUCHER
   * =====================================================
   */

  const [editingVoucher, setEditingVoucher] = useState(null);

  const [savingVoucher, setSavingVoucher] = useState(false);

  const [editType, setEditType] = useState("");

  const [editVoucherNumber, setEditVoucherNumber] = useState("");

  const [editDate, setEditDate] = useState("");

  const [editParty, setEditParty] = useState(null);

  const [editBillReference, setEditBillReference] = useState("");

  const [editItems, setEditItems] = useState([]);

  const [editAmount, setEditAmount] = useState("");

  const [editVatRate, setEditVatRate] = useState("");

  const [editAdjustment, setEditAdjustment] = useState(0);

  const [editNarration, setEditNarration] = useState("");

  const [editAccountId, setEditAccountId] = useState("");

  const [editSourceVoucherId, setEditSourceVoucherId] = useState("");

  const [editPaymentAllocations, setEditPaymentAllocations] = useState([]);

  const [editCapitalAllocations, setEditCapitalAllocations] = useState([]);

  const [editAttachment, setEditAttachment] = useState(null);

  const [editError, setEditError] = useState("");

  /*
   * =====================================================
   * DASHBOARD TYPE → LEDGER FILTER
   * =====================================================
   */

  useEffect(() => {
    const typeMap = {
      sales: ["SALE"],

      receipt: ["RECEIPT"],

      expense: ["EXPENSE"],

      payments: ["PAYMENT"],

      capital: ["CAPITAL"],
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

      setEntries(Array.isArray(data.entries) ? data.entries : []);

      setSales(Number(data.totals?.sales || 0));

      setExpenses(Number(data.totals?.expenses || 0));

      setPayments(Number(data.totals?.payments || 0));

      setPayable(Number(data.totals?.payable || 0));

      setReceipts(Number(data.totals?.receipts || 0));

      setReceivable(Number(data.totals?.receivable || 0));

      setAccountOptions(
        (data.filters?.accounts || []).map((account) => ({
          value: String(account.id),

          label: account.account_name,

          account_type: account.account_type,

          account_subtype: account.account_subtype,
        })),
      );

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

      setPayments(0);

      setPayable(0);

      setReceipts(0);

      setReceivable(0);

      setError(requestError.message || "Unable to load ledger.");
    } finally {
      setLoading(false);
    }
  }, [
    search,
    selectedAccounts,
    selectedVoucherTypes,
    selectedParties,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  /*
   * =====================================================
   * VIEW VOUCHER
   * =====================================================
   */
  const editPaymentTotal = editPaymentAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0,
  );
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

  function handlePrintViewedVoucher() {
    if (!voucherPrintRef.current) {
      return;
    }

    window.print();
  }

  /*
   * =====================================================
   * START EDIT
   * =====================================================
   */

  function startEditVoucher(voucher) {
    if (!voucher) {
      return;
    }

    const voucherType = String(
      voucher.type || voucher.voucher_type || "",
    ).toLowerCase();

    if (!SUPPORTED_EDIT_TYPES.includes(voucherType)) {
      setVoucherError("This voucher type cannot be edited.");

      return;
    }

    setEditType(voucherType);

    setEditVoucherNumber(
      voucher.voucherNumber ||
        voucher.voucher_number ||
        voucher.referenceNumber ||
        voucher.reference_number ||
        "",
    );

    setEditDate(voucher.date || voucher.voucher_date || "");

    setEditParty(voucher.party || null);

    setEditBillReference(voucher.billReference || voucher.bill_reference || "");

    const items = normaliseItems(voucher.items);

    setEditItems(items);

    let voucherAmount = 0;

    switch (voucherType) {
      case "payment":
        voucherAmount = Number(
          voucher.paymentAmount || voucher.amount || voucher.totalAmount || 0,
        );
        break;

      case "receipt":
        voucherAmount = Number(
          voucher.receiptAmount || voucher.amount || voucher.totalAmount || 0,
        );
        break;

      case "sale":
      case "expense":
        voucherAmount = Number(voucher.totalAmount || voucher.amount || 0);
        break;

      case "capital":
        voucherAmount = Math.abs(
          Number(voucher.amount || voucher.totalAmount || 0),
        );
        break;

      default:
        voucherAmount = Number(voucher.amount || voucher.totalAmount || 0);
    }
    setEditAmount(String(voucherAmount));
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
      0,
    );

    const existingVat = Number(
      voucher.vatAmount ?? voucher.vat_output ?? voucher.vat_input ?? 0,
    );

    const existingVatRate = Number(voucher.vatRate || 0);

    const derivedVatRate =
      existingVatRate > 0
        ? existingVatRate
        : subtotal > 0
          ? (existingVat / subtotal) * 100
          : 0;

    setEditVatRate(derivedVatRate.toFixed(2).replace(/\.00$/, ""));

    const adjustment = voucherAmount - subtotal - existingVat;

    setEditAdjustment(Number(adjustment.toFixed(2)));

    setEditNarration(voucher.narration || "");

    /*
     * PAYMENT / RECEIPT ACCOUNT
     */

    const paymentAccount =
      voucher.paymentAccount || voucher.payment_account || null;

    setEditAccountId(
      String(paymentAccount?.account_id || paymentAccount?.id || ""),
    );

    /*
     * RECEIPT LINKED SALES BILL
     */

    const receiptBill =
      voucher.selectedReceiptBill || voucher.selected_receipt_bill || null;

    setEditSourceVoucherId(
      String(
        receiptBill?.id ||
          receiptBill?.voucher_id ||
          voucher.source_voucher_id ||
          "",
      ),
    );

    /*
     * PAYMENT ALLOCATIONS
     */

    const paymentAllocations =
      voucher.paymentAllocations || voucher.payment_allocations || [];

    setEditPaymentAllocations(
      Array.isArray(paymentAllocations)
        ? paymentAllocations.map((allocation) => ({
            ...allocation,

            expense_id: Number(
              allocation.expense_id || allocation.expense_voucher_id || 0,
            ),

            amount: Number(
              allocation.amount || allocation.allocation_amount || 0,
            ),
          }))
        : [],
    );

    /*
     * CAPITAL ALLOCATIONS
     */

    const allocations = Array.isArray(voucher.allocations)
      ? voucher.allocations
      : [];

    setEditCapitalAllocations(
      allocations.map((allocation) => ({
        ...allocation,

        type: allocation.type || (allocation.account_id ? "bank" : "cash"),

        account_id: allocation.account_id || "",

        amount: Number(allocation.amount || 0),
      })),
    );

    setEditAttachment(null);

    setEditError("");

    setEditingVoucher(voucher);
  }

  /*
   * =====================================================
   * SALE / EXPENSE ITEMS
   * =====================================================
   */

  function updateEditItem(index, field, value) {
    setEditItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const updated = {
          ...item,

          [field]: value,
        };

        return {
          ...updated,

          amount: Number(updated.quantity || 0) * Number(updated.rate || 0),
        };
      }),
    );
  }

  function addEditItem() {
    setEditItems((current) => [
      ...current,

      {
        description: "",
        unit: "",
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  }

  function removeEditItem(index) {
    setEditItems((current) =>
      current.filter((_item, itemIndex) => itemIndex !== index),
    );
  }

  /*
   * =====================================================
   * PAYMENT ALLOCATIONS
   * =====================================================
   */

  function updatePaymentAllocation(index, value) {
    setEditPaymentAllocations((current) =>
      current.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? {
              ...allocation,

              amount: value,
            }
          : allocation,
      ),
    );
  }

  /*
   * =====================================================
   * CAPITAL ALLOCATIONS
   * =====================================================
   */

  function updateCapitalAllocation(index, field, value) {
    setEditCapitalAllocations((current) =>
      current.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? {
              ...allocation,

              [field]: value,
            }
          : allocation,
      ),
    );
  }

  function addCapitalAllocation() {
    setEditCapitalAllocations((current) => [
      ...current,

      {
        type: "cash",
        account_id: "",
        amount: 0,
      },
    ]);
  }

  function removeCapitalAllocation(index) {
    setEditCapitalAllocations((current) =>
      current.filter(
        (_allocation, allocationIndex) => allocationIndex !== index,
      ),
    );
  }

  /*
   * =====================================================
   * TOTALS
   * =====================================================
   */

  const editSubtotal = editItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
    0,
  );

  const editVatAmount = (editSubtotal * (Number(editVatRate) || 0)) / 100;

  const editItemsTotal = Math.max(
    0,

    editSubtotal + editVatAmount + Number(editAdjustment || 0),
  );

  const editCapitalTotal = editCapitalAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0,
  );

  const finalEditAmount =
    editType === "sale" || editType === "expense"
      ? editItemsTotal
      : editType === "payment"
        ? editPaymentTotal
        : editType === "capital"
          ? editCapitalTotal
          : Number(editAmount || 0);
  const cashBankAccountOptions = accountOptions.filter((account) => {
    const subtype = String(account.account_subtype || "").toLowerCase();

    return subtype === "cash" || subtype === "bank";
  });

  const bankAccountOptions = accountOptions.filter((account) => {
    const subtype = String(account.account_subtype || "").toLowerCase();

    return subtype === "bank";
  });
  /*
   * =====================================================
   * SAVE ALL VOUCHER TYPES
   * =====================================================
   */

  async function handleSaveVoucher(event) {
    event.preventDefault();

    if (!editingVoucher) {
      return;
    }

    setEditError("");

    if (!editDate) {
      setEditError("Date is required.");

      return;
    }

    /*
     * CAPITAL has no party.
     */

    if (editType !== "capital" && !editParty?.id) {
      setEditError(
        editType === "sale" || editType === "receipt"
          ? "Please select a customer."
          : "Please select a supplier.",
      );

      return;
    }

    /*
     * EXPENSE supplier reference required.
     */

    if (editType === "expense" && !editBillReference.trim()) {
      setEditError("Supplier bill/reference number is required.");

      return;
    }

    /*
     * SALE / EXPENSE ITEMS
     */

    let validItems = [];

    if (editType === "sale" || editType === "expense") {
      validItems = editItems.map((item) => ({
        customer_service_id:
          item.customer_service_id || item.customerServiceId || null,

        supplier_item_id: item.supplier_item_id || item.supplierItemId || null,

        description: String(item.description || "").trim(),

        unit: String(item.unit || "").trim(),

        quantity: Number(item.quantity || 0),

        rate: Number(item.rate || 0),

        amount: Number(item.quantity || 0) * Number(item.rate || 0),
      }));

      if (validItems.length === 0) {
        setEditError("At least one item is required.");

        return;
      }

      for (const item of validItems) {
        if (!item.description) {
          setEditError("Every item requires a description.");

          return;
        }

        if (item.quantity <= 0) {
          setEditError("Every item quantity must be greater than zero.");

          return;
        }

        if (item.rate < 0) {
          setEditError("Item rate cannot be negative.");

          return;
        }
      }

      const vatRate = Number(editVatRate || 0);

      if (vatRate < 0 || vatRate > 100) {
        setEditError("VAT percentage must be between 0 and 100.");

        return;
      }
    }

    /*
     * RECEIPT / PAYMENT AMOUNT
     */

    if (editType === "receipt" && Number(editAmount) <= 0) {
      setEditError("Amount must be greater than zero.");

      return;
    }
    /*
     * PAYMENT / RECEIPT ACCOUNT
     */

    if ((editType === "receipt" || editType === "payment") && !editAccountId) {
      setEditError("Please select Cash or Bank account.");

      return;
    }

    /*
     * CAPITAL
     */

    if (editType === "capital") {
      if (editCapitalAllocations.length === 0) {
        setEditError("At least one capital allocation is required.");

        return;
      }

      for (const allocation of editCapitalAllocations) {
        if (Number(allocation.amount || 0) <= 0) {
          setEditError("Every capital allocation must be greater than zero.");

          return;
        }

        if (allocation.type === "bank" && !allocation.account_id) {
          setEditError(
            "Please select a bank account for every bank allocation.",
          );

          return;
        }
      }
    }

    if (finalEditAmount <= 0) {
      setEditError("Voucher amount must be greater than zero.");

      return;
    }

    try {
      setSavingVoucher(true);

      const formData = new FormData();

      formData.append("voucher_id", String(editingVoucher.voucher_id));

      formData.append("type", editType);

      formData.append("date", editDate);

      formData.append("party_id", editParty?.id ? String(editParty.id) : "");

      formData.append("bill_reference", editBillReference.trim());

      formData.append("amount", String(Number(finalEditAmount.toFixed(2))));

      formData.append("vat_rate", String(Number(editVatRate || 0)));

      /*
       * This follows your existing accounting model:
       *
       * Sale    -> vat_input
       * Expense -> vat_output
       */

      formData.append(
        "vat_input",
        String(editType === "sale" ? Number(editVatAmount.toFixed(2)) : 0),
      );

      formData.append(
        "vat_output",
        String(editType === "expense" ? Number(editVatAmount.toFixed(2)) : 0),
      );

      formData.append("account_id", editAccountId ? String(editAccountId) : "");

      formData.append(
        "source_voucher_id",
        editSourceVoucherId ? String(editSourceVoucherId) : "",
      );

      formData.append("narration", editNarration.trim());

      formData.append("items", JSON.stringify(validItems));

      formData.append(
        "payment_allocations",
        JSON.stringify(
          editPaymentAllocations.map((allocation) => ({
            expense_id: Number(allocation.expense_id || 0),

            amount: Number(allocation.amount || 0),
          })),
        ),
      );

      formData.append(
        "capital_allocations",
        JSON.stringify(
          editCapitalAllocations.map((allocation) => ({
            type: allocation.type,

            account_id:
              allocation.type === "bank"
                ? Number(allocation.account_id || 0)
                : null,

            amount: Number(allocation.amount || 0),
          })),
        ),
      );

      if (editAttachment) {
        formData.append("bill_attachment", editAttachment);
      }

      /*
       * We will create this backend endpoint next.
       */

      await apiRequest("accounting/update_voucher.php", {
        method: "POST",

        body: formData,
      });

      /*
       * Reload voucher after update.
       */

      const refreshed = await getVoucher(editingVoucher.voucher_id);

      const updatedVoucher = refreshed?.data || refreshed?.voucher || null;

      setEditingVoucher(null);

      setEditAttachment(null);

      if (updatedVoucher) {
        setViewingVoucher(updatedVoucher);
      }

      await loadLedger();
    } catch (error) {
      console.error("Voucher update failed:", error);

      setEditError(error.message || "Unable to update voucher.");
    } finally {
      setSavingVoucher(false);
    }
  }

  /*
   * =====================================================
   * PARTY TYPE
   * =====================================================
   */

  const editPartyType =
    editType === "sale" || editType === "receipt" ? "customer" : "supplier";

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

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

        {/* ACTIVE DASHBOARD FILTER */}

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

        {/* FILTERS */}

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

        {error && <div className={styles.error}>{error}</div>}

        {/* SUMMARY */}

        <LedgerSummary
          sales={sales}
          expenses={expenses}
          payments={payments}
          payable={payable}
          receipts={receipts}
          receivable={receivable}
        />

        {/* TABLE */}

        <section className={styles.tableCard}>
          <LedgerTable
            entries={entries}
            loading={loading}
            onViewVoucher={handleViewVoucher}
          />
        </section>
      </div>

      {/* LOADING */}

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

      {/* VOUCHER ERROR */}

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

      {/* =================================================
          VIEW VOUCHER
      ================================================= */}

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
              {/* EDIT ALL VOUCHERS */}

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
              {viewingVoucher.type === "capital" ? (
                <PrintableCapitalVoucher
                  voucherNumber={viewingVoucher.voucherNumber}
                  date={viewingVoucher.date}
                  amount={viewingVoucher.amount}
                  allocations={viewingVoucher.allocations || []}
                  narration={viewingVoucher.narration}
                  company={viewingVoucher.company}
                />
              ) : (
                <PrintableVoucher
                  type={viewingVoucher.type}
                  date={viewingVoucher.date}
                  party={viewingVoucher.party}
                  company={viewingVoucher.company}
                  referenceNumber={viewingVoucher.referenceNumber}
                  billReference={viewingVoucher.billReference || ""}
                  voucherNumber={viewingVoucher.voucherNumber}
                  items={viewingVoucher.items || []}
                  amount={viewingVoucher.amount}
                  discountAmount={viewingVoucher.discountAmount}
                  vatRate={viewingVoucher.vatRate}
                  vatAmount={viewingVoucher.vatAmount}
                  totalAmount={viewingVoucher.totalAmount}
                  paymentAmount={viewingVoucher.paymentAmount}
                  receiptAmount={viewingVoucher.receiptAmount}
                  paymentAccount={viewingVoucher.paymentAccount}
                  selectedPaymentBill={viewingVoucher.selectedPaymentBill}
                  paymentAllocations={viewingVoucher.paymentAllocations || []}
                  selectedReceiptBill={viewingVoucher.selectedReceiptBill}
                  narration={viewingVoucher.narration}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          EDIT VOUCHER
      ================================================= */}

      {editingVoucher && (
        <div
          style={{
            position: "fixed",

            inset: 0,

            zIndex: 10002,

            background: "rgba(15, 23, 42, 0.75)",

            overflowY: "auto",

            padding: "28px 18px",
          }}
        >
          <form
            onSubmit={handleSaveVoucher}
            style={{
              width: "100%",

              maxWidth: 980,

              margin: "0 auto",

              background: "#ffffff",

              borderRadius: 14,

              overflow: "hidden",

              boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
            }}
          >
            {/* EDIT HEADER */}

            <div
              style={{
                padding: "20px 24px",

                borderBottom: "1px solid #e5e7eb",

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                gap: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,

                    color: "#111827",

                    fontSize: 20,
                  }}
                >
                  Edit {editType.charAt(0).toUpperCase() + editType.slice(1)}
                </h2>

                <p
                  style={{
                    margin: "5px 0 2px",

                    color: "#374151",

                    fontSize: 13,

                    fontWeight: 600,
                  }}
                >
                  {editVoucherNumber}
                </p>

                <small
                  style={{
                    color: "#9ca3af",
                  }}
                >
                  Voucher number cannot be changed.
                </small>
              </div>

              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                style={{
                  width: 36,

                  height: 36,

                  border: "1px solid #e5e7eb",

                  borderRadius: 8,

                  background: "#ffffff",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 24,
              }}
            >
              {/* BASIC */}

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    editType === "capital"
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",

                  gap: 18,

                  marginBottom: 22,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",

                      marginBottom: 6,

                      fontSize: 12,

                      fontWeight: 600,
                    }}
                  >
                    Date
                  </label>

                  <input
                    type="date"
                    value={editDate}
                    onChange={(event) => setEditDate(event.target.value)}
                    style={{
                      width: "100%",

                      height: 42,

                      boxSizing: "border-box",

                      border: "1px solid #d1d5db",

                      borderRadius: 8,

                      padding: "0 12px",
                    }}
                  />
                </div>

                {editType !== "capital" && (
                  <div>
                    <label
                      style={{
                        display: "block",

                        marginBottom: 6,

                        fontSize: 12,

                        fontWeight: 600,
                      }}
                    >
                      {editPartyType === "customer" ? "Customer" : "Supplier"}
                    </label>

                    <PartySelector
                      value={editParty}
                      onChange={setEditParty}
                      partyType={editPartyType}
                    />
                  </div>
                )}
              </div>

              {/* EXPENSE REFERENCE */}

              {editType === "expense" && (
                <div
                  style={{
                    marginBottom: 22,
                  }}
                >
                  <label
                    style={{
                      display: "block",

                      marginBottom: 6,

                      fontSize: 12,

                      fontWeight: 600,
                    }}
                  >
                    Supplier Bill / Reference No.
                  </label>

                  <input
                    type="text"
                    value={editBillReference}
                    onChange={(event) =>
                      setEditBillReference(event.target.value)
                    }
                    style={{
                      width: "100%",

                      height: 42,

                      boxSizing: "border-box",

                      border: "1px solid #d1d5db",

                      borderRadius: 8,

                      padding: "0 12px",
                    }}
                  />
                </div>
              )}

              {/* =================================================
                  SALE / EXPENSE ITEMS
              ================================================= */}

              {(editType === "sale" || editType === "expense") && (
                <>
                  <div
                    style={{
                      display: "flex",

                      justifyContent: "space-between",

                      alignItems: "center",

                      marginBottom: 12,
                    }}
                  >
                    <strong>
                      {editType === "sale" ? "Sale Items" : "Expense Items"}
                    </strong>

                    <button
                      type="button"
                      onClick={addEditItem}
                      style={{
                        height: 36,

                        padding: "0 12px",

                        border: "1px solid #d1d5db",

                        borderRadius: 8,

                        background: "#ffffff",

                        display: "flex",

                        alignItems: "center",

                        gap: 6,

                        cursor: "pointer",
                      }}
                    >
                      <Plus size={15} />
                      Add Item
                    </button>
                  </div>

                  <div
                    style={{
                      overflowX: "auto",

                      border: "1px solid #e5e7eb",

                      borderRadius: 10,

                      marginBottom: 22,
                    }}
                  >
                    <table
                      style={{
                        width: "100%",

                        minWidth: 760,

                        borderCollapse: "collapse",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f9fafb",
                          }}
                        >
                          <th
                            style={{
                              padding: 10,

                              textAlign: "left",
                            }}
                          >
                            Description
                          </th>

                          <th
                            style={{
                              padding: 10,

                              textAlign: "left",
                            }}
                          >
                            Unit
                          </th>

                          <th>Qty</th>

                          <th>Rate</th>

                          <th>Amount</th>

                          <th />
                        </tr>
                      </thead>

                      <tbody>
                        {editItems.map((item, index) => {
                          const rowAmount =
                            Number(item.quantity || 0) * Number(item.rate || 0);

                          return (
                            <tr
                              key={item.id || index}
                              style={{
                                borderTop: "1px solid #f1f5f9",
                              }}
                            >
                              <td
                                style={{
                                  padding: 8,
                                }}
                              >
                                <input
                                  type="text"
                                  value={item.description || ""}
                                  onChange={(event) =>
                                    updateEditItem(
                                      index,
                                      "description",
                                      event.target.value,
                                    )
                                  }
                                  style={{
                                    width: "100%",

                                    height: 38,

                                    boxSizing: "border-box",

                                    border: "1px solid #d1d5db",

                                    borderRadius: 6,

                                    padding: "0 8px",
                                  }}
                                />
                              </td>

                              <td
                                style={{
                                  padding: 8,
                                }}
                              >
                                <input
                                  type="text"
                                  value={item.unit || ""}
                                  onChange={(event) =>
                                    updateEditItem(
                                      index,
                                      "unit",
                                      event.target.value,
                                    )
                                  }
                                  style={{
                                    width: "100%",

                                    height: 38,

                                    boxSizing: "border-box",

                                    border: "1px solid #d1d5db",

                                    borderRadius: 6,

                                    padding: "0 8px",
                                  }}
                                />
                              </td>

                              <td
                                style={{
                                  padding: 8,
                                }}
                              >
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateEditItem(
                                      index,
                                      "quantity",
                                      event.target.value,
                                    )
                                  }
                                  style={{
                                    width: 85,

                                    height: 38,

                                    border: "1px solid #d1d5db",

                                    borderRadius: 6,

                                    padding: "0 8px",
                                  }}
                                />
                              </td>

                              <td
                                style={{
                                  padding: 8,
                                }}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.rate}
                                  onChange={(event) =>
                                    updateEditItem(
                                      index,
                                      "rate",
                                      event.target.value,
                                    )
                                  }
                                  style={{
                                    width: 110,

                                    height: 38,

                                    border: "1px solid #d1d5db",

                                    borderRadius: 6,

                                    padding: "0 8px",
                                  }}
                                />
                              </td>

                              <td
                                style={{
                                  padding: 8,

                                  textAlign: "right",

                                  whiteSpace: "nowrap",

                                  fontWeight: 600,
                                }}
                              >
                                AED {formatMoney(rowAmount)}
                              </td>

                              <td
                                style={{
                                  padding: 8,
                                }}
                              >
                                <button
                                  type="button"
                                  disabled={editItems.length <= 1}
                                  onClick={() => removeEditItem(index)}
                                  style={{
                                    width: 34,

                                    height: 34,

                                    border: "1px solid #fecaca",

                                    borderRadius: 7,

                                    background: "#ffffff",

                                    color: "#b91c1c",

                                    cursor:
                                      editItems.length <= 1
                                        ? "not-allowed"
                                        : "pointer",

                                    opacity: editItems.length <= 1 ? 0.4 : 1,
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* VAT / ADJUSTMENT */}

                  <div
                    style={{
                      display: "grid",

                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

                      gap: 16,

                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",

                          marginBottom: 6,

                          fontSize: 12,

                          fontWeight: 600,
                        }}
                      >
                        VAT %
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={editVatRate}
                        onChange={(event) => setEditVatRate(event.target.value)}
                        style={{
                          width: "100%",

                          height: 42,

                          boxSizing: "border-box",

                          border: "1px solid #d1d5db",

                          borderRadius: 8,

                          padding: "0 12px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",

                          marginBottom: 6,

                          fontSize: 12,

                          fontWeight: 600,
                        }}
                      >
                        Adjustment
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        value={editAdjustment}
                        onChange={(event) =>
                          setEditAdjustment(event.target.value)
                        }
                        style={{
                          width: "100%",

                          height: 42,

                          boxSizing: "border-box",

                          border: "1px solid #d1d5db",

                          borderRadius: 8,

                          padding: "0 12px",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      maxWidth: 420,

                      marginLeft: "auto",

                      padding: 16,

                      borderRadius: 10,

                      background: "#f8fafc",

                      marginBottom: 22,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",

                        justifyContent: "space-between",

                        marginBottom: 8,
                      }}
                    >
                      <span>Subtotal</span>

                      <strong>AED {formatMoney(editSubtotal)}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",

                        justifyContent: "space-between",

                        marginBottom: 8,
                      }}
                    >
                      <span>VAT</span>

                      <strong>AED {formatMoney(editVatAmount)}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",

                        justifyContent: "space-between",

                        marginBottom: 8,
                      }}
                    >
                      <span>Adjustment</span>

                      <strong>AED {formatMoney(editAdjustment)}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",

                        justifyContent: "space-between",

                        paddingTop: 10,

                        borderTop: "1px solid #d1d5db",

                        fontSize: 16,
                      }}
                    >
                      <strong>Total</strong>

                      <strong>AED {formatMoney(editItemsTotal)}</strong>
                    </div>
                  </div>
                </>
              )}

              {/* =================================================
                  RECEIPT / PAYMENT
              ================================================= */}

              {(editType === "receipt" || editType === "payment") && (
                <>
                  <div
                    style={{
                      display: "grid",

                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

                      gap: 18,

                      marginBottom: 22,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",

                          marginBottom: 6,

                          fontSize: 12,

                          fontWeight: 600,
                        }}
                      >
                        Amount
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editAmount}
                        onChange={(event) => setEditAmount(event.target.value)}
                        style={{
                          width: "100%",

                          height: 42,

                          boxSizing: "border-box",

                          border: "1px solid #d1d5db",

                          borderRadius: 8,

                          padding: "0 12px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",

                          marginBottom: 6,

                          fontSize: 12,

                          fontWeight: 600,
                        }}
                      >
                        Cash / Bank Account
                      </label>

                      <select
                        value={editAccountId}
                        onChange={(event) =>
                          setEditAccountId(event.target.value)
                        }
                        style={{
                          width: "100%",

                          height: 42,

                          border: "1px solid #d1d5db",

                          borderRadius: 8,

                          padding: "0 10px",

                          boxSizing: "border-box",

                          background: "#ffffff",
                        }}
                      >
                        <option value="">Select account</option>

                        {cashBankAccountOptions.map((account) => (
                          <option key={account.value} value={account.value}>
                            {account.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* RECEIPT LINK */}

                  {editType === "receipt" && (
                    <div
                      style={{
                        marginBottom: 22,
                      }}
                    >
                      <label
                        style={{
                          display: "block",

                          marginBottom: 6,

                          fontSize: 12,

                          fontWeight: 600,
                        }}
                      >
                        Linked Sales Voucher ID
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={editSourceVoucherId}
                        onChange={(event) =>
                          setEditSourceVoucherId(event.target.value)
                        }
                        style={{
                          width: "100%",

                          height: 42,

                          border: "1px solid #d1d5db",

                          borderRadius: 8,

                          padding: "0 12px",

                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}

                  {/* PAYMENT BILL ALLOCATIONS */}

                  {editType === "payment" &&
                    editPaymentAllocations.length > 0 && (
                      <div
                        style={{
                          marginBottom: 22,
                        }}
                      >
                        <strong
                          style={{
                            display: "block",

                            marginBottom: 10,
                          }}
                        >
                          Payment Bill Allocations
                        </strong>

                        {editPaymentAllocations.map((allocation, index) => (
                          <div
                            key={
                              allocation.id ||
                              `${allocation.expense_id}-${index}`
                            }
                            style={{
                              display: "grid",

                              gridTemplateColumns: "1fr 180px",

                              alignItems: "center",

                              gap: 12,

                              padding: "10px 0",

                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <div>
                              <strong
                                style={{
                                  display: "block",

                                  fontSize: 12,
                                }}
                              >
                                {allocation.bill_reference ||
                                  allocation.reference_number ||
                                  `Expense #${allocation.expense_id}`}
                              </strong>

                              <small
                                style={{
                                  color: "#6b7280",
                                }}
                              >
                                Expense ID: {allocation.expense_id}
                              </small>
                            </div>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={allocation.amount}
                              onChange={(event) =>
                                updatePaymentAllocation(
                                  index,
                                  event.target.value,
                                )
                              }
                              style={{
                                width: "100%",

                                height: 38,

                                border: "1px solid #d1d5db",

                                borderRadius: 7,

                                padding: "0 10px",

                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                </>
              )}

              {/* =================================================
                  CAPITAL
              ================================================= */}

              {editType === "capital" && (
                <div
                  style={{
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      display: "flex",

                      justifyContent: "space-between",

                      alignItems: "center",

                      marginBottom: 12,
                    }}
                  >
                    <strong>Capital Allocations</strong>

                    <button
                      type="button"
                      onClick={addCapitalAllocation}
                      style={{
                        height: 36,

                        padding: "0 12px",

                        border: "1px solid #d1d5db",

                        borderRadius: 8,

                        background: "#ffffff",

                        display: "flex",

                        alignItems: "center",

                        gap: 6,

                        cursor: "pointer",
                      }}
                    >
                      <Plus size={15} />
                      Add Allocation
                    </button>
                  </div>

                  {editCapitalAllocations.map((allocation, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",

                        gridTemplateColumns: "140px 1fr 180px 45px",

                        gap: 10,

                        alignItems: "center",

                        marginBottom: 10,
                      }}
                    >
                      <select
                        value={allocation.type}
                        onChange={(event) =>
                          updateCapitalAllocation(
                            index,
                            "type",
                            event.target.value,
                          )
                        }
                        style={{
                          height: 40,

                          border: "1px solid #d1d5db",

                          borderRadius: 7,

                          padding: "0 10px",

                          background: "#ffffff",
                        }}
                      >
                        <option value="cash">Cash</option>

                        <option value="bank">Bank</option>
                      </select>

                      {allocation.type === "bank" ? (
                        <select
                          value={allocation.account_id || ""}
                          onChange={(event) =>
                            updateCapitalAllocation(
                              index,
                              "account_id",
                              event.target.value,
                            )
                          }
                          style={{
                            height: 40,

                            border: "1px solid #d1d5db",

                            borderRadius: 7,

                            padding: "0 10px",

                            background: "#ffffff",
                          }}
                        >
                          <option value="">Select bank account</option>

                          {bankAccountOptions.map((account) => (
                            <option key={account.value} value={account.value}>
                              {account.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          style={{
                            color: "#6b7280",

                            fontSize: 12,
                          }}
                        >
                          Cash allocation
                        </div>
                      )}

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={allocation.amount}
                        onChange={(event) =>
                          updateCapitalAllocation(
                            index,
                            "amount",
                            event.target.value,
                          )
                        }
                        style={{
                          height: 40,

                          border: "1px solid #d1d5db",

                          borderRadius: 7,

                          padding: "0 10px",

                          boxSizing: "border-box",
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => removeCapitalAllocation(index)}
                        style={{
                          width: 38,

                          height: 38,

                          border: "1px solid #fecaca",

                          borderRadius: 7,

                          background: "#ffffff",

                          color: "#b91c1c",

                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}

                  <div
                    style={{
                      display: "flex",

                      justifyContent: "flex-end",

                      marginTop: 18,

                      fontSize: 17,
                    }}
                  >
                    <strong>
                      Total Capital: AED {formatMoney(editCapitalTotal)}
                    </strong>
                  </div>
                </div>
              )}

              {/* NARRATION */}

              <div
                style={{
                  marginBottom: 20,
                }}
              >
                <label
                  style={{
                    display: "block",

                    marginBottom: 6,

                    fontSize: 12,

                    fontWeight: 600,
                  }}
                >
                  Remarks / Narration
                </label>

                <textarea
                  rows={4}
                  value={editNarration}
                  onChange={(event) => setEditNarration(event.target.value)}
                  style={{
                    width: "100%",

                    boxSizing: "border-box",

                    border: "1px solid #d1d5db",

                    borderRadius: 8,

                    padding: 12,

                    resize: "vertical",

                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* EXPENSE ATTACHMENT */}

              {editType === "expense" && (
                <div
                  style={{
                    marginBottom: 20,
                  }}
                >
                  <label
                    style={{
                      display: "block",

                      marginBottom: 6,

                      fontSize: 12,

                      fontWeight: 600,
                    }}
                  >
                    Add New Supplier Bill Attachment
                  </label>

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(event) =>
                      setEditAttachment(event.target.files?.[0] || null)
                    }
                  />
                </div>
              )}

              {/* ERROR */}

              {editError && (
                <div
                  style={{
                    marginBottom: 18,

                    padding: "11px 13px",

                    background: "#fef2f2",

                    border: "1px solid #fecaca",

                    borderRadius: 8,

                    color: "#b91c1c",

                    fontSize: 12,
                  }}
                >
                  {editError}
                </div>
              )}

              {/* ACTIONS */}

              <div
                style={{
                  display: "flex",

                  justifyContent: "flex-end",

                  gap: 10,

                  paddingTop: 18,

                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  disabled={savingVoucher}
                  style={{
                    height: 40,

                    padding: "0 18px",

                    border: "1px solid #d1d5db",

                    borderRadius: 8,

                    background: "#ffffff",

                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingVoucher}
                  style={{
                    height: 40,

                    padding: "0 20px",

                    border: "none",

                    borderRadius: 8,

                    background: "#2563eb",

                    color: "#ffffff",

                    fontWeight: 600,

                    cursor: savingVoucher ? "not-allowed" : "pointer",

                    opacity: savingVoucher ? 0.65 : 1,
                  }}
                >
                  {savingVoucher ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
