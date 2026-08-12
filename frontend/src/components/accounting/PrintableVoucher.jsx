import React from "react";
import styles from "./PrintableVoucher.module.css";


function formatAmount(value) {
    return Number(value || 0).toLocaleString("en-AE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}


function numberToWordsBelowThousand(number) {
    const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ];

    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ];

    let result = "";

    if (number >= 100) {
        result += ones[Math.floor(number / 100)] + " Hundred";
        number %= 100;

        if (number > 0) {
            result += " ";
        }
    }

    if (number >= 20) {
        result += tens[Math.floor(number / 10)];
        number %= 10;

        if (number > 0) {
            result += "-" + ones[number];
        }
    } else if (number > 0) {
        result += ones[number];
    }

    return result;
}


function numberToWords(value) {
    const amount = Number(value || 0);

    const dirhams = Math.floor(amount);

    const fils = Math.round(
        (amount - dirhams) * 100
    );

    let words = "";

    if (dirhams === 0) {
        words = "Zero";
    } else {
        let remaining = dirhams;

        if (remaining >= 1000000) {
            const millions =
                Math.floor(remaining / 1000000);

            words +=
                numberToWordsBelowThousand(millions) +
                " Million";

            remaining %= 1000000;

            if (remaining > 0) {
                words += " ";
            }
        }

        if (remaining >= 1000) {
            const thousands =
                Math.floor(remaining / 1000);

            words +=
                numberToWordsBelowThousand(thousands) +
                " Thousand";

            remaining %= 1000;

            if (remaining > 0) {
                words += " ";
            }
        }

        if (remaining > 0) {
            words +=
                numberToWordsBelowThousand(
                    remaining
                );
        }
    }

    words +=
        dirhams === 1
            ? " Dirham"
            : " Dirhams";

    if (fils > 0) {
        words += ` and ${fils} Fils`;
    }

    return `${words} Only`;
}


