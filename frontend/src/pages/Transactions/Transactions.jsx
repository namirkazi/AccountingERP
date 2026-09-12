import { useEffect, useState } from "react";
import { getCompanyProfile } from "../../services/companyService";
import AppLayout from "../../components/layout/AppLayout";
import CapitalForm from "./components/Capital/CapitalForm";
import {
  searchPaymentExpenses,
  createPayment,
} from "../../services/paymentService";
import {
  createTransaction,
  searchReceiptInvoices,
  getAvailableCapital,
} from "../../services/transactionService";
import TransactionHeader, {
  TRANSACTION_TYPES,
} from "./components/TransactionHeader";
import SavedVoucher from "./components/Shared/SavedVoucher";

import SalesForm from "./components/Sales/SalesForm";

import ReceiptForm from "./components/Receipt/ReceiptForm";

import PaymentForm from "./components/Payment/PaymentForm";

import ExpenseForm from "./components/Expense/ExpenseForm";
import useExpenseTransaction from "./hooks/useExpenseTransaction";
import PrintableVoucher from "../../components/accounting/PrintableVoucher";
import PrintableCapitalVoucher from "../../components/accounting/PrintableCapitalVoucher";
import styles from "./Transactions.module.css";
import SavedCapitalVoucher from "../../components/accounting/SavedCapitalVoucher";
import useSalesTransaction from "./hooks/useSalesTransaction";

import {
  getNextSalesBillNumber,
  getNextReceiptNumber,
} from "../../services/transactionService";

