import { Eye, EyeOff, FileText } from "lucide-react";

import ExpenseSummary from "./ExpenseSummary";

import styles from "../../Transactions.module.css";


function formatDate(date) {

    if (!date) {
        return "—";
    }

    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString(
        "en-AE",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function formatMoney(value) {

    return (
        Number(value) || 0
    ).toLocaleString(
        "en-AE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function getSupplierAddress(party) {

    if (!party) {
        return "";
    }

    return (
        party.address ||
        party.address_line_1 ||
        party.address1 ||
        party.company_address ||
        party.billing_address ||
        ""
    );

}


function getSupplierCity(party) {

    if (!party) {
        return "";
    }

    return (
        party.city ||
        party.emirate ||
        party.location ||
        ""
    );

}


function getSupplierPhone(party) {

    if (!party) {
        return "";
    }

    return (
        party.phone ||
        party.phone_number ||
        party.mobile ||
        party.contact_number ||
        ""
    );

}


function getSupplierEmail(party) {

    if (!party) {
        return "";
    }

    return (
        party.email ||
        party.email_address ||
        ""
    );

}


function getSupplierTrn(party) {

    if (!party) {
        return "";
    }

    return (
        party.trn ||
        party.tax_registration_number ||
        party.tax_number ||
        ""
    );

}


export default function ExpensePreview({

    date,

    party,

    partyName,

    referenceNumber,

    voucherNumber,

    items = [],

    subtotal = 0,

    discountAmount = 0,

    taxableAmount = 0,

    vatRate = 0,

    vatAmount = 0,

    totalAmount = 0,

    narration,

    showPreview,

    setShowPreview,

    showSavedVoucher,

    printVoucher,

    company = {}

}) {


    if (!showPreview) {

        return (

            <button
                type="button"
                className={
                    styles.showPreviewButton
                }
                onClick={() =>
                    setShowPreview(true)
                }
            >

                <Eye size={17} />

                Show Preview

            </button>

        );

    }


    const supplierAddress =
        getSupplierAddress(
            party
        );

    const supplierCity =
        getSupplierCity(
            party
        );

    const supplierPhone =
        getSupplierPhone(
            party
        );

    const supplierEmail =
        getSupplierEmail(
            party
        );

    const supplierTrn =
        getSupplierTrn(
            party
        );


    const companyName =
        company?.name ||
        company?.company_name ||
        company?.legal_name ||
        "Company Name";


    const companyAddress =
        company?.address ||
        company?.company_address ||
        company?.address_line_1 ||
        "";


    const companyPhone =
        company?.phone ||
        company?.phone_number ||
        company?.contact_number ||
        "";


    const companyEmail =
        company?.email ||
        company?.email_address ||
        "";


    const companyTrn =
        company?.trn ||
        company?.tax_registration_number ||
        "";


    const companyLogo =
        company?.logo ||
        company?.logo_url ||
        company?.logo_path ||
        null;


    return (

        <aside
            className={
                styles.previewPanel
            }
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
                        Expense Voucher
                    </h2>

                </div>


                {showSavedVoucher ? (

                    <button
                        type="button"
                        className={
                            styles.printButton
                        }
                        onClick={
                            printVoucher
                        }
                    >

                        <FileText
                            size={17}
                        />

                        Print / Save PDF

                    </button>

                ) : (

                    <button
                        type="button"
                        className={
                            styles.previewHideButton
                        }
                        onClick={() =>
                            setShowPreview(
                                false
                            )
                        }
                    >

                        <EyeOff
                            size={17}
                        />

                        Hide

                    </button>

                )}

            </div>


            {/* =================================================
                PRINTABLE PAPER
            ================================================= */}

            <div
                className={
                    styles.billPreview
                }
            >


                {/* =================================================
                    HEADER
                ================================================= */}

                <header
                    className={
                        styles.documentHeader
                    }
                >

                    {/* COMPANY */}

                    <div
                        className={
                            styles.documentCompany
                        }
                    >

                        <div
                            className={
                                styles.documentLogo
                            }
                        >

                            {companyLogo ? (

                                <img
                                    src={companyLogo}
                                    alt={
                                        companyName
                                    }
                                />

                            ) : (

                                <span>
                                    {companyName
                                        .charAt(0)
                                        .toUpperCase()
                                    }
                                </span>

                            )}

                        </div>


                        <div
                            className={
                                styles.documentCompanyInfo
                            }
                        >

                            <strong>
                                {companyName}
                            </strong>


                            {companyAddress && (

                                <span>
                                    {companyAddress}
                                </span>

                            )}


                            {companyPhone && (

                                <span>
                                    {companyPhone}
                                </span>

                            )}


                            {companyEmail && (

                                <span>
                                    {companyEmail}
                                </span>

                            )}


                            {companyTrn && (

                                <span>
                                    TRN: {companyTrn}
                                </span>

                            )}

                        </div>

                    </div>


                    {/* SUPPLIER */}

                    <div
                        className={
                            styles.documentSupplier
                        }
                    >

                        <span
                            className={
                                styles.documentLabel
                            }
                        >
                            SUPPLIER
                        </span>


                        <strong>
                            {party
                                ? partyName
                                : "—"
                            }
                        </strong>


                        {supplierAddress && (

                            <span>
                                {supplierAddress}
                            </span>

                        )}


                        {supplierCity && (

                            <span>
                                {supplierCity}
                            </span>

                        )}


                        {supplierPhone && (

                            <span>
                                {supplierPhone}
                            </span>

                        )}


                        {supplierEmail && (

                            <span>
                                {supplierEmail}
                            </span>

                        )}


                        {supplierTrn && (

                            <span>
                                TRN: {supplierTrn}
                            </span>

                        )}

                    </div>

                </header>


                {/* =================================================
                    TITLE
                ================================================= */}

                <div
                    className={
                        styles.documentTitleRow
                    }
                >

                    <div>

                        <span>
                            ACCOUNTING DOCUMENT
                        </span>

                        <h1>
                            EXPENSE VOUCHER
                        </h1>

                    </div>

                </div>


                {/* =================================================
                    DOCUMENT META
                ================================================= */}

                <div
                    className={
                        styles.documentMeta
                    }
                >

                    <div>

                        <span>
                            Date
                        </span>

                        <strong>
                            {formatDate(date)}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Bill No.
                        </span>

                        <strong>
                            {voucherNumber || "—"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Reference No.
                        </span>

                        <strong>
                            {referenceNumber || "—"}
                        </strong>

                    </div>

                </div>


                {/* =================================================
                    PARTICULARS
                ================================================= */}

                <section
                    className={
                        styles.documentItems
                    }
                >

                    <div
                        className={
                            styles.documentItemsHeader
                        }
                    >

                        <span>
                            #
                        </span>

                        <span>
                            PARTICULARS
                        </span>

                        <span>
                            QTY
                        </span>

                        <span>
                            RATE
                        </span>

                        <span>
                            AMOUNT
                        </span>

                    </div>


                    {items.length === 0 ? (

                        <div
                            className={
                                styles.documentItem
                            }
                        >

                            <span>
                                —
                            </span>

                            <span>
                                No items added
                            </span>

                            <span>
                                —
                            </span>

                            <span>
                                —
                            </span>

                            <strong>
                                AED 0.00
                            </strong>

                        </div>

                    ) : (

                        items.map(
                            (item, index) => {

                                const quantity =
                                    Number(
                                        item.quantity
                                    ) || 0;


                                const rate =
                                    Number(
                                        item.rate
                                    ) || 0;


                                const amount =
                                    quantity *
                                    rate;


                                return (

                                    <div
                                        className={
                                            styles.documentItem
                                        }
                                        key={
                                            item.id
                                        }
                                    >

                                        <span>
                                            {index + 1}
                                        </span>


                                        <span
                                            className={
                                                styles.documentItemDescription
                                            }
                                        >

                                            <strong>
                                                {
                                                    item.description ||
                                                    "Unnamed item"
                                                }
                                            </strong>


                                            {item.unit && (

                                                <small>
                                                    Unit: {
                                                        item.unit
                                                    }
                                                </small>

                                            )}

                                        </span>


                                        <span>
                                            {quantity}
                                        </span>


                                        <span>
                                            {formatMoney(
                                                rate
                                            )}
                                        </span>


                                        <strong>
                                            {formatMoney(
                                                amount
                                            )}
                                        </strong>

                                    </div>

                                );

                            }
                        )

                    )}

                </section>


                {/* =================================================
                    TOTALS
                ================================================= */}

                <div
                    className={
                        styles.documentTotals
                    }
                >

                    <div>

                        <span>
                            Subtotal
                        </span>

                        <strong>
                            AED {formatMoney(
                                subtotal
                            )}
                        </strong>

                    </div>


                    {Number(discountAmount) > 0 && (

                        <div>

                            <span>
                                Discount
                            </span>

                            <strong>
                                - AED {formatMoney(
                                    discountAmount
                                )}
                            </strong>

                        </div>

                    )}


                    <div>

                        <span>
                            Taxable Amount
                        </span>

                        <strong>
                            AED {formatMoney(
                                taxableAmount
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            VAT ({Number(
                                vatRate
                            ) || 0}%)
                        </span>

                        <strong>
                            AED {formatMoney(
                                vatAmount
                            )}
                        </strong>

                    </div>


                    <div
                        className={
                            styles.documentGrandTotal
                        }
                    >

                        <span>
                            TOTAL
                        </span>

                        <strong>
                            AED {formatMoney(
                                totalAmount
                            )}
                        </strong>

                    </div>

                </div>


                {/* =================================================
                    AMOUNT IN WORDS
                ================================================= */}

                <div
                    className={
                        styles.documentAmountWords
                    }
                >

                    <span>
                        Amount in Words
                    </span>

                    <strong>
                        UAE Dirham {formatMoney(
                            totalAmount
                        )} Only
                    </strong>

                </div>


                {/* =================================================
                    NARRATION
                ================================================= */}

                {narration && (

                    <div
                        className={
                            styles.documentNotes
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


                {/* =================================================
                    SIGNATURES
                ================================================= */}

                <div
                    className={
                        styles.documentSignatures
                    }
                >

                    <div>

                        <span>
                            Receiver's Signature
                        </span>

                        <div />

                    </div>


                    <div>

                        <span>
                            Authorised Signature
                        </span>

                        <div />

                    </div>

                </div>


                {/* =================================================
                    FOOTER
                ================================================= */}

                <footer
                    className={
                        styles.documentFooter
                    }
                >

                    <span>
                        {companyName}
                    </span>

                    <span>
                        Expense Voucher
                    </span>

                </footer>

            </div>

        </aside>

    );

}