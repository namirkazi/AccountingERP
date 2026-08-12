import { useEffect, useState } from "react";

import AppLayout from "../../components/layout/AppLayout";

import { createTransaction } from "../../services/transactionService";
import { searchPaymentExpenses, createPayment } from "../../services/paymentService";

import TransactionHeader, { TRANSACTION_TYPES } from "./components/TransactionHeader";
import SavedVoucher from "./components/Shared/SavedVoucher";

import SalesForm from "./components/Sales/SalesForm";
import SalesPreview from "./components/Sales/SalesPreview";

import ReceiptForm from "./components/Reciept/ReceiptForm";
import ReceiptPreview from "./components/Reciept/ReceiptPreview";

import PaymentForm from "./components/Payment/PaymentForm";
import PaymentPreview from "./components/Payment/PaymentPreview";

import ExpenseForm from "./components/Expense/ExpenseForm";
import ExpensePreview from "./components/Expense/ExpensePreview";
import useExpenseTransaction from "./hooks/useExpenseTransaction";

import styles from "./Transactions.module.css";

export default function Transactions() {

    const [type, setType] = useState("sale");

    const expense = useExpenseTransaction();

    const {
        items: expenseItems,
        addItem: addExpenseItem,
        updateItem: updateExpenseItem,
        removeItem: removeExpenseItem,
        referenceNumber,
        setReferenceNumber,
        selectedExpense,
        setSelectedExpense,
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

    const [paymentExpenses, setPaymentExpenses] = useState([]);
    const [selectedPaymentExpense, setSelectedPaymentExpense] = useState(null);

    const [paymentAmount, setPaymentAmount] = useState("");

    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [party, setParty] = useState(null);

    const [amount, setAmount] = useState("");

    const [narration, setNarration] = useState("");

    const [accountId, setAccountId] = useState("");

    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [showPreview, setShowPreview] = useState(true);
    const [showSavedVoucher, setShowSavedVoucher] = useState(false);

    const [voucherNumber, setVoucherNumber] = useState("");

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
            setPaymentExpenses([]);
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

                setPaymentExpenses(response?.data?.expenses || []);

            } catch (error) {

                if (cancelled) {
                    return;
                }

                console.error("Unable to load payment expenses:", error);

                setPaymentExpenses([]);
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
        setVoucherNumber("");
        setParty(null);
        setAmount("");
        setNarration("");
        setAccountId("");
        setSelectedExpense(null);
        setPaymentExpenses([]);
        setSelectedPaymentExpense(null);
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
        setVoucherNumber("");
        setNarration("");
        setAccountId("");
        setSelectedExpense(null);
        setSelectedPaymentExpense(null);
        setPaymentExpenses([]);
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
            selectedPaymentExpense?.party_name ||
            "Supplier";

        const reference =
            type === "payment"
                ? (selectedPaymentExpense?.reference_number || referenceNumber || "Voucher")
                : (voucherNumber || referenceNumber || "Voucher");

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

        if (type === "expense" && !selectedExpense) {
            setError("Please select an expense.");
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

        const currentAmount =
            type === "payment"
                ? Number(paymentAmount)
                : type === "expense"
                    ? Number(totalAmount)
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

            if (!selectedPaymentExpense) {
                setError("Please select a bill to pay.");
                return;
            }

            if (!accountId) {
                setError("Please select Cash or Bank.");
                return;
            }

            const outstanding = Number(selectedPaymentExpense.outstanding_amount) || 0;

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
                    expense_id: Number(selectedPaymentExpense.id),
                    amount: Number(paymentAmount),
                    payment_account_id: Number(accountId),
                    date,
                    narration: narration.trim()
                });

            } else {

                response = await createTransaction({
                    type,
                    date,
                    party_id: party?.id || null,
                    reference_number: type === "expense" ? referenceNumber.trim() : null,
                    amount:
                        type === "expense"
                            ? Number(totalAmount) || 0
                            : Number(amount) || 0,
                    vat_input: type === "expense" ? Number(vatAmount) || 0 : 0,
                    vat_rate: type === "expense" ? Number(vatRate) || 0 : 0,
                    items: type === "expense" ? expenseItems : undefined,
                    discount: type === "expense" ? Number(discountAmount) || 0 : 0,
                    discount_mode: type === "expense" ? discountMode : null,
                    account_id:
                        type === "expense"
                            ? Number(selectedExpense?.id) || null
                            : Number(accountId) || null,
                    expense_payment_status: type === "expense" ? "pending" : null,
                    narration
                });

            }

            if (type === "expense") {
                setVoucherNumber(getSavedVoucherNumber(response));
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

    const expenseName =
        selectedExpense?.expense_name ||
        selectedExpense?.name ||
        selectedExpense?.account_name ||
        "Selected expense";

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
                            amount={amount}
                            setAmount={setAmount}
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
                            paymentExpenses={paymentExpenses}
                            selectedPaymentExpense={selectedPaymentExpense}
                            setSelectedPaymentExpense={setSelectedPaymentExpense}
                            setReferenceNumber={setReferenceNumber}
                            paymentAmount={paymentAmount}
                            setPaymentAmount={setPaymentAmount}
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

                    {type === "expense" && (
                        <ExpenseForm
                            date={date}
                            setDate={setDate}
                            party={party}
                            setParty={setParty}
                            referenceNumber={referenceNumber}
                            setReferenceNumber={setReferenceNumber}
                            selectedExpense={selectedExpense}
                            setSelectedExpense={setSelectedExpense}
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

                    {type === "sale" && (
                        <SalesPreview
                            date={date}
                            party={party}
                            partyName={partyName}
                            amount={amount}
                            narration={narration}
                            showPreview={showPreview}
                            setShowPreview={setShowPreview}
                            showSavedVoucher={showSavedVoucher}
                            printVoucher={printVoucher}
                        />
                    )}

                    {type === "receipt" && (
                        <ReceiptPreview
                            date={date}
                            party={party}
                            partyName={partyName}
                            amount={amount}
                            narration={narration}
                            showPreview={showPreview}
                            setShowPreview={setShowPreview}
                            showSavedVoucher={showSavedVoucher}
                            printVoucher={printVoucher}
                        />
                    )}

                    {type === "payment" && (
                        <PaymentPreview
                            date={date}
                            party={party}
                            partyName={partyName}
                            referenceNumber={referenceNumber}
                            paymentAmount={paymentAmount}
                            selectedPaymentExpense={selectedPaymentExpense}
                            narration={narration}
                            showPreview={showPreview}
                            setShowPreview={setShowPreview}
                            showSavedVoucher={showSavedVoucher}
                            printVoucher={printVoucher}
                        />
                    )}

                    {type === "expense" && (
                        <ExpensePreview
                            date={date}
                            party={party}
                            partyName={partyName}
                            referenceNumber={referenceNumber}
                            voucherNumber={voucherNumber}
                            items={expenseItems}
                            subtotal={expenseSubtotal}
                            expenseName={expenseName}
                            discountAmount={discountAmount}
                            taxableAmount={taxableAmount}
                            vatRate={vatRate}
                            vatAmount={vatAmount}
                            totalAmount={totalAmount}
                            narration={narration}
                            showPreview={showPreview}
                            setShowPreview={setShowPreview}
                            showSavedVoucher={showSavedVoucher}
                            printVoucher={printVoucher}
                        />
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
                    items={expenseItems}
                    amount={amount}
                    discountAmount={discountAmount}
                    vatRate={vatRate}
                    vatAmount={vatAmount}
                    totalAmount={totalAmount}
                    paymentAmount={paymentAmount}
                    accountId={accountId}
                    selectedPaymentExpense={selectedPaymentExpense}
                    narration={narration}
                    printVoucher={printVoucher}
                    closeSavedVoucher={closeSavedVoucher}
                />

            )}

        </AppLayout>
    );
}