export default function Transactions() {
  const [type, setType] = useState("sale");

  const expense = useExpenseTransaction();
  const sales = useSalesTransaction();

  const {
    services: salesServices,
    addService: addSalesService,
    updateService: updateSalesService,
    removeService: removeSalesService,

    discount: salesDiscount,
    setDiscount: setSalesDiscount,

    discountMode: salesDiscountMode,
    setDiscountMode: setSalesDiscountMode,

    vatRate: salesVatRate,
    setVatRate: setSalesVatRate,

    subtotal: salesSubtotal,

    discountAmount: salesDiscountAmount,

    taxableAmount: salesTaxableAmount,

    vatAmount: salesVatAmount,

    totalAmount: salesTotalAmount,

    afterTaxTotalBeforeDiscount: salesAfterTaxTotalBeforeDiscount,

    validServices: validSalesServices,

    resetSales,
  } = sales;
  const {
    items: expenseItems,
    addItem: addExpenseItem,
    updateItem: updateExpenseItem,
    removeItem: removeExpenseItem,
    referenceNumber,
    setReferenceNumber,
    discount,
    setDiscount,
    discountMode,
    setDiscountMode,
    vatRate,
    setVatRate,
    subtotal: expenseSubtotal,
    discountAmount,
    taxableAmount,
    vatAmount,
    totalAmount,
    afterTaxTotalBeforeDiscount,
    validItems: validExpenseItems,
    resetExpense,
  } = expense;
  const [paymentBills, setPaymentBills] = useState([]);
  const [selectedPaymentBill, setSelectedPaymentBill] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [party, setParty] = useState(null);

  const [amount, setAmount] = useState("");

  const [narration, setNarration] = useState("");

  const [accountId, setAccountId] = useState("");
  const [paymentAccount, setPaymentAccount] = useState(null);

  const [receiptBills, setReceiptBills] = useState([]);
  const [selectedReceiptBill, setSelectedReceiptBill] = useState(null);

  const [receiptAmount, setReceiptAmount] = useState("");

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showPreview, setShowPreview] = useState(true);
  const [showSavedVoucher, setShowSavedVoucher] = useState(false);

  const [capitalAmount, setCapitalAmount] = useState("");

  const [capitalCash, setCapitalCash] = useState("");

  const [capitalBank, setCapitalBank] = useState("");

  const [availableCapital, setAvailableCapital] = useState(0);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [company, setCompany] = useState(null);
  const [expenseAttachment, setExpenseAttachment] = useState(null);

  /* Receipt Number */
  useEffect(() => {
    if (type !== "receipt") {
      return;
    }

    let cancelled = false;

    async function loadNextReceiptNumber() {
      try {
        setError("");

        const response = await getNextReceiptNumber(date);

        console.log("Receipt number response:", response);

        if (cancelled) {
          return;
        }

        const receiptNumber =
          response?.data?.receipt_number || response?.receipt_number || "";

        if (!receiptNumber) {
          throw new Error("The server did not return a Receipt number.");
        }

        setVoucherNumber(receiptNumber);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to generate Receipt number:", error);

        setVoucherNumber("");

        setError(error.message || "Unable to generate Receipt number.");
      }
    }

    loadNextReceiptNumber();

    return () => {
      cancelled = true;
    };
  }, [type, date]);
  /*
   * =====================================================
   * COMPANY PROFILE
   * =====================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyProfile() {
      try {
        const response = await getCompanyProfile();

        if (cancelled) {
          return;
        }

        const profile =
          response?.company ||
          response?.data?.company ||
          response?.data ||
          null;

        setCompany(profile);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to load company profile:", error);

        setCompany(null);
      }
    }

    loadCompanyProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Sale BIll NO */
  useEffect(() => {
    if (type !== "sale") {
      return;
    }

    let cancelled = false;

    async function loadNextBillNumber() {
      try {
        setError("");

        const response = await getNextSalesBillNumber(date);

        console.log("Sales bill number response:", response);

        if (cancelled) {
          return;
        }

        const billNumber =
          response?.data?.bill_number || response?.bill_number || "";

        if (!billNumber) {
          throw new Error("The server did not return a Sales bill number.");
        }

        setVoucherNumber(billNumber);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to generate Sales bill number:", error);

        setVoucherNumber("");

        setError(error.message || "Unable to generate Sales bill number.");
      }
    }

    loadNextBillNumber();

    return () => {
      cancelled = true;
    };
  }, [type, date]);

  /*
   * =====================================================
   * AVAILABLE CAPITAL
   * =====================================================
   */

  useEffect(() => {
    if (type !== "capital") {
      setAvailableCapital(0);
      return;
    }

    let cancelled = false;

    async function loadAvailableCapital() {
      try {
        setError("");

        const response = await getAvailableCapital();

        if (cancelled) {
          return;
        }

        const available =
          response?.data?.available_capital ?? response?.available_capital ?? 0;

        setAvailableCapital(Number(available) || 0);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to load available capital:", error);

        setAvailableCapital(0);

        setError(error.message || "Unable to load available capital.");
      }
    }

    loadAvailableCapital();

    return () => {
      cancelled = true;
    };
  }, [type]);
  /*
   * =====================================================
   * KEYBOARD SHORTCUTS
   * =====================================================
   */
  useEffect(() => {
    function handleShortcut(event) {
      if (!event.altKey) {
        return;
      }

      const tag = event.target.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }

      const key = event.key.toLowerCase();

      const shortcut = TRANSACTION_TYPES.find((item) =>
        item.shortcut.toLowerCase().endsWith(key),
      );

      if (!shortcut) {
        return;
      }

      event.preventDefault();
      changeType(shortcut.key);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (type !== "payment" || !party?.party_name) {
      setPaymentBills([]);
      return;
    }

    let cancelled = false;

    async function loadPaymentExpenses() {
      try {
        setError("");

        const response = await searchPaymentExpenses(party.party_name);

        if (cancelled) {
          return;
        }

        setPaymentBills(response?.data?.expenses || []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to load payment expenses:", error);

        setPaymentBills([]);
        setError(error.message || "Unable to load outstanding bills.");
      }
    }

    loadPaymentExpenses();

    return () => {
      cancelled = true;
    };
  }, [type, party?.id, party?.party_name]);
  useEffect(() => {
    if (type !== "receipt" || !party?.party_name) {
      setReceiptBills([]);
      setSelectedReceiptBill(null);
      setReceiptAmount("");
      return;
    }

    let cancelled = false;

    async function loadReceiptInvoices() {
      try {
        setError("");

        const response = await searchReceiptInvoices(party.party_name);

        if (cancelled) {
          return;
        }

        setReceiptBills(response?.data?.invoices || []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to load receipt invoices:", error);

        setReceiptBills([]);

        setError(error.message || "Unable to load outstanding sales bills.");
      }
    }

    loadReceiptInvoices();

    return () => {
      cancelled = true;
    };
  }, [type, party?.id, party?.party_name]);
  /*
   * =====================================================
   * CHANGE TYPE / RESET
   * =====================================================
   */

  function changeType(newType) {
    setType(newType);
    resetExpense();
    resetSales();
    setExpenseAttachment(null);
    setVoucherNumber("");
    setParty(null);
    setAmount("");
    setNarration("");
    setAccountId("");
    setPaymentAccount(null);
    setPaymentBills([]);
    setSelectedPaymentBill(null);
    setPaymentAmount("");
    setReceiptBills([]);
    setSelectedReceiptBill(null);
    setReceiptAmount("");
    setMessage("");
    setError("");
    setDiscount("");
    setCapitalAmount("");
    setCapitalCash("");
    setCapitalBank("");
  }

  function resetTransactionForm() {
    setParty(null);
    setAmount("");
    setPaymentAmount("");
    resetExpense();
    resetSales();
    setExpenseAttachment(null);
    setVoucherNumber("");
    setNarration("");
    setAccountId("");
    setPaymentAccount(null);
    setPaymentBills([]);
    setReceiptBills([]);
    setSelectedReceiptBill(null);
    setReceiptAmount("");
    setSelectedPaymentBill(null);
    setMessage("");
    setError("");

    if (type === "capital") {
      setCapitalAmount("");
      setCapitalCash("");
      setCapitalBank("");
    }
  }

  function closeSavedVoucher() {
    setShowSavedVoucher(false);

    resetTransactionForm();
  }

  function getNextLocalExpenseVoucherNumber() {
    const key = "mohinii_expense_voucher_sequence";
    const current = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(current));
    return `EXP-${String(current).padStart(6, "0")}`;
  }

  function getSavedVoucherNumber(response) {
    const reference =
      response?.data?.reference_number ||
      response?.reference_number ||
      response?.data?.voucher?.reference_number ||
      "";

    if (reference) {
      return reference;
    }

    const id =
      response?.data?.voucher_id ||
      response?.data?.voucher?.id ||
      response?.voucher_id ||
      response?.voucher?.id ||
      response?.data?.id;

    if (id) {
      return `EXPENSE/${new Date().getFullYear()}/${String(id).padStart(5, "0")}`;
    }

    return getNextLocalExpenseVoucherNumber();
  }

  /*
   * Print Function
   */
  function printVoucher() {
    const supplierName =
      party?.party_name || selectedPaymentBill?.party_name || "Supplier";

    const reference = voucherNumber || referenceNumber || "Voucher";
    const cleanSupplier = supplierName.replace(/[<>:"/\\|?*]/g, "").trim();
    const cleanReference = reference.replace(/[<>:"/\\|?*]/g, "").trim();

    const originalTitle = document.title;
    document.title = `${cleanReference} - ${cleanSupplier}`;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  /*
   * =====================================================
   * SUBMIT
   * =====================================================
   */

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (type !== "capital" && !party) {
      setError(
        type === "expense"
          ? "Please select a supplier."
          : "Please select a party.",
      );

      return;
    }

    if (type === "expense" && !referenceNumber.trim()) {
      setError("Please enter the supplier bill/reference number.");
      return;
    }

    if (type === "expense" && expenseItems.length === 0) {
      setError("Please add at least one expense item.");
      return;
    }

    if (
      type === "expense" &&
      validExpenseItems.length !== expenseItems.length
    ) {
      setError(
        "Please complete every expense item with a description, quantity, and rate.",
      );
      return;
    }
    if (type === "sale") {
      if (!party) {
        setError("Please select a customer.");
        return;
      }

      if (salesServices.length === 0) {
        setError("Please add at least one service.");
        return;
      }

      if (validSalesServices.length !== salesServices.length) {
        setError("Please complete every service with a name and amount.");
        return;
      }

      if (Number(salesVatRate) < 0 || Number(salesVatRate) > 100) {
        setError("Tax percentage must be between 0 and 100.");
        return;
      }
    }
    const currentAmount =
      type === "payment"
        ? Number(paymentAmount)
        : type === "expense"
          ? Number(totalAmount)
          : type === "sale"
            ? Number(salesTotalAmount)
            : type === "receipt"
              ? Number(receiptAmount)
              : type === "capital"
                ? Number(capitalAmount)
                : Number(amount);

    if (type === "capital") {
      if (!Number.isFinite(currentAmount) || Math.abs(currentAmount) < 0.001) {
        setError("Please enter a valid Capital amount.");
        return;
      }
    } else if (!currentAmount || currentAmount <= 0) {
      setError(
        type === "payment"
          ? "Please enter a valid payment amount."
          : "Please enter a valid amount.",
      );
      return;
    }
    if (type === "capital") {
      const transferAmount = Number(capitalAmount) || 0;

      const cash = Number(capitalCash) || 0;

      const bank = Number(capitalBank) || 0;

      const allocated = cash + bank;

      if (Math.abs(transferAmount) < 0.001) {
        setError("Please enter a non-zero Capital amount.");
        return;
      }

      if (Math.abs(allocated - transferAmount) > 0.001) {
        setError("Cash and Bank must equal the Capital amount.");
        return;
      }
    }
    if (type === "payment") {
      if (!selectedPaymentBill) {
        setError("Please select a bill to pay.");
        return;
      }

      if (!accountId) {
        setError("Please select Cash or Bank.");
        return;
      }

      const outstanding = Number(selectedPaymentBill.outstanding_amount) || 0;

      if (currentAmount > outstanding) {
        setError(
          `Payment cannot exceed the outstanding amount of AED ${outstanding.toFixed(2)}.`,
        );
        return;
      }
    }
    if (type === "receipt") {
      if (!selectedReceiptBill) {
        setError("Please select a Sales bill to receive payment against.");
        return;
      }

      if (!accountId) {
        setError("Please select Cash or Bank.");
        return;
      }

      const outstanding = Number(selectedReceiptBill.outstanding_amount) || 0;

      if (currentAmount > outstanding) {
        setError(
          `Receipt cannot exceed the outstanding amount of AED ${outstanding.toFixed(2)}.`,
        );
        return;
      }
    }
    if (type === "expense" && (Number(vatRate) < 0 || Number(vatRate) > 100)) {
      setError("VAT percentage must be between 0 and 100.");
      return;
    }

    if (type === "expense" && expenseAttachment) {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (!allowedTypes.includes(expenseAttachment.type)) {
        setError("Supplier bill must be a PDF, JPG, PNG, or WEBP file.");
        return;
      }

      if (expenseAttachment.size > 10 * 1024 * 1024) {
        setError("Supplier bill attachment cannot exceed 10 MB.");
        return;
      }
    }

    setSaving(true);

    try {
      let response;

      if (type === "payment") {
        response = await createPayment({
          expense_id: Number(selectedPaymentBill.id),

          amount: Number(paymentAmount),

          payment_account_id: Number(accountId),

          date,

          narration: narration.trim(),
        });
      } else if (type === "capital") {
        // Capital API will be wired here next.

        response = await createTransaction({
          type: "capital",

          date,

          amount: Number(capitalAmount) || 0,

          cash_amount: Number(capitalCash) || 0,

          bank_amount: Number(capitalBank) || 0,

          narration: narration?.trim() || "",
        });
      } else {
        if (type === "expense") {
          const formData = new FormData();

          formData.append("type", type);
          formData.append("date", date);
          formData.append("party_id", String(party?.id || ""));
          formData.append("bill_reference", referenceNumber.trim());
          formData.append("amount", String(Number(totalAmount) || 0));
          formData.append("vat_output", String(Number(vatAmount) || 0));
          formData.append("vat_rate", String(Number(vatRate) || 0));
          formData.append("narration", narration?.trim() || "");
          formData.append("items", JSON.stringify(validExpenseItems));

          if (expenseAttachment) {
            formData.append("bill_attachment", expenseAttachment);
          }

          response = await createTransaction(formData);
        } else {
          const salesItems =
            type === "sale"
              ? salesServices
                  .filter(
                    (service) =>
                      service.description?.trim() && Number(service.amount) > 0,
                  )
                  .map((service) => ({
                    customerServiceId:
                      service.customerServiceId ||
                      service.customer_service_id ||
                      null,

                    description: service.description.trim(),

                    unit: "Service",

                    quantity: 1,

                    rate: Number(service.amount) || 0,

                    amount: Number(service.amount) || 0,
                  }))
              : [];
          response = await createTransaction({
            type,
            date,
            party_id: party?.id || null,

            reference_number: null,

            bill_reference:
              type === "receipt"
                ? selectedReceiptBill?.invoice_number || null
                : null,

            source_voucher_id:
              type === "receipt" ? selectedReceiptBill?.id || null : null,

            items: type === "sale" ? JSON.stringify(salesItems) : undefined,

            amount:
              type === "sale"
                ? Number(salesTotalAmount) || 0
                : type === "receipt"
                  ? Number(receiptAmount) || 0
                  : Number(amount) || 0,

            vat_input: type === "sale" ? Number(salesVatAmount) || 0 : 0,

            vat_output: 0,

            vat_rate: 0,

            account_id:
              type === "payment" || type === "receipt"
                ? Number(accountId) || null
                : null,

            narration: narration?.trim() || "",
          });
        }
      }
      if (type === "sale") {
        const savedBillNumber =
          response?.data?.reference_number ||
          response?.reference_number ||
          response?.data?.bill_number ||
          response?.bill_number ||
          voucherNumber;

        setVoucherNumber(savedBillNumber);
      }
      if (type === "receipt") {
        const savedReceiptNumber =
          response?.data?.reference_number ||
          response?.reference_number ||
          response?.data?.receipt_number ||
          response?.receipt_number ||
          voucherNumber;

        setVoucherNumber(savedReceiptNumber);
      }
      if (type === "expense") {
        setVoucherNumber(getSavedVoucherNumber(response));
      }

      if (type === "payment") {
        const savedPaymentNumber =
          response?.data?.reference_number || response?.reference_number || "";

        if (savedPaymentNumber) {
          setVoucherNumber(savedPaymentNumber);
        }
      }
      setMessage(
        response.message || `${currentType.label} saved successfully.`,
      );
      setShowSavedVoucher(true);
    } catch (error) {
      setError(error.message || "Unable to save transaction.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =====================================================
   * DISPLAY HELPERS
   * =====================================================
   */

  const currentType = TRANSACTION_TYPES.find((item) => item.key === type);

  const partyName =
    party?.party_name ||
    party?.name ||
    party?.company_name ||
    party?.customer_name ||
    party?.supplier_name ||
    "Select supplier";
  /*
   * =====================================================
   * RETURN
   * =====================================================
   */

  return (
    <AppLayout>
      <div className={styles.page}>
        <TransactionHeader type={type} changeType={changeType} />

        <div
          className={showPreview ? styles.workspace : styles.workspaceSingle}
        >
          {type === "sale" && (
            <SalesForm
              date={date}
              setDate={setDate}
              party={party}
              setParty={setParty}
              billNumber={voucherNumber}
              services={salesServices}
              addService={addSalesService}
              updateService={updateSalesService}
              removeService={removeSalesService}
              subtotal={salesSubtotal}
              discount={salesDiscount}
              setDiscount={setSalesDiscount}
              discountMode={salesDiscountMode}
              setDiscountMode={setSalesDiscountMode}
              vatRate={salesVatRate}
              setVatRate={setSalesVatRate}
              afterTaxTotalBeforeDiscount={salesAfterTaxTotalBeforeDiscount}
              discountAmount={salesDiscountAmount}
              taxableAmount={salesTaxableAmount}
              vatAmount={salesVatAmount}
              totalAmount={salesTotalAmount}
              narration={narration}
              setNarration={setNarration}
              error={error}
              message={message}
              saving={saving}
              onSubmit={handleSubmit}
            />
          )}

          {type === "receipt" && (
            <ReceiptForm
              date={date}
              setDate={setDate}
              party={party}
              setParty={setParty}
              receiptBills={receiptBills}
              selectedReceiptBill={selectedReceiptBill}
              setSelectedReceiptBill={setSelectedReceiptBill}
              receiptAmount={receiptAmount}
              setReceiptAmount={setReceiptAmount}
              accountId={accountId}
              setAccountId={setAccountId}
              narration={narration}
              setNarration={setNarration}
              error={error}
              message={message}
              saving={saving}
              onSubmit={handleSubmit}
            />
          )}

          {type === "payment" && (
            <PaymentForm
              date={date}
              setDate={setDate}
              party={party}
              setParty={setParty}
              paymentBills={paymentBills}
              selectedPaymentBill={selectedPaymentBill}
              setSelectedPaymentBill={setSelectedPaymentBill}
              paymentAmount={paymentAmount}
              setPaymentAmount={setPaymentAmount}
              accountId={accountId}
              setAccountId={setAccountId}
              paymentAccount={paymentAccount}
              setPaymentAccount={setPaymentAccount}
              narration={narration}
              setNarration={setNarration}
              error={error}
              message={message}
              saving={saving}
              onSubmit={handleSubmit}
            />
          )}

          {type === "expense" && (
            <ExpenseForm
              date={date}
              setDate={setDate}
              party={party}
              setParty={setParty}
              referenceNumber={referenceNumber}
              setReferenceNumber={setReferenceNumber}
              attachment={expenseAttachment}
              setAttachment={setExpenseAttachment}
              items={expenseItems}
              addItem={addExpenseItem}
              updateItem={updateExpenseItem}
              removeItem={removeExpenseItem}
              subtotal={expenseSubtotal}
              discount={discount}
              setDiscount={setDiscount}
              discountMode={discountMode}
              setDiscountMode={setDiscountMode}
              vatRate={vatRate}
              setVatRate={setVatRate}
              afterTaxTotalBeforeDiscount={afterTaxTotalBeforeDiscount}
              discountAmount={discountAmount}
              taxableAmount={taxableAmount}
              vatAmount={vatAmount}
              totalAmount={totalAmount}
              narration={narration}
              setNarration={setNarration}
              error={error}
              message={message}
              saving={saving}
              onSubmit={handleSubmit}
            />
          )}
          {type === "capital" && (
            <CapitalForm
              date={date}
              setDate={setDate}
              availableCapital={availableCapital}
              amount={capitalAmount}
              setAmount={setCapitalAmount}
              cashAmount={capitalCash}
              setCashAmount={setCapitalCash}
              bankAmount={capitalBank}
              setBankAmount={setCapitalBank}
              narration={narration}
              setNarration={setNarration}
              error={error}
              message={message}
              saving={saving}
              onSubmit={handleSubmit}
            />
          )}

          {/* =====================================
                        BILL PREVIEW
                    ===================================== */}

          {/* =====================================
    SINGLE VOUCHER PREVIEW
===================================== */}

          {showPreview ? (
            <aside className={styles.previewPanel}>
              <div className={styles.previewHeader}>
                <div>
                  <span className={styles.previewEyebrow}>
                    {showSavedVoucher ? "SAVED VOUCHER" : "LIVE PREVIEW"}
                  </span>

                  <h2>{currentType?.label || "Transaction"}</h2>
                </div>

                {!showSavedVoucher && (
                  <button
                    type="button"
                    className={styles.previewHideButton}
                    onClick={() => setShowPreview(false)}
                  >
                    Hide
                  </button>
                )}
              </div>

              <div className={styles.billPreview}>
                <div className={styles.voucherPreviewScale}>
                  {type === "capital" ? (
                    <PrintableCapitalVoucher
                      voucherNumber={voucherNumber}
                      date={date}
                      amount={capitalAmount}
                      cashAmount={capitalCash}
                      bankAmount={capitalBank}
                      narration={narration}
                    />
                  ) : (
                    <PrintableVoucher
                      type={type}
                      date={date}
                      party={party}
                      company={company}
                      referenceNumber={referenceNumber}
                      billReference={
                        type === "expense"
                          ? referenceNumber
                          : type === "payment"
                            ? selectedPaymentBill?.reference_number || ""
                            : ""
                      }
                      voucherNumber={voucherNumber}
                      items={
                        type === "sale"
                          ? salesServices
                          : type === "expense"
                            ? expenseItems
                            : []
                      }
                      amount={
                        type === "sale"
                          ? salesSubtotal
                          : type === "receipt"
                            ? receiptAmount
                            : amount
                      }
                      discountAmount={
                        type === "sale" ? salesDiscountAmount : discountAmount
                      }
                      vatRate={type === "sale" ? salesVatRate : vatRate}
                      vatAmount={type === "sale" ? salesVatAmount : vatAmount}
                      totalAmount={
                        type === "sale"
                          ? salesTotalAmount
                          : type === "receipt"
                            ? receiptAmount
                            : totalAmount
                      }
                      paymentAmount={paymentAmount}
                      paymentAccount={paymentAccount}
                      selectedPaymentBill={selectedPaymentBill}
                      selectedReceiptBill={selectedReceiptBill}
                      receiptAmount={receiptAmount}
                      narration={narration}
                    />
                  )}
                </div>
              </div>
            </aside>
          ) : (
            <button
              type="button"
              className={styles.showPreviewButton}
              onClick={() => setShowPreview(true)}
            >
              Show Preview
            </button>
          )}
        </div>
      </div>

      {showSavedVoucher &&
        (type === "capital" ? (
          <SavedCapitalVoucher
            voucherNumber={voucherNumber}
            date={date}
            amount={capitalAmount}
            cashAmount={capitalCash}
            bankAmount={capitalBank}
            narration={narration}
            closeSavedVoucher={closeSavedVoucher}
          />
        ) : (
          <SavedVoucher
            type={type}
            currentType={currentType}
            date={date}
            party={party}
            company={company}
            referenceNumber={referenceNumber}
            billReference={
              type === "expense"
                ? referenceNumber
                : type === "payment"
                  ? selectedPaymentBill?.reference_number || ""
                  : ""
            }
            voucherNumber={voucherNumber}
            items={type === "sale" ? salesServices : expenseItems}
            amount={type === "sale" ? salesSubtotal : amount}
            discountAmount={
              type === "sale" ? salesDiscountAmount : discountAmount
            }
            vatRate={type === "sale" ? salesVatRate : vatRate}
            vatAmount={type === "sale" ? salesVatAmount : vatAmount}
            totalAmount={type === "sale" ? salesTotalAmount : totalAmount}
            paymentAmount={paymentAmount}
            paymentAccount={paymentAccount}
            selectedPaymentBill={selectedPaymentBill}
            selectedReceiptBill={selectedReceiptBill}
            receiptAmount={receiptAmount}
            narration={narration}
            printVoucher={printVoucher}
            closeSavedVoucher={closeSavedVoucher}
          />
        ))}
    </AppLayout>
  );
}
