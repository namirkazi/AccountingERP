import { useEffect, useState } from "react";
import {
    CalendarDays,
    Check,
    FileText,
    Save,
    Eye,
    EyeOff,
    UserStar
} from "lucide-react";

import AccountSelector
    from "../../components/accounting/AccountSelector";

import AppLayout
    from "../../components/layout/AppLayout";

import PartySelector
    from "../../components/accounting/PartySelector";

import ExpenseSelector
    from "../../components/accounting/ExpenseSelector";

import { createTransaction }
    from "../../services/transactionService";

import {
    searchPaymentExpenses,
    createPayment
} from "../../services/paymentService";

import styles from "./Transactions.module.css";
import PrintableVoucher from "../../components/accounting/PrintableVoucher";

const TRANSACTION_TYPES = [
    {
        key: "sale",
        label: "Sales",
        shortcut: "Alt + S"
    },
    {
        key: "receipt",
        label: "Receipt",
        shortcut: "Alt + R"
    },
    {
        key: "payment",
        label: "Payment",
        shortcut: "Alt + P"
    },
    {
        key: "expense",
        label: "Expense",
        shortcut: "Alt + E"
    }
];


export default function Transactions() {

    const [type, setType] =
        useState("sale");


    const [selectedExpense, setSelectedExpense] =
        useState(null);
    const [paymentExpenses, setPaymentExpenses] =
        useState([]);
    const [selectedPaymentExpense, setSelectedPaymentExpense] =
        useState(null);

    const [paymentAmount, setPaymentAmount] =
        useState("");

    const [date, setDate] =
        useState(
            new Date()
                .toISOString()
                .split("T")[0]
        );


    const [party, setParty] =
        useState(null);

    const [discount, setDiscount] =
        useState("");

    const [discountMode, setDiscountMode] =
        useState("after_tax")

    const [amount, setAmount] =
        useState("");


    const [vatRate, setVatRate] =
        useState("5");


    const [referenceNumber, setReferenceNumber] =
        useState("");


    const [narration, setNarration] =
        useState("");


    const [accountId, setAccountId] =
        useState("");


    const [saving, setSaving] =
        useState(false);


    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");


    const [showPreview, setShowPreview] =
        useState(true);

    const [showSavedVoucher, setShowSavedVoucher] =
        useState(false);
    /*
   * =====================================================
   * VAT + DISCOUNT CALCULATION
   * =====================================================
   */

    const grossAmount =
        Number(amount) || 0;

    const enteredDiscount =
        Number(discount) || 0;

    const vatPercentage =
        Number(vatRate) || 0;

    /*
     * BEFORE TAX
     *
     * Amount
     *   ↓
     * Discount
     *   ↓
     * Taxable Amount
     *   ↓
     * VAT
     *   ↓
     * Total
     */
    const beforeTaxDiscount =
        discountMode === "before_tax"
            ? Math.min(
                enteredDiscount,
                grossAmount
            )
            : 0;

    const beforeTaxTaxable =
        Math.max(
            0,
            grossAmount - beforeTaxDiscount
        );

    const beforeTaxVat =
        beforeTaxTaxable *
        vatPercentage /
        100;

    const beforeTaxTotal =
        beforeTaxTaxable +
        beforeTaxVat;


    /*
     * AFTER TAX
     *
     * Amount
     *   ↓
     * VAT
     *   ↓
     * Amount After VAT
     *   ↓
     * Discount
     *   ↓
     * Total
     */
    const afterTaxVat =
        grossAmount *
        vatPercentage /
        100;

    const afterTaxTotalBeforeDiscount =
        grossAmount +
        afterTaxVat;

    const afterTaxDiscount =
        discountMode === "after_tax"
            ? Math.min(
                enteredDiscount,
                afterTaxTotalBeforeDiscount
            )
            : 0;

    const afterTaxTotal =
        Math.max(
            0,
            afterTaxTotalBeforeDiscount -
            afterTaxDiscount
        );


    /*
     * FINAL VALUES
     */
    const discountAmount =
        type === "expense"
            ? (
                discountMode === "after_tax"
                    ? afterTaxDiscount
                    : beforeTaxDiscount
            )
            : 0;

    const taxableAmount =
        type === "expense"
            ? (
                discountMode === "after_tax"
                    ? grossAmount
                    : beforeTaxTaxable
            )
            : 0;

    const vatAmount =
        type === "expense"
            ? (
                discountMode === "after_tax"
                    ? afterTaxVat
                    : beforeTaxVat
            )
            : 0;

    const totalAmount =
        type === "expense"
            ? (
                discountMode === "after_tax"
                    ? afterTaxTotal
                    : beforeTaxTotal
            )
            : grossAmount;

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


            const tag =
                event.target.tagName;


            /*
             * Don't trigger shortcuts while
             * typing into form fields.
             */

            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT"
            ) {
                return;
            }


            const key =
                event.key.toLowerCase();


            const shortcut =
                TRANSACTION_TYPES.find(
                    item =>
                        item.shortcut
                            .toLowerCase()
                            .endsWith(key)
                );


            if (!shortcut) {
                return;
            }


            event.preventDefault();


            changeType(
                shortcut.key
            );
        }


        window.addEventListener(
            "keydown",
            handleShortcut
        );


        return () =>
            window.removeEventListener(
                "keydown",
                handleShortcut
            );

    }, []);
    useEffect(() => {

        if (
            type !== "payment" ||
            !party?.party_name
        ) {
            setPaymentExpenses([]);
            return;
        }


        let cancelled = false;


        async function loadPaymentExpenses() {

            try {

                setError("");


                const response =
                    await searchPaymentExpenses(
                        party.party_name
                    );


                if (cancelled) {
                    return;
                }


                setPaymentExpenses(
                    response?.data?.expenses || []
                );


            } catch (error) {

                if (cancelled) {
                    return;
                }


                console.error(
                    "Unable to load payment expenses:",
                    error
                );


                setPaymentExpenses([]);

                setError(
                    error.message ||
                    "Unable to load outstanding bills."
                );

            }
        }


        loadPaymentExpenses();


        return () => {
            cancelled = true;
        };

    }, [
        type,
        party?.id,
        party?.party_name
    ]);

    /*
     * =====================================================
     * CHANGE TYPE
     * =====================================================
     */

    function changeType(newType) {

        setType(newType);

        setReferenceNumber("");

        setVatRate("5");

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

        setReferenceNumber("");

        setVatRate("5");

        setDiscount("");

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

        setParty(null);

        setAmount("");

        setPaymentAmount("");

        setReferenceNumber("");

        setVatRate("5");

        setDiscount("");

        setNarration("");

        setAccountId("");

        setSelectedExpense(null);

        setSelectedPaymentExpense(null);

        setPaymentExpenses([]);

        setMessage("");

        setError("");

    }
    /* 
    Print Function       
*/
    function printVoucher() {
        const supplierName =
            party?.party_name ||
            selectedPaymentExpense?.party_name ||
            "Supplier";

        const reference =
            type === "payment"
                ? (
                    selectedPaymentExpense?.reference_number ||
                    referenceNumber ||
                    "Voucher"
                )
                : (
                    referenceNumber ||
                    "Voucher"
                );

        /*
         * Remove characters that Windows does not
         * allow in filenames.
         */
        const cleanSupplier =
            supplierName
                .replace(/[<>:"/\\|?*]/g, "")
                .trim();

        const cleanReference =
            reference
                .replace(/[<>:"/\\|?*]/g, "")
                .trim();

        const originalTitle =
            document.title;

        document.title =
            `${cleanReference} - ${cleanSupplier}`;

        window.print();

        /*
         * Restore the original browser tab title
         * after printing.
         */
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


        /*
         * Party validation
         */

        if (!party) {

            setError(
                type === "expense"
                    ? "Please select a supplier."
                    : "Please select a party."
            );

            return;
        }


        /*
         * Supplier bill reference
         */

        if (
            type === "expense" &&
            !referenceNumber.trim()
        ) {

            setError(
                "Please enter the supplier bill/reference number."
            );

            return;
        }


        /*
         * Expense head
         */

        if (
            type === "expense" &&
            !selectedExpense
        ) {

            setError(
                "Please select an expense."
            );

            return;
        }


        /*
         * Amount
         */

        const currentAmount =
            type === "payment"
                ? Number(paymentAmount)
                : Number(amount);


        if (
            !currentAmount ||
            currentAmount <= 0
        ) {

            setError(
                type === "payment"
                    ? "Please enter a valid payment amount."
                    : "Please enter a valid amount."
            );

            return;
        }

        /*
         * Payment validation
         */

        if (type === "payment") {

            if (!selectedPaymentExpense) {

                setError(
                    "Please select a bill to pay."
                );

                return;
            }


            if (!accountId) {

                setError(
                    "Please select Cash or Bank."
                );

                return;
            }


            const outstanding =
                Number(
                    selectedPaymentExpense
                        .outstanding_amount
                ) || 0;


            if (currentAmount > outstanding) {

                setError(
                    `Payment cannot exceed the outstanding amount of AED ${outstanding.toFixed(2)}.`
                );

                return;
            }

        }


        /*
         * VAT validation
         */

        if (
            type === "expense" &&
            (
                Number(vatRate) < 0 ||
                Number(vatRate) > 100
            )
        ) {

            setError(
                "VAT percentage must be between 0 and 100."
            );

            return;
        }


        setSaving(true);


        try {

            let response;


            /*
             * =====================================================
             * PAYMENT
             * =====================================================
             */

            if (type === "payment") {

                response =
                    await createPayment({

                        expense_id:
                            Number(
                                selectedPaymentExpense.id
                            ),

                        amount:
                            Number(paymentAmount),

                        payment_account_id:
                            Number(accountId),

                        date,

                        narration:
                            narration.trim()

                    });

            }


            /*
             * =====================================================
             * OTHER TRANSACTIONS
             * =====================================================
             */

            else {

                response =
                    await createTransaction({

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
                                ? totalAmount
                                : type === "payment"
                                    ? Number(paymentAmount) || 0
                                    : Number(amount) || 0,

                        /*
                         * Send the calculated VAT amount,
                         * not the VAT percentage.
                         */
                        vat_input:
                            type === "expense"
                                ? vatAmount
                                : 0,

                        /*
                         * Keep the VAT percentage too.
                         */
                        vat_rate:
                            type === "expense"
                                ? Number(vatRate) || 0
                                : 0,

                        account_id:
                            type === "expense"
                                ? Number(
                                    selectedExpense?.id
                                ) || null
                                : Number(accountId) || null,

                        expense_payment_status:
                            type === "expense"
                                ? "pending"
                                : null,

                        narration
                    });

            }


            setMessage(
                response.message ||
                `${currentType.label} saved successfully.`
            );

            setShowSavedVoucher(true);
        } catch (error) {

            setError(
                error.message ||
                "Unable to save transaction."
            );

        } finally {

            setSaving(false);
        }
    }


    /*
     * =====================================================
     * DISPLAY HELPERS
     * =====================================================
     */

    const currentType =
        TRANSACTION_TYPES.find(
            item =>
                item.key === type
        );


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

                {/* =========================================
                    HEADER
                ========================================= */}

                <div className={styles.header}>

                    <div>

                        <h1>
                            Transactions
                        </h1>

                        <p>
                            Record sales, receipts,
                            payments and expenses.
                        </p>

                    </div>

                </div>


                {/* =========================================
                    TRANSACTION TYPE
                ========================================= */}

                <div className={styles.typeBar}>

                    {TRANSACTION_TYPES.map(
                        item => (

                            <button
                                key={item.key}
                                type="button"
                                className={
                                    type === item.key
                                        ? styles.activeType
                                        : styles.typeButton
                                }
                                onClick={() =>
                                    changeType(
                                        item.key
                                    )
                                }
                            >

                                <span>
                                    {item.label}
                                </span>

                                <kbd>
                                    {item.shortcut}
                                </kbd>

                            </button>

                        )
                    )}

                </div>


                {/* =========================================
                    WORKSPACE
                ========================================= */}

                <div
                    className={
                        showPreview
                            ? styles.workspace
                            : styles.workspaceSingle
                    }
                >


                    {/* =====================================
                        FORM
                    ===================================== */}

                    <form
                        className={styles.form}
                        onSubmit={handleSubmit}
                    >


                        {/* =================================
                            BASIC DETAILS
                        ================================= */}

                        <div className={styles.card}>

                            <div
                                className={
                                    styles.sectionTitle
                                }
                            >

                                <FileText
                                    size={18}
                                />

                                <span>
                                    {currentType.label}
                                    {" "}
                                    Details
                                </span>

                            </div>


                            {/* DATE + PARTY */}

                            <div
                                className={
                                    styles.fieldRow
                                }
                            >

                                <div
                                    className={
                                        styles.field
                                    }
                                >

                                    <label>
                                        Date
                                    </label>

                                    <div
                                        className={
                                            styles.inputIcon
                                        }
                                    >

                                        <CalendarDays
                                            size={16}
                                        />

                                        <input
                                            type="date"
                                            value={date}
                                            onChange={
                                                event =>
                                                    setDate(
                                                        event.target.value
                                                    )
                                            }
                                        />

                                    </div>

                                </div>


                                <div
                                    className={
                                        styles.field
                                    }
                                >

                                    <label>
                                        {
                                            type === "expense" ||
                                                type === "payment"
                                                ? "Supplier"
                                                : "Customer"
                                        }
                                    </label>

                                    <PartySelector
                                        value={party}
                                        onChange={setParty}
                                        partyType={
                                            type === "expense" ||
                                                type === "payment"
                                                ? "supplier"
                                                : "customer"
                                        }
                                    />

                                </div>

                            </div>


                            {/* REFERENCE */}

                            {type === "expense" && (

                                <div
                                    className={
                                        styles.referenceField
                                    }
                                >

                                    <label>
                                        Supplier Bill /
                                        Reference No.
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            referenceNumber
                                        }
                                        onChange={
                                            event =>
                                                setReferenceNumber(
                                                    event.target.value
                                                )
                                        }
                                        placeholder="e.g. RB-2026-0047"
                                    />

                                </div>

                            )}
                            {type === "payment" && (

                                <div className={styles.paymentSelection}>

                                    <div className={styles.field}>

                                        <label>
                                            Bill / Reference No.
                                        </label>

                                        <select
                                            value={
                                                selectedPaymentExpense?.id || ""
                                            }
                                            onChange={(event) => {

                                                const selectedId =
                                                    event.target.value;

                                                const expense =
                                                    paymentExpenses.find(
                                                        item =>
                                                            String(item.id) ===
                                                            String(selectedId)
                                                    );

                                                if (!expense) {

                                                    setSelectedPaymentExpense(
                                                        null
                                                    );

                                                    setPaymentAmount("");

                                                    return;
                                                }


                                                setSelectedPaymentExpense(
                                                    expense
                                                );


                                                setPaymentAmount(
                                                    expense.outstanding_amount
                                                );


                                                setReferenceNumber(
                                                    expense.reference_number ||
                                                    ""
                                                );

                                            }}
                                            disabled={
                                                !party ||
                                                paymentExpenses.length === 0
                                            }
                                        >

                                            <option value="">
                                                {!party
                                                    ? "Select supplier first"
                                                    : paymentExpenses.length === 0
                                                        ? "No outstanding bills"
                                                        : "Select bill"
                                                }
                                            </option>


                                            {paymentExpenses.map(
                                                expense => (

                                                    <option
                                                        key={expense.id}
                                                        value={expense.id}
                                                    >

                                                        {expense.reference_number ||
                                                            `Voucher #${expense.id}`
                                                        }

                                                        {" — AED "}

                                                        {Number(
                                                            expense.outstanding_amount ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-AE",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}

                                                        {" outstanding"}

                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>


                                    {selectedPaymentExpense && (

                                        <div
                                            className={
                                                styles.selectedPaymentBill
                                            }
                                        >

                                            <div
                                                className={
                                                    styles.selectedPaymentBillHeader
                                                }
                                            >

                                                <span>
                                                    BILL BEING PAID
                                                </span>

                                                <strong>
                                                    {
                                                        selectedPaymentExpense
                                                            .reference_number ||
                                                        `Voucher #${selectedPaymentExpense.id}`
                                                    }
                                                </strong>

                                            </div>


                                            <div
                                                className={
                                                    styles.selectedPaymentBillAmounts
                                                }
                                            >

                                                <div>

                                                    <span>
                                                        Bill Total
                                                    </span>

                                                    <strong>
                                                        AED{" "}
                                                        {Number(
                                                            selectedPaymentExpense
                                                                .total_amount ||
                                                            selectedPaymentExpense
                                                                .amount ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-AE",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Already Paid
                                                    </span>

                                                    <strong>
                                                        AED{" "}
                                                        {Number(
                                                            selectedPaymentExpense
                                                                .paid_amount ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-AE",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Outstanding
                                                    </span>

                                                    <strong>
                                                        AED{" "}
                                                        {Number(
                                                            selectedPaymentExpense
                                                                .outstanding_amount ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-AE",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </strong>

                                                </div>

                                            </div>

                                        </div>

                                    )}

                                </div>

                            )}
                        </div>


                        {/* =================================
                            AMOUNT + VAT
                        ================================= */}

                        <div className={styles.card}>

                            <div
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Amount Details
                            </div>


                            <div
                                className={
                                    styles.fieldRow
                                }
                            >

                                {/* AMOUNT */}

                                <div
                                    className={
                                        styles.field
                                    }
                                >

                                    <label>
                                        {type === "payment"
                                            ? "Payment Amount"
                                            : "Amount"
                                        }
                                    </label>

                                    <div
                                        className={
                                            styles.amountField
                                        }
                                    >

                                        <span>
                                            AED
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={
                                                type === "payment"
                                                    ? paymentAmount
                                                    : amount
                                            }
                                            onChange={
                                                event => {

                                                    if (type === "payment") {

                                                        setPaymentAmount(
                                                            event.target.value
                                                        );

                                                    } else {

                                                        setAmount(
                                                            event.target.value
                                                        );

                                                    }

                                                }
                                            }
                                        />

                                    </div>

                                </div>
                                {/* Discount */}
                                {type === "expense" && (
                                    <>
                                        <div className={styles.field}>

                                            <label>
                                                Discount
                                                <span className={styles.optionalLabel}>
                                                    Optional
                                                </span>
                                            </label>

                                            <div className={styles.amountField}>

                                                <span>
                                                    AED
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    max={
                                                        discountMode === "after_tax"
                                                            ? afterTaxTotalBeforeDiscount
                                                            : grossAmount
                                                    }
                                                    value={discount}
                                                    onChange={event =>
                                                        setDiscount(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="0.00"
                                                />

                                            </div>

                                        </div>


                                        <div className={styles.field}>

                                            <label>
                                                Discount Applied
                                            </label>

                                            <select
                                                value={discountMode}
                                                onChange={event =>
                                                    setDiscountMode(
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                <option value="before_tax">
                                                    Before Tax
                                                </option>

                                                <option value="after_tax">
                                                    After Tax
                                                </option>
                                            </select>

                                        </div>
                                    </>
                                )}
                                {/* VAT */}

                                {type === "expense" && (

                                    <div
                                        className={
                                            styles.vatField
                                        }
                                    >

                                        <label>
                                            VAT
                                        </label>

                                        <div
                                            className={
                                                styles.vatInputWrapper
                                            }
                                        >

                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={
                                                    vatRate
                                                }
                                                onChange={
                                                    event =>
                                                        setVatRate(
                                                            event.target.value
                                                        )
                                                }
                                                placeholder="5"
                                            />

                                            <span>
                                                %
                                            </span>

                                        </div>

                                    </div>

                                )}

                            </div>


                            {/* CALCULATED TOTAL */}

                            {type === "expense" && (

                                <div
                                    className={
                                        styles.calculationSummary
                                    }
                                >

                                    <div>
                                        <span>
                                            Subtotal
                                        </span>

                                        <strong>
                                            AED{" "}
                                            {(
                                                Number(amount) ||
                                                0
                                            ).toLocaleString(
                                                "en-AE",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}
                                        </strong>
                                    </div>
                                    <div>

                                        <span>
                                            Discount
                                        </span>

                                        <strong className={styles.discountValue}>
                                            - AED{" "}
                                            {discountAmount.toLocaleString(
                                                "en-AE",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}
                                        </strong>

                                    </div>
                                    <div>

                                        <span>
                                            Taxable Amount
                                        </span>

                                        <strong>
                                            AED{" "}
                                            {taxableAmount.toLocaleString(
                                                "en-AE",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}
                                        </strong>

                                    </div>
                                    <div>
                                        <span>
                                            VAT (
                                            {
                                                Number(vatRate) ||
                                                0
                                            }%)
                                        </span>

                                        <strong>
                                            AED{" "}
                                            {vatAmount.toLocaleString(
                                                "en-AE",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}
                                        </strong>
                                    </div>


                                    <div
                                        className={
                                            styles.totalRow
                                        }
                                    >
                                        <span>
                                            Total
                                        </span>

                                        <strong>
                                            AED{" "}
                                            {totalAmount.toLocaleString(
                                                "en-AE",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}
                                        </strong>
                                    </div>

                                </div>

                            )}

                        </div>


                        {/* =================================
                            ACCOUNT
                        ================================= */}

                        {type !== "sale" && (

                            <div
                                className={
                                    styles.card
                                }
                            >

                                <div
                                    className={
                                        styles.sectionTitle
                                    }
                                >

                                    {type === "expense"
                                        ? "Expense Head"
                                        : type === "receipt"
                                            ? "Received Through"
                                            : "Paid Through"
                                    }

                                </div>


                                {type === "expense" ? (

                                    <div
                                        className={
                                            styles.field
                                        }
                                    >

                                        <label>
                                            Expense
                                        </label>

                                        <ExpenseSelector
                                            value={
                                                selectedExpense?.id ||
                                                null
                                            }
                                            onChange={
                                                id => {

                                                    setSelectedExpense(
                                                        id
                                                            ? { id }
                                                            : null
                                                    );

                                                }
                                            }
                                            placeholder={
                                                "Search expense..."
                                            }
                                        />

                                    </div>

                                ) : (

                                    <AccountSelector
                                        value={
                                            accountId
                                        }
                                        onChange={
                                            setAccountId
                                        }
                                        filter={
                                            account =>
                                                account.account_subtype ===
                                                "cash" ||
                                                account.account_subtype ===
                                                "bank"
                                        }
                                    />

                                )}

                            </div>

                        )}


                        {/* =================================
                            NARRATION
                        ================================= */}

                        <div
                            className={
                                styles.card
                            }
                        >

                            <div
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Narration
                            </div>

                            <textarea
                                rows={4}
                                value={
                                    narration
                                }
                                onChange={
                                    event =>
                                        setNarration(
                                            event.target.value
                                        )
                                }
                                placeholder={
                                    "Optional description..."
                                }
                            />

                        </div>


                        {/* =================================
                            MESSAGES
                        ================================= */}

                        {error && (

                            <div
                                className={
                                    styles.error
                                }
                            >
                                {error}
                            </div>

                        )}


                        {message && (

                            <div
                                className={
                                    styles.success
                                }
                            >

                                <Check
                                    size={17}
                                />

                                {message}

                            </div>

                        )}


                        {/* =================================
                            ACTIONS
                        ================================= */}

                        <div
                            className={
                                styles.actions
                            }
                        >

                            <button
                                type="submit"
                                disabled={saving}
                                className={
                                    styles.saveButton
                                }
                            >

                                <Save
                                    size={17}
                                />

                                {saving
                                    ? "Saving..."
                                    : `Save ${currentType.label}`
                                }

                            </button>

                        </div>

                    </form>


                    {/* =====================================
                        BILL PREVIEW
                    ===================================== */}

                    {showPreview && (

                        <aside
                            className={styles.previewPanel}
                        >

                            <div
                                className={
                                    styles.previewHeader
                                }
                            >

                                <div>

                                    <span
                                        className={
                                            styles.previewEyebrow
                                        }
                                    >
                                        {showSavedVoucher
                                            ? "SAVED VOUCHER"
                                            : "LIVE PREVIEW"
                                        }
                                    </span>

                                    <h2>
                                        {type === "expense"
                                            ? "Expense Voucher"
                                            : `${currentType.label} Voucher`
                                        }
                                    </h2>

                                </div>


                                {showSavedVoucher ? (

                                    <div className={styles.savedVoucherActions}>

                                        <button
                                            type="button"
                                            className={styles.printButton}
                                            onClick={printVoucher}
                                        >

                                            <FileText
                                                size={17}
                                            />

                                            Print / Save PDF

                                        </button>


                                        <button
                                            type="button"
                                            className={
                                                styles.closeVoucherButton
                                            }
                                            onClick={() => {

                                                setShowSavedVoucher(false);

                                                resetTransactionForm();

                                            }}
                                        >

                                            Close

                                        </button>

                                    </div>

                                ) : (

                                    <button
                                        type="button"
                                        className={
                                            styles.previewHideButton
                                        }
                                        onClick={() =>
                                            setShowPreview(false)
                                        }
                                        title="Hide preview"
                                    >

                                        <EyeOff
                                            size={17}
                                        />

                                        Hide

                                    </button>

                                )}

                            </div>


                            {/* PAPER */}

                            <div
                                className={
                                    styles.billPreview
                                }
                            >

                                {/* COMPANY */}

                                <div
                                    className={
                                        styles.billCompany
                                    }
                                >

                                    <div
                                        className={
                                            styles.companyLogo
                                        }
                                    >
                                        M
                                    </div>

                                    <div>

                                        <strong>
                                            MOHINII
                                        </strong>

                                        <span>
                                            ACCOUNTING
                                        </span>

                                    </div>

                                </div>


                                <div
                                    className={
                                        styles.billTitle
                                    }
                                >
                                    {type === "expense"
                                        ? "EXPENSE VOUCHER"
                                        : currentType.label.toUpperCase()
                                    }
                                </div>


                                {/* META */}

                                <div
                                    className={
                                        styles.billMeta
                                    }
                                >

                                    <div>

                                        <span>
                                            Date
                                        </span>

                                        <strong>
                                            {date
                                                ? new Date(
                                                    date +
                                                    "T00:00:00"
                                                ).toLocaleDateString(
                                                    "en-AE",
                                                    {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric"
                                                    }
                                                )
                                                : "-"
                                            }
                                        </strong>

                                    </div>


                                    {(type === "expense" || type === "payment") && (

                                        <div>

                                            <span>
                                                {type === "payment"
                                                    ? "Bill Reference"
                                                    : "Bill Reference"
                                                }
                                            </span>

                                            <strong>
                                                {type === "payment"
                                                    ? (
                                                        selectedPaymentExpense?.reference_number ||
                                                        (
                                                            selectedPaymentExpense?.id
                                                                ? `Voucher #${selectedPaymentExpense.id}`
                                                                : "—"
                                                        )
                                                    )
                                                    : (
                                                        referenceNumber ||
                                                        "—"
                                                    )
                                                }
                                            </strong>

                                        </div>

                                    )}

                                </div>


                                {/* PARTY */}

                                <div
                                    className={
                                        styles.billParty
                                    }
                                >

                                    <span>
                                        {
                                            type === "expense" ||
                                                type === "payment"
                                                ? "SUPPLIER"
                                                : "CUSTOMER"
                                        }
                                    </span>

                                    <strong>
                                        {
                                            party
                                                ? partyName
                                                : "—"
                                        }
                                    </strong>

                                </div>


                                {/* ITEMS */}

                                <div
                                    className={
                                        styles.billItems
                                    }
                                >

                                    <div
                                        className={
                                            styles.billItemsHeader
                                        }
                                    >

                                        <span>
                                            DESCRIPTION
                                        </span>

                                        <span>
                                            AMOUNT
                                        </span>

                                    </div>


                                    <div
                                        className={
                                            styles.billItem
                                        }
                                    >

                                        <span>

                                            {type === "expense"
                                                ? expenseName
                                                : type === "payment"
                                                    ? (
                                                        selectedPaymentExpense?.narration ||
                                                        "Supplier Payment"
                                                    )
                                                    : currentType.label
                                            }

                                        </span>

                                        <strong>
                                            AED{" "}
                                            {(
                                                type === "payment"
                                                    ? Number(paymentAmount) || 0
                                                    : Number(amount) || 0
                                            ).toLocaleString(
                                                "en-AE",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                {/* TOTALS */}

                                <div
                                    className={
                                        styles.billTotals
                                    }
                                >

                                    <div>
                                        {type === "payment" && selectedPaymentExpense && (

                                            <>
                                                <div>

                                                    <span>
                                                        Already Paid
                                                    </span>

                                                    <strong>
                                                        AED{" "}
                                                        {Number(
                                                            selectedPaymentExpense.paid_amount ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-AE",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Outstanding After Payment
                                                    </span>

                                                    <strong>
                                                        AED{" "}
                                                        {Math.max(
                                                            0,
                                                            Number(
                                                                selectedPaymentExpense
                                                                    .outstanding_amount || 0
                                                            ) -
                                                            (
                                                                Number(paymentAmount) || 0
                                                            )
                                                        ).toLocaleString(
                                                            "en-AE",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </strong>

                                                </div>
                                            </>

                                        )}
                                        <span>
                                            Subtotal
                                        </span>

                                        <strong>
                                            AED{" "}
                                            {(
                                                type === "payment"
                                                    ? Number(paymentAmount) || 0
                                                    : Number(amount) || 0
                                            ).toLocaleString(
                                                "en-AE",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}
                                        </strong>

                                    </div>

                                    {type === "expense" && discountAmount > 0 && (

                                        <div>

                                            <span>
                                                Discount
                                            </span>

                                            <strong>
                                                - AED{" "}
                                                {discountAmount.toLocaleString(
                                                    "en-AE",
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    }
                                                )}
                                            </strong>

                                        </div>

                                    )}
                                    {type === "expense" && (

                                        <div>

                                            <span>
                                                Taxable Amount
                                            </span>

                                            <strong>
                                                AED{" "}
                                                {taxableAmount.toLocaleString(
                                                    "en-AE",
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    }
                                                )}
                                            </strong>

                                        </div>

                                    )}
                                    {type === "expense" && (

                                        <div>

                                            <span>
                                                VAT (
                                                {
                                                    Number(vatRate) ||
                                                    0
                                                }%)
                                            </span>

                                            <strong>
                                                AED{" "}
                                                {vatAmount.toLocaleString(
                                                    "en-AE",
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    }
                                                )}
                                            </strong>

                                        </div>

                                    )}


                                    <div
                                        className={
                                            styles.billGrandTotal
                                        }
                                    >

                                        <span>
                                            TOTAL
                                        </span>

                                        <strong>
                                            AED{" "}
                                            {
                                                (
                                                    type === "expense"
                                                        ? totalAmount
                                                        : Number(amount) || 0
                                                ).toLocaleString(
                                                    "en-AE",
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    }
                                                )
                                            }
                                        </strong>

                                    </div>

                                </div>


                                {/* STATUS */}

                                {type === "expense" && (

                                    <div
                                        className={
                                            styles.pendingBadge
                                        }
                                    >

                                        PENDING PAYMENT

                                    </div>

                                )}


                                {/* NARRATION */}

                                {narration && (

                                    <div
                                        className={
                                            styles.billNarration
                                        }
                                    >

                                        <span>
                                            Notes
                                        </span>

                                        <p>
                                            {narration}
                                        </p>

                                    </div>

                                )}


                                <div
                                    className={
                                        styles.billFooter
                                    }
                                >
                                    This is a preview.
                                    The voucher is only
                                    created after saving.
                                </div>

                            </div>

                        </aside>

                    )}

                </div>


                {/* =========================================
                    SHOW PREVIEW BUTTON
                ========================================= */}

                {!showPreview && (

                    <button
                        type="button"
                        className={
                            styles.showPreviewButton
                        }
                        onClick={() =>
                            setShowPreview(true)
                        }
                    >

                        <Eye
                            size={17}
                        />

                        Show Preview

                    </button>

                )}

            </div>
            {showSavedVoucher && (

                <div className={styles.savedVoucherOverlay}>

                    <div className={styles.savedVoucherToolbar}>

                        <div>

                            <span>
                                SAVED VOUCHER
                            </span>

                            <strong>
                                {type === "payment"
                                    ? "Payment Voucher"
                                    : type === "expense"
                                        ? "Expense Voucher"
                                        : `${currentType.label} Voucher`
                                }
                            </strong>

                        </div>


                        <div className={styles.savedVoucherActions}>

                            <button
                                type="button"
                                className={
                                    styles.printVoucherButton
                                }
                                onClick={printVoucher}
                            >

                                <FileText
                                    size={17}
                                />

                                Print / Save PDF

                            </button>


                            <button
                                type="button"
                                className={
                                    styles.closeVoucherButton
                                }
                                onClick={
                                    closeSavedVoucher
                                }
                            >

                                Close

                            </button>

                        </div>

                    </div>


                    <div className={styles.printableVoucherPaper}>

                        <PrintableVoucher

                            type={type}

                            date={date}

                            party={party}

                            referenceNumber={
                                referenceNumber
                            }

                            amount={amount}

                            discountAmount={
                                discountAmount
                            }

                            vatRate={vatRate}

                            vatAmount={vatAmount}

                            totalAmount={totalAmount}

                            paymentAmount={
                                paymentAmount
                            }

                            paymentAccount={
                                accountId
                            }

                            selectedPaymentExpense={
                                selectedPaymentExpense
                            }

                            narration={
                                narration
                            }

                        />

                    </div>

                </div>

            )}
        </AppLayout>
    );
}