function formatDate(date) {
    if (!date) {
        return "";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return parsed.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}


export default function PrintableVoucher({
    type,
    date,
    party,
    referenceNumber,
    voucherNumber,
    items = [],
    amount,
    discountAmount = 0,
    vatRate = 0,
    vatAmount = 0,
    totalAmount,
    paymentAmount,
    paymentAccount,
    selectedPaymentExpense,
    narration,
}) {

    const isPayment =
        type === "payment";

    const isExpense =
        type === "expense";


    /*
     * ---------------------------------------------------------
     * BASIC DATA
     * ---------------------------------------------------------
     */

    const supplierReference =
        referenceNumber ||
        "—";

    const reference =
        isPayment
            ? (
                selectedPaymentExpense
                    ?.reference_number ||
                referenceNumber ||
                "—"
            )
            : (
                voucherNumber ||
                "—"
            );


    const supplierName =
        party?.party_name ||
        selectedPaymentExpense?.party_name ||
        "—";


    /*
     * ---------------------------------------------------------
     * AMOUNTS
     * ---------------------------------------------------------
     */

    const expenseAmount =
        Number(amount || 0);

    const discount =
        Number(discountAmount || 0);

    const vat =
        Number(vatAmount || 0);

    const expenseTotal =
        Number(totalAmount || 0);

    const paymentTotal =
        Number(paymentAmount || 0);

    const finalAmount =
        isPayment
            ? paymentTotal
            : expenseTotal;


    /*
     * ---------------------------------------------------------
     * PAYMENT INFORMATION
     * ---------------------------------------------------------
     */

    const originalBill =
        Number(
            selectedPaymentExpense
                ?.total_amount ||
            selectedPaymentExpense
                ?.amount ||
            0
        );


    const alreadyPaid =
        Number(
            selectedPaymentExpense
                ?.paid_amount ||
            0
        );


    const currentOutstanding =
        Number(
            selectedPaymentExpense
                ?.outstanding_amount ||
            0
        );


    const outstandingAfterPayment =
        Math.max(
            0,
            currentOutstanding -
            paymentTotal
        );


    /*
     * ---------------------------------------------------------
     * PAYMENT METHOD
     * ---------------------------------------------------------
     */

    const paymentMethod =
        paymentAccount?.account_name ||
        paymentAccount?.name ||
        paymentAccount ||
        "—";


    /*
     * ---------------------------------------------------------
     * DESCRIPTION
     * ---------------------------------------------------------
     */

    const description =
        isPayment
            ? (
                narration ||
                `Payment against Bill ${reference}`
            )
            : (
                narration ||
                "Expense"
            );

    const expenseItems = Array.isArray(items)
        ? items.filter(item => String(item?.description || "").trim())
        : [];


    return (

        <div className={styles.voucher}>

            {/* =================================================
                COMPANY HEADER
            ================================================= */}

            <div className={styles.companyHeader}>

                <div className={styles.companyName}>
                    MOHINII GENERAL TRADING L.L.C
                </div>

                <div className={styles.companyLocation}>
                    DUBAI
                </div>

                <div className={styles.companyEmirate}>
                    Emirate : Dubai
                </div>

            </div>


            {/* =================================================
                VOUCHER TITLE
            ================================================= */}

            <div className={styles.voucherTitle}>

                {isPayment
                    ? "Payment Voucher"
                    : isExpense
                        ? "Expense Voucher"
                        : "Transaction Voucher"
                }

            </div>


            {/* =================================================
                NUMBER / DATE
            ================================================= */}

            <div className={styles.topDetails}>

                <div className={styles.numberBlock}>

                    <span>
                        No.
                    </span>

                    <span>
                        :
                    </span>

                    <strong>
                        {reference}
                    </strong>

                </div>


                <div className={styles.dateBlock}>

                    <span>
                        Dated
                    </span>

                    <span>
                        :
                    </span>

                    <strong>
                        {formatDate(date)}
                    </strong>

                </div>

            </div>


            {/* =================================================
                PAYMENT THROUGH
            ================================================= */}

            {isPayment && (

                <div className={styles.throughRow}>

                    <strong>
                        Through :
                    </strong>

                    <span>
                        {paymentMethod}
                    </span>

                </div>

            )}


            {/* =================================================
                SUPPLIER
            ================================================= */}

            <div className={styles.accountSection}>

                <div className={styles.accountLabel}>
                    Account :
                </div>

                <div className={styles.accountDetails}>

                    <strong>
                        {supplierName}
                    </strong>

                    {isExpense && supplierReference !== "—" && (
                        <span>
                            Supplier Bill / Reference : {supplierReference}
                        </span>
                    )}

                    {isPayment && reference && (
                        <span>
                            ({reference})
                        </span>
                    )}

                </div>

            </div>


            {/* =================================================
                PARTICULARS TABLE
            ================================================= */}

            <table className={styles.particularsTable}>

                <thead>

                    <tr>

                        <th>
                            Particulars
                        </th>

                        <th>
                            Amount
                        </th>

                    </tr>

                </thead>


                <tbody>
                    {isExpense ? (
                        expenseItems.length > 0 ? (
                            expenseItems.map((item, index) => {
                                const quantity = Number(item.quantity) || 0;
                                const rate = Number(item.rate) || 0;
                                const lineTotal = quantity * rate;

                                return (
                                    <tr key={item.id || index}>
                                        <td>
                                            <div className={styles.description}>
                                                {item.description}
                                                {quantity > 0 && (
                                                    <span className={styles.itemMeta}>
                                                        {`  × ${quantity} @ AED ${formatAmount(rate)}`}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.amountCell}>
                                            AED {formatAmount(lineTotal)}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td>No items</td>
                                <td className={styles.amountCell}>AED 0.00</td>
                            </tr>
                        )
                    ) : (
                        <tr>
                            <td>
                                <div className={styles.description}>
                                    {description}
                                </div>

                                {isPayment && selectedPaymentExpense && (
                                    <div className={styles.billReference}>
                                        Bill Reference : {reference}
                                    </div>
                                )}
                            </td>

                            <td className={styles.amountCell}>
                                AED {formatAmount(paymentTotal)}
                            </td>
                        </tr>
                    )}

                    {isExpense && (
                        <tr className={styles.summaryRow}>
                            <td>Subtotal</td>
                            <td className={styles.amountCell}>
                                AED {formatAmount(
                                    expenseItems.reduce(
                                        (sum, item) =>
                                            sum +
                                            (Number(item.quantity) || 0) *
                                            (Number(item.rate) || 0),
                                        0
                                    )
                                )}
                            </td>
                        </tr>
                    )}

                    {isExpense && discount > 0 && (
                        <tr className={styles.summaryRow}>
                            <td>Less : Discount</td>
                            <td className={styles.amountCell}>
                                - AED {formatAmount(discount)}
                            </td>
                        </tr>
                    )}

                    {isExpense && (
                        <tr className={styles.summaryRow}>
                            <td>VAT ({vatRate}%)</td>
                            <td className={styles.amountCell}>
                                AED {formatAmount(vat)}
                            </td>
                        </tr>
                    )}

                    {isExpense && (
                        <tr className={styles.grandTotalRow}>
                            <td>Total</td>
                            <td className={styles.amountCell}>
                                AED {formatAmount(expenseTotal)}
                            </td>
                        </tr>
                    )}
                </tbody>

            </table>


            {/* =================================================
                PAYMENT BALANCE
            ================================================= */}

            {isPayment && (

                <div className={styles.paymentSummary}>

                    <div>

                        <span>
                            Bill Amount
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                originalBill
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Previously Paid
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                alreadyPaid
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            This Payment
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                paymentTotal
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Balance
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                outstandingAfterPayment
                            )}
                        </strong>

                    </div>

                </div>

            )}


            {/* =================================================
                TOTAL
            ================================================= */}

            {isPayment && (
                <div className={styles.totalRow}>
                    <span>Total</span>
                    <strong>
                        AED {formatAmount(finalAmount)}
                    </strong>
                </div>
            )}


            {/* =================================================
                AMOUNT IN WORDS
            ================================================= */}

            <div className={styles.amountWords}>

                <strong>
                    Amount (in words) :
                </strong>

                <span>
                    {numberToWords(
                        finalAmount
                    )}
                </span>

            </div>


            {/* =================================================
                SIGNATURES
            ================================================= */}

            <div className={styles.signatureArea}>

                <div className={styles.receiverSignature}>

                    <span>
                        Receiver's Signature:
                    </span>

                    <div />

                </div>


                <div className={styles.authorisedSignature}>

                    <span>
                        Authorised Signatory
                    </span>

                    <div />

                </div>

            </div>

        </div>

    );
}