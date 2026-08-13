import React from "react";
import styles from "./PrintableVoucher.module.css";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function formatAmount(value) {
    const amount = Number(value || 0);

    return amount.toLocaleString("en-AE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDate(date) {
    if (!date) {
        return "—";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function clean(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "";
    }

    return String(value).trim();
}


/*
|--------------------------------------------------------------------------
| Number to Words
|--------------------------------------------------------------------------
*/

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
        result +=
            ones[Math.floor(number / 100)] +
            " Hundred";

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

    if (amount === 0) {
        return "Zero Dirhams Only";
    }

    const dirhams = Math.floor(amount);

    let fils = Math.round(
        (amount - dirhams) * 100
    );

    /*
     * Protect against rounding 99.999 -> 100 fils.
     */
    let wholeDirhams = dirhams;

    if (fils === 100) {
        wholeDirhams += 1;
        fils = 0;
    }

    let remaining = wholeDirhams;

    let words = "";

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

    words +=
        wholeDirhams === 1
            ? " Dirham"
            : " Dirhams";

    if (fils > 0) {
        words += ` and ${fils} Fils`;
    }

    return `${words} Only`;
}


/*
|--------------------------------------------------------------------------
| Party helpers
|--------------------------------------------------------------------------
*/

function getPartyName(party, selectedPaymentBill) {
    return (
        clean(party?.party_name) ||
        clean(party?.name) ||
        clean(party?.company_name) ||
        clean(party?.customer_name) ||
        clean(party?.supplier_name) ||
        clean(selectedPaymentBill?.party_name) ||
        "—"
    );
}

function getPartyAddress(party, selectedPaymentBill) {
    return (
        clean(party?.address) ||
        clean(party?.full_address) ||
        clean(party?.party_address) ||
        clean(selectedPaymentBill?.address) ||
        ""
    );
}

function getPartyPhone(party, selectedPaymentBill) {
    return (
        clean(party?.phone) ||
        clean(party?.phone_number) ||
        clean(party?.mobile) ||
        clean(party?.mobile_number) ||
        clean(selectedPaymentBill?.phone) ||
        ""
    );
}

function getPartyEmail(party, selectedPaymentBill) {
    return (
        clean(party?.email) ||
        clean(party?.email_address) ||
        clean(selectedPaymentBill?.email) ||
        ""
    );
}

function getPartyTrn(party, selectedPaymentBill) {
    return (
        clean(party?.trn) ||
        clean(party?.tax_registration_number) ||
        clean(party?.vat_number) ||
        clean(party?.tax_number) ||
        clean(selectedPaymentBill?.trn) ||
        ""
    );
}


/*
|--------------------------------------------------------------------------
| Item helpers
|--------------------------------------------------------------------------
*/

function normalizeItems(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.filter((item) => {
        const description =
            clean(
                item?.description ||
                item?.item_name ||
                item?.name
            );

        return Boolean(description);
    });
}

function getItemDescription(item) {
    return (
        clean(item?.description) ||
        clean(item?.item_name) ||
        clean(item?.name) ||
        "Item"
    );
}

function getItemQuantity(item) {
    const quantity =
        Number(
            item?.quantity ??
            item?.qty ??
            1
        );

    return quantity > 0 ? quantity : 1;
}

function getItemRate(item) {
    return Number(
        item?.rate ??
        item?.unit_price ??
        item?.price ??
        item?.default_rate ??
        0
    );
}

function getItemAmount(item) {
    if (
        item?.amount !== undefined &&
        item?.amount !== null &&
        item?.amount !== ""
    ) {
        return Number(item.amount) || 0;
    }

    return (
        getItemQuantity(item) *
        getItemRate(item)
    );
}


/*
|--------------------------------------------------------------------------
| Printable Voucher
|--------------------------------------------------------------------------
*/

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
    selectedPaymentBill,

    narration,

    /*
     * Optional company information.
     *
     * The current Transactions/SavedVoucher flow does not
     * pass this yet, so sensible defaults are used.
     *
     * Later we can pass the actual company record here.
     */
    company = {},
}) {

    /*
    |--------------------------------------------------------------------------
    | Transaction type
    |--------------------------------------------------------------------------
    */

    const isExpense =
        type === "expense";

    const isPayment =
        type === "payment";

    const isReceipt =
        type === "receipt";

    const isSale =
        type === "sale";


    /*
    |--------------------------------------------------------------------------
    | Document title
    |--------------------------------------------------------------------------
    */

    let documentTitle = "TRANSACTION VOUCHER";

    if (isExpense) {
        documentTitle = "EXPENSE VOUCHER";
    }

    if (isPayment) {
        documentTitle = "PAYMENT VOUCHER";
    }

    if (isReceipt) {
        documentTitle = "RECEIPT";
    }

    if (isSale) {
        documentTitle = "SALES INVOICE";
    }


    /*
    |--------------------------------------------------------------------------
    | Company
    |--------------------------------------------------------------------------
    */

    const companyName =
        clean(company?.name) ||
        clean(company?.company_name) ||
        "MOHINII GENERAL TRADING L.L.C";

    const companyAddress =
        clean(company?.address) ||
        clean(company?.full_address) ||
        "Dubai, United Arab Emirates";

    const companyPhone =
        clean(company?.phone) ||
        clean(company?.phone_number) ||
        "";

    const companyEmail =
        clean(company?.email) ||
        clean(company?.email_address) ||
        "";

    const companyTrn =
        clean(company?.trn) ||
        clean(company?.tax_registration_number) ||
        clean(company?.vat_number) ||
        "";

    const companyLogo =
        clean(company?.logo) ||
        clean(company?.logo_url) ||
        "";


    /*
    |--------------------------------------------------------------------------
    | Party
    |--------------------------------------------------------------------------
    */

    const partyName =
        getPartyName(
            party,
            selectedPaymentBill
        );

    const partyAddress =
        getPartyAddress(
            party,
            selectedPaymentBill
        );

    const partyPhone =
        getPartyPhone(
            party,
            selectedPaymentBill
        );

    const partyEmail =
        getPartyEmail(
            party,
            selectedPaymentBill
        );

    const partyTrn =
        getPartyTrn(
            party,
            selectedPaymentBill
        );


    /*
    |--------------------------------------------------------------------------
    | Reference / Bill Number
    |--------------------------------------------------------------------------
    |
    | Bill No. = OUR document number
    |
    | Reference No. = supplier/customer reference
    |
    */

    const ourBillNumber =
        clean(voucherNumber) ||
        clean(
            selectedPaymentBill?.voucher_number
        ) ||
        clean(
            selectedPaymentBill?.voucher_no
        ) ||
        "—";

    const externalReference =
        clean(
            isPayment
                ? selectedPaymentBill?.reference_number
                : referenceNumber
        ) ||
        "—";


    /*
    |--------------------------------------------------------------------------
    | Amounts
    |--------------------------------------------------------------------------
    */

    const expenseItems =
        normalizeItems(items);

    const calculatedItemSubtotal =
        expenseItems.reduce(
            (sum, item) =>
                sum + getItemAmount(item),
            0
        );

    const subtotal =
        calculatedItemSubtotal > 0
            ? calculatedItemSubtotal
            : Number(amount || 0);

    const discount =
        Number(discountAmount || 0);

    const vat =
        Number(vatAmount || 0);

    const transactionAmount =
        Number(amount || 0);

    const paymentTotal =
        Number(paymentAmount || 0);

    const expenseTotal =
        Number(totalAmount || 0);

    let finalAmount = 0;

    if (isPayment) {
        finalAmount = paymentTotal;
    } else if (isExpense) {
        finalAmount =
            expenseTotal ||
            Math.max(
                0,
                subtotal - discount + vat
            );
    } else {
        finalAmount =
            Number(totalAmount || 0) ||
            transactionAmount;
    }


    /*
    |--------------------------------------------------------------------------
    | Payment details
    |--------------------------------------------------------------------------
    */

    const originalBill =
        Number(
            selectedPaymentBill?.amount ??
            selectedPaymentBill?.total_amount ??
            selectedPaymentBill?.bill_amount ??
            0
        );

    const alreadyPaid =
        Number(
            selectedPaymentBill?.paid_amount ||
            0
        );

    const currentOutstanding =
        Number(
            selectedPaymentBill?.outstanding_amount ||
            0
        );

    const outstandingAfterPayment =
        Math.max(
            0,
            currentOutstanding -
            paymentTotal
        );

    const paymentMethod =
        clean(paymentAccount?.account_name) ||
        clean(paymentAccount?.name) ||
        clean(paymentAccount) ||
        "—";


    /*
    |--------------------------------------------------------------------------
    | Description
    |--------------------------------------------------------------------------
    */

    let defaultDescription = "Transaction";

    if (isExpense) {
        defaultDescription = "Purchase / Expense";
    }

    if (isPayment) {
        defaultDescription =
            externalReference !== "—"
                ? `Payment to ${partyName} against Bill ${externalReference}`
                : `Payment to ${partyName}`;
    }

    if (isReceipt) {
        defaultDescription =
            "Receipt from Customer";
    }

    if (isSale) {
        defaultDescription =
            "Sale";
    }

    const description =
        clean(narration) ||
        defaultDescription;


    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <div className={styles.voucher}>

            {/* =====================================================
                HEADER
            ===================================================== */}

            <header className={styles.documentHeader}>

                <div className={styles.companyIdentity}>

                    {companyLogo ? (
                        <img
                            src={companyLogo}
                            alt={companyName}
                            className={styles.companyLogo}
                        />
                    ) : (
                        <div
                            className={
                                styles.companyLogoPlaceholder
                            }
                        >
                            M
                        </div>
                    )}

                    <div
                        className={
                            styles.companyInformation
                        }
                    >

                        <h1>
                            {companyName}
                        </h1>

                        <div>
                            {companyAddress}
                        </div>

                        {companyPhone && (
                            <div>
                                Tel: {companyPhone}
                            </div>
                        )}

                        {companyEmail && (
                            <div>
                                {companyEmail}
                            </div>
                        )}

                        {companyTrn && (
                            <div>
                                TRN: {companyTrn}
                            </div>
                        )}

                    </div>

                </div>


                {/* =================================================
                    PARTY / SUPPLIER
                ================================================= */}

                <div className={styles.partyInformation}>

                    <div
                        className={
                            styles.partyInformationLabel
                        }
                    >
                        {isSale || isReceipt
                            ? "CUSTOMER"
                            : "SUPPLIER"
                        }
                    </div>

                    <strong>
                        {partyName}
                    </strong>

                    {partyAddress && (
                        <span>
                            {partyAddress}
                        </span>
                    )}

                    {partyPhone && (
                        <span>
                            Tel: {partyPhone}
                        </span>
                    )}

                    {partyEmail && (
                        <span>
                            {partyEmail}
                        </span>
                    )}

                    {partyTrn && (
                        <span>
                            TRN: {partyTrn}
                        </span>
                    )}

                </div>

            </header>


            {/* =====================================================
                TITLE
            ===================================================== */}

            <section className={styles.titleSection}>

                <div>
                    <span className={styles.documentEyebrow}>
                        ACCOUNTING DOCUMENT
                    </span>

                    <h2>
                        {documentTitle}
                    </h2>
                </div>

                <div
                    className={
                        styles.documentStatus
                    }
                >
                    ORIGINAL
                </div>

            </section>


            {/* =====================================================
                DOCUMENT DETAILS
            ===================================================== */}

            <section
                className={`${styles.documentDetails} ${isPayment
                    ? styles.paymentDocumentDetails
                    : ""
                    }`}
            >

                <div>

                    <span>
                        DATE
                    </span>

                    <strong>
                        {formatDate(date)}
                    </strong>

                </div>


                <div>

                    <span>
                        BILL NO.
                    </span>

                    <strong>
                        {ourBillNumber}
                    </strong>

                </div>


                {!isSale && (
                    <div>

                        <span>
                            REFERENCE NO.
                        </span>

                        <strong>
                            {externalReference}
                        </strong>

                    </div>
                )}

                {isPayment && (
                    <div>

                        <span>
                            PAYMENT METHOD
                        </span>

                        <strong>
                            {paymentMethod}
                        </strong>

                    </div>
                )}

            </section>


            {/* =====================================================
                ITEMS / PARTICULARS
            ===================================================== */}

            <section className={styles.itemsSection}>

                <table
                    className={
                        isSale
                            ? `${styles.itemsTable} ${styles.salesItemsTable}`
                            : styles.itemsTable
                    }
                >

                    <thead>
                        <tr>

                            <th
                                className={styles.serialColumn}
                            >
                                #
                            </th>

                            <th>
                                {isSale
                                    ? "SERVICE"
                                    : "PARTICULARS"}
                            </th>

                            {!isSale && (
                                <>
                                    <th
                                        className={
                                            styles.quantityColumn
                                        }
                                    >
                                        QTY
                                    </th>

                                    <th
                                        className={
                                            styles.rateColumn
                                        }
                                    >
                                        RATE
                                    </th>
                                </>
                            )}

                            <th
                                className={
                                    styles.amountColumn
                                }
                            >
                                AMOUNT
                            </th>

                        </tr>
                    </thead>


                    <tbody>

                        {expenseItems.length > 0 ? (

                            expenseItems.map(
                                (item, index) => {

                                    const quantity =
                                        getItemQuantity(item);

                                    const rate =
                                        getItemRate(item);

                                    const lineAmount =
                                        getItemAmount(item) ||
                                        (isSale && expenseItems.length === 1
                                            ? finalAmount
                                            : 0);

                                    return (

                                        <tr
                                            key={
                                                item.id ??
                                                item.customerServiceId ??
                                                index
                                            }
                                        >

                                            <td
                                                className={
                                                    styles.serialCell
                                                }
                                            >
                                                {index + 1}
                                            </td>

                                            <td>

                                                <div
                                                    className={
                                                        styles.itemDescription
                                                    }
                                                >
                                                    {
                                                        getItemDescription(
                                                            item
                                                        )
                                                    }
                                                </div>

                                                {isPayment &&
                                                    externalReference !==
                                                    "—" && (

                                                        <div
                                                            className={
                                                                styles.itemSubtext
                                                            }
                                                        >
                                                            Bill Reference:{" "}
                                                            {
                                                                externalReference
                                                            }
                                                        </div>

                                                    )}

                                            </td>

                                            {isSale ? (

                                                <td
                                                    className={
                                                        styles.numberCell
                                                    }
                                                >
                                                    AED{" "}
                                                    {formatAmount(
                                                        lineAmount
                                                    )}
                                                </td>

                                            ) : (

                                                <>

                                                    <td
                                                        className={
                                                            styles.numberCell
                                                        }
                                                    >
                                                        {quantity}
                                                    </td>

                                                    <td
                                                        className={
                                                            styles.numberCell
                                                        }
                                                    >
                                                        AED{" "}
                                                        {formatAmount(
                                                            rate
                                                        )}
                                                    </td>

                                                    <td
                                                        className={
                                                            styles.numberCell
                                                        }
                                                    >
                                                        AED{" "}
                                                        {formatAmount(
                                                            lineAmount
                                                        )}
                                                    </td>

                                                </>

                                            )}

                                        </tr>

                                    );

                                }
                            )

                        ) : (

                            <tr>

                                <td
                                    className={
                                        styles.serialCell
                                    }
                                >
                                    1
                                </td>


                                <td>

                                    <div
                                        className={
                                            styles.itemDescription
                                        }
                                    >
                                        {description}
                                    </div>


                                    {isPayment &&
                                        externalReference !==
                                        "—" && (

                                            <div
                                                className={
                                                    styles.itemSubtext
                                                }
                                            >
                                                Bill Reference:{" "}
                                                {
                                                    externalReference
                                                }
                                            </div>

                                        )}

                                </td>


                                {isSale ? (

                                    <td
                                        className={
                                            styles.numberCell
                                        }
                                    >
                                        AED{" "}
                                        {formatAmount(
                                            finalAmount
                                        )}
                                    </td>

                                ) : (

                                    <>

                                        <td
                                            className={
                                                styles.numberCell
                                            }
                                        >
                                            —
                                        </td>

                                        <td
                                            className={
                                                styles.numberCell
                                            }
                                        >
                                            —
                                        </td>

                                        <td
                                            className={
                                                styles.numberCell
                                            }
                                        >
                                            AED{" "}
                                            {formatAmount(
                                                finalAmount
                                            )}
                                        </td>

                                    </>

                                )}

                            </tr>

                        )}

                    </tbody>

                </table>

            </section>


            {/* =====================================================
                EXPENSE TOTALS
            ===================================================== */}

            {isExpense && (

                <section
                    className={
                        styles.totalsSection
                    }
                >

                    <div className={styles.totalRow}>

                        <span>
                            Subtotal
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                subtotal
                            )}
                        </strong>

                    </div>


                    <div className={styles.totalRow}>

                        <span>
                            Discount
                        </span>

                        <strong>
                            - AED{" "}
                            {formatAmount(
                                discount
                            )}
                        </strong>

                    </div>


                    <div className={styles.totalRow}>

                        <span>
                            Taxable Amount
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                Math.max(
                                    0,
                                    subtotal -
                                    discount
                                )
                            )}
                        </strong>

                    </div>


                    <div className={styles.totalRow}>

                        <span>
                            VAT ({Number(vatRate || 0)}%)
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                vat
                            )}
                        </strong>

                    </div>


                    <div
                        className={
                            styles.grandTotalRow
                        }
                    >

                        <span>
                            TOTAL
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                finalAmount
                            )}
                        </strong>

                    </div>

                </section>

            )}


            {/* =====================================================
    SALE TOTALS
===================================================== */}

            {isSale && (

                <section
                    className={styles.totalsSection}
                >

                    <div
                        className={styles.totalRow}
                    >

                        <span>
                            Subtotal
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                subtotal
                            )}
                        </strong>

                    </div>


                    <div
                        className={styles.totalRow}
                    >

                        <span>
                            Discount
                        </span>

                        <strong>
                            - AED{" "}
                            {formatAmount(
                                discount
                            )}
                        </strong>

                    </div>


                    <div
                        className={styles.totalRow}
                    >

                        <span>
                            Taxable Amount
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                Math.max(
                                    0,
                                    subtotal -
                                    discount
                                )
                            )}
                        </strong>

                    </div>


                    <div
                        className={styles.totalRow}
                    >

                        <span>
                            VAT ({Number(vatRate || 0)}%)
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                vat
                            )}
                        </strong>

                    </div>


                    <div
                        className={
                            styles.grandTotalRow
                        }
                    >

                        <span>
                            TOTAL
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                finalAmount
                            )}
                        </strong>

                    </div>

                </section>

            )}


            {/* =====================================================
    RECEIPT TOTAL
===================================================== */}

            {isReceipt && (

                <section
                    className={
                        styles.singleTotalSection
                    }
                >

                    <div
                        className={
                            styles.grandTotalRow
                        }
                    >

                        <span>
                            TOTAL
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                finalAmount
                            )}
                        </strong>

                    </div>

                </section>

            )}


            {/* =====================================================
                PAYMENT SUMMARY
            ===================================================== */}

            {isPayment && (

                <section
                    className={
                        styles.paymentSummary
                    }
                >

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


                    <div
                        className={
                            styles.paymentBalance
                        }
                    >

                        <span>
                            Balance Due
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                outstandingAfterPayment
                            )}
                        </strong>

                    </div>


                    <div
                        className={
                            styles.paymentTotal
                        }
                    >

                        <span>
                            TOTAL PAID
                        </span>

                        <strong>
                            AED{" "}
                            {formatAmount(
                                paymentTotal
                            )}
                        </strong>

                    </div>

                </section>

            )}


            {/* =====================================================
                AMOUNT IN WORDS
            ===================================================== */}

            <section
                className={
                    styles.amountWordsSection
                }
            >

                <span>
                    AMOUNT IN WORDS
                </span>

                <strong>
                    {numberToWords(
                        finalAmount
                    )}
                </strong>

            </section>


            {/* =====================================================
                NOTES
            ===================================================== */}

            {narration && (

                <section
                    className={
                        styles.notesSection
                    }
                >

                    <span>
                        NOTES
                    </span>

                    <p>
                        {narration}
                    </p>

                </section>

            )}


            {/* =====================================================
                SIGNATURES
            ===================================================== */}

            <section
                className={
                    styles.signatureSection
                }
            >

                <div
                    className={
                        styles.signatureBox
                    }
                >

                    <div
                        className={
                            styles.signatureLine
                        }
                    />

                    <strong>
                        Prepared By
                    </strong>

                    <span>
                        Name / Signature
                    </span>

                </div>


                <div
                    className={
                        styles.signatureBox
                    }
                >

                    <div
                        className={
                            styles.signatureLine
                        }
                    />

                    <strong>
                        Checked By
                    </strong>

                    <span>
                        Name / Signature
                    </span>

                </div>


                <div
                    className={
                        styles.signatureBox
                    }
                >

                    <div
                        className={
                            styles.signatureLine
                        }
                    />

                    <strong>
                        Authorised Signatory
                    </strong>

                    <span>
                        Name / Signature
                    </span>

                </div>

            </section>


            {/* =====================================================
                FOOTER
            ===================================================== */}

            <footer
                className={
                    styles.documentFooter
                }
            >

                <span>
                    {companyName}
                </span>

                <span>
                    This is a computer-generated document.
                </span>

            </footer>

        </div>
    );
}