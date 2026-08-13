import { useEffect, useState } from "react";

import AppLayout from "../../components/layout/AppLayout";

import { createTransaction } from "../../services/transactionService";
import { searchPaymentExpenses, createPayment } from "../../services/paymentService";

import TransactionHeader, { TRANSACTION_TYPES } from "./components/TransactionHeader";
import SavedVoucher from "./components/Shared/SavedVoucher";

import SalesForm from "./components/Sales/SalesForm";

import ReceiptForm from "./components/Receipt/ReceiptForm";

import PaymentForm from "./components/Payment/PaymentForm";

import ExpenseForm from "./components/Expense/ExpenseForm";
import useExpenseTransaction from "./hooks/useExpenseTransaction";
import PrintableVoucher
    from "../../components/accounting/PrintableVoucher";
import styles from "./Transactions.module.css";

import useSalesTransaction from "./hooks/useSalesTransaction";

import {
    getNextSalesBillNumber
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

        afterTaxTotalBeforeDiscount:
        salesAfterTaxTotalBeforeDiscount,

        validServices: validSalesServices,

        resetSales
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
        resetExpense
    } = expense;
    const [paymentBills, setPaymentBills] = useState([]);
    const [selectedPaymentBill, setSelectedPaymentBill] = useState(null);

    const [paymentAmount, setPaymentAmount] = useState("");

    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [party, setParty] = useState(null);

    const [amount, setAmount] = useState("");

    const [narration, setNarration] = useState("");

    const [accountId, setAccountId] = useState("");
    const [paymentAccount, setPaymentAccount] = useState(null);

    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [showPreview, setShowPreview] = useState(true);
    const [showSavedVoucher, setShowSavedVoucher] = useState(false);

    const [voucherNumber, setVoucherNumber] = useState("");

    /* Sale BIll NO */
    useEffect(() => {

        if (type !== "sale") {
            return;
        }

        let cancelled = false;

        async function loadNextBillNumber() {

            try {

                setError("");

                const response =
                    await getNextSalesBillNumber();

                if (cancelled) {
                    return;
                }

                const billNumber =
                    response?.data?.bill_number ||
                    response?.bill_number ||
                    "";

                setVoucherNumber(
                    billNumber
                );

            } catch (error) {

                if (cancelled) {
                    return;
                }

                console.error(
                    "Unable to generate Sales bill number:",
                    error
                );

                setError(
                    error.message ||
                    "Unable to generate Sales bill number."
                );

            }

        }

        loadNextBillNumber();

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

            const shortcut = TRANSACTION_TYPES.find(
                item => item.shortcut.toLowerCase().endsWith(key)
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

                setPaymentBills(
                    response?.data?.expenses || []
                );

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

    /*
     * =====================================================
     * CHANGE TYPE / RESET
     * =====================================================
     */

    function changeType(newType) {

        setType(newType);
        resetExpense();
        resetSales();
        setVoucherNumber("");
        setParty(null);
        setAmount("");
        setNarration("");
        setAccountId("");
        setPaymentAccount(null);
        setPaymentBills([]);
        setSelectedPaymentBill(null);
        setPaymentAmount("");
        setMessage("");
        setError("");
        setDiscount("");
    }

    function resetTransactionForm() {

        setParty(null);
        setAmount("");
        setPaymentAmount("");
        resetExpense();
        resetSales();
        setVoucherNumber("");
        setNarration("");
        setAccountId("");
        setPaymentAccount(null);
        setPaymentBills([]);
        setSelectedPaymentBill(null);
        setMessage("");
        setError("");
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
        const id =
            response?.data?.voucher_id ||
            response?.data?.voucher?.id ||
            response?.voucher_id ||
            response?.voucher?.id ||
            response?.data?.id;

        if (id) {
            return `EXP-${String(id).padStart(6, "0")}`;
        }

        return getNextLocalExpenseVoucherNumber();
    }

    /*
     * Print Function
     */
    function printVoucher() {

        const supplierName =
            party?.party_name ||
            selectedPaymentBill?.party_name ||
            "Supplier";

        const reference =
            type === "payment"
                ? (
                    voucherNumber ||
                    selectedPaymentBill?.reference_number ||
                    referenceNumber ||
                    "Voucher"
                )
                : (
                    voucherNumber ||
                    referenceNumber ||
                    "Voucher"
                );

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

        if (!party) {
            setError(type === "expense" ? "Please select a supplier." : "Please select a party.");
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

        if (type === "expense" && validExpenseItems.length !== expenseItems.length) {
            setError("Please complete every expense item with a description, quantity, and rate.");
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

            if (
                validSalesServices.length !==
                salesServices.length
            ) {
                setError(
                    "Please complete every service with a name and amount."
                );
                return;
            }

            if (
                Number(salesVatRate) < 0 ||
                Number(salesVatRate) > 100
            ) {
                setError(
                    "Tax percentage must be between 0 and 100."
                );
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
                        : Number(amount);

        if (!currentAmount || currentAmount <= 0) {
            setError(
                type === "payment"
                    ? "Please enter a valid payment amount."
                    : "Please enter a valid amount."
            );
            return;
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

            const outstanding =
                Number(
                    selectedPaymentBill.outstanding_amount
                ) || 0;

            if (currentAmount > outstanding) {
                setError(`Payment cannot exceed the outstanding amount of AED ${outstanding.toFixed(2)}.`);
                return;
            }

        }

        if (type === "expense" && (Number(vatRate) < 0 || Number(vatRate) > 100)) {
            setError("VAT percentage must be between 0 and 100.");
            return;
        }

        setSaving(true);

        try {

            let response;

            if (type === "payment") {

                response = await createPayment({

                    expense_id:
                        Number(selectedPaymentBill.id),

                    amount:
                        Number(paymentAmount),

                    payment_account_id:
                        Number(accountId),

                    date,

                    narration:
                        narration.trim()

                });

            } else {

                response = await createTransaction({

                    type,

                    date,

                    party_id:
                        party?.id || null,

                    reference_number:
                        type === "expense"
                            ? referenceNumber.trim()
                            : null,

                    amount:
                        type === "expense"
                            ? Number(totalAmount) || 0
                            : type === "sale"
                                ? Number(salesTotalAmount) || 0
                                : Number(amount) || 0,

                    vat_input:
                        type === "expense"
                            ? Number(vatAmount) || 0
                            : 0,

                    vat_rate:
                        type === "expense"
                            ? Number(vatRate) || 0
                            : type === "sale"
                                ? Number(salesVatRate) || 0
                                : 0,

                    items:
                        type === "expense"
                            ? expenseItems
                            : type === "sale"
                                ? salesServices
                                : undefined,

                    discount:
                        type === "expense"
                            ? Number(discountAmount) || 0
                            : type === "sale"
                                ? Number(salesDiscountAmount) || 0
                                : 0,

                    discount_mode:
                        type === "expense"
                            ? discountMode
                            : type === "sale"
                                ? salesDiscountMode
                                : null,

                    account_id:
                        type === "payment" ||
                            type === "receipt"
                            ? Number(accountId) || null
                            : null,

                    expense_payment_status:
                        type === "expense"
                            ? "pending"
                            : null,

                    narration

                });

            }

            if (type === "expense") {

                setVoucherNumber(
                    getSavedVoucherNumber(response)
                );

            }

            if (type === "payment") {

                const paymentVoucherId =
                    response?.data?.payment_voucher_id;

                if (paymentVoucherId) {

                    setVoucherNumber(
                        `PAY-${String(
                            paymentVoucherId
                        ).padStart(6, "0")}`
                    );

                }

            }

            setMessage(response.message || `${currentType.label} saved successfully.`);
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

    const currentType = TRANSACTION_TYPES.find(item => item.key === type);

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

                <div className={showPreview ? styles.workspace : styles.workspaceSingle}>

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

                            afterTaxTotalBeforeDiscount={
                                salesAfterTaxTotalBeforeDiscount
                            }

                            discountAmount={
                                salesDiscountAmount
                            }

                            taxableAmount={
                                salesTaxableAmount
                            }

                            vatAmount={
                                salesVatAmount
                            }

                            totalAmount={
                                salesTotalAmount
                            }

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
                            amount={amount}
                            setAmount={setAmount}
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

                            selectedPaymentBill={
                                selectedPaymentBill
                            }

                            setSelectedPaymentBill={
                                setSelectedPaymentBill
                            }

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
                                        {showSavedVoucher
                                            ? "SAVED VOUCHER"
                                            : "LIVE PREVIEW"
                                        }
                                    </span>

                                    <h2>
                                        {currentType?.label || "Transaction"}
                                    </h2>
                                </div>


                                {!showSavedVoucher && (

                                    <button
                                        type="button"
                                        className={styles.previewHideButton}
                                        onClick={() =>
                                            setShowPreview(false)
                                        }
                                    >
                                        Hide
                                    </button>

                                )}

                            </div>


                            <div className={styles.billPreview}>
                                <div className={styles.voucherPreviewScale}>
                                    <PrintableVoucher
                                        type={type}
                                        date={date}
                                        party={party}

                                        referenceNumber={
                                            type === "sale"
                                                ? referenceNumber
                                                : referenceNumber
                                        }

                                        voucherNumber={voucherNumber}

                                        items={
                                            type === "sale"
                                                ? salesServices
                                                : expenseItems
                                        }

                                        amount={
                                            type === "sale"
                                                ? salesSubtotal
                                                : amount
                                        }

                                        discountAmount={
                                            type === "sale"
                                                ? salesDiscountAmount
                                                : discountAmount
                                        }

                                        vatRate={
                                            type === "sale"
                                                ? salesVatRate
                                                : vatRate
                                        }

                                        vatAmount={
                                            type === "sale"
                                                ? salesVatAmount
                                                : vatAmount
                                        }

                                        totalAmount={
                                            type === "sale"
                                                ? salesTotalAmount
                                                : totalAmount
                                        }

                                        paymentAmount={paymentAmount}
                                        paymentAccount={paymentAccount}
                                        selectedPaymentBill={selectedPaymentBill}
                                        narration={narration}
                                    />
                                </div>
                            </div>

                        </aside>

                    ) : (

                        <button
                            type="button"
                            className={styles.showPreviewButton}
                            onClick={() =>
                                setShowPreview(true)
                            }
                        >
                            Show Preview
                        </button>

                    )}

                </div>

            </div>


            {showSavedVoucher && (

                <SavedVoucher
                    type={type}
                    currentType={currentType}
                    date={date}
                    party={party}

                    referenceNumber={referenceNumber}
                    voucherNumber={voucherNumber}

                    items={
                        type === "sale"
                            ? salesServices
                            : expenseItems
                    }

                    amount={
                        type === "sale"
                            ? salesSubtotal
                            : amount
                    }

                    discountAmount={
                        type === "sale"
                            ? salesDiscountAmount
                            : discountAmount
                    }

                    vatRate={
                        type === "sale"
                            ? salesVatRate
                            : vatRate
                    }

                    vatAmount={
                        type === "sale"
                            ? salesVatAmount
                            : vatAmount
                    }

                    totalAmount={
                        type === "sale"
                            ? salesTotalAmount
                            : totalAmount
                    }

                    paymentAmount={paymentAmount}
                    paymentAccount={paymentAccount}
                    selectedPaymentBill={selectedPaymentBill}
                    narration={narration}

                    printVoucher={printVoucher}
                    closeSavedVoucher={closeSavedVoucher}
                />
            )}

        </AppLayout>
    );
}
