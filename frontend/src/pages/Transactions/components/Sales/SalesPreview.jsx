import {
    Eye,
    EyeOff,
    FileText
} from "lucide-react";

import styles from "../../Transactions.module.css";


function formatAmount(value) {

    return Number(value || 0).toLocaleString(
        "en-AE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


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


export default function SalesPreview({

    date,

    party,
    partyName,

    billNumber,

    services = [],

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

    printVoucher

}) {


    if (!showPreview) {

        return (

            <button
                type="button"
                className={styles.showPreviewButton}
                onClick={() =>
                    setShowPreview(true)
                }
            >

                <Eye size={17} />

                Show Preview

            </button>

        );

    }


    return (

        <aside
            className={styles.previewPanel}
        >

            {/* =====================================================
                HEADER
            ===================================================== */}

            <div
                className={styles.previewHeader}
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
                        Sales Voucher
                    </h2>

                </div>


                {showSavedVoucher ? (

                    <div
                        className={
                            styles.savedVoucherActions
                        }
                    >

                        <button
                            type="button"
                            className={
                                styles.printButton
                            }
                            onClick={printVoucher}
                        >

                            <FileText
                                size={17}
                            />

                            Print / Save PDF

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


            {/* =====================================================
                PAPER
            ===================================================== */}

            <div
                className={styles.billPreview}
            >


                {/* =================================================
                    COMPANY
                ================================================= */}

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
                    className={styles.billTitle}
                >
                    SALES
                </div>


                {/* =================================================
                    META
                ================================================= */}

                <div
                    className={styles.billMeta}
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
                            {billNumber || "—"}
                        </strong>

                    </div>

                </div>


                {/* =================================================
                    CUSTOMER
                ================================================= */}

                <div
                    className={styles.billParty}
                >

                    <span>
                        CUSTOMER
                    </span>

                    <strong>
                        {party
                            ? partyName
                            : "—"
                        }
                    </strong>


                    {party?.address && (

                        <small>
                            {party.address}
                        </small>

                    )}


                    {party?.phone && (

                        <small>
                            Tel: {party.phone}
                        </small>

                    )}


                    {party?.email && (

                        <small>
                            {party.email}
                        </small>

                    )}

                </div>


                {/* =================================================
                    SERVICES
                ================================================= */}

                <div
                    className={styles.billItems}
                >

                    <div
                        className={
                            styles.billItemsHeader
                        }
                    >

                        <span>
                            SERVICE
                        </span>

                        <span>
                            AMOUNT
                        </span>

                    </div>


                    {services.length > 0 ? (

                        services.map(
                            (service, index) => (

                                <div
                                    className={
                                        styles.billItem
                                    }
                                    key={
                                        service.id ??
                                        service.customerServiceId ??
                                        index
                                    }
                                >

                                    <span>

                                        {service.description ||
                                            "Service"
                                        }

                                    </span>


                                    <strong>

                                        AED{" "}
                                        {formatAmount(
                                            service.amount
                                        )}

                                    </strong>

                                </div>

                            )
                        )

                    ) : (

                        <div
                            className={
                                styles.billItem
                            }
                        >

                            <span>
                                No services added
                            </span>

                            <strong>
                                AED 0.00
                            </strong>

                        </div>

                    )}

                </div>


                {/* =================================================
                    TOTALS
                ================================================= */}

                <div
                    className={styles.billTotals}
                >

                    <div>

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


                    {Number(
                        discountAmount
                    ) > 0 && (

                        <div>

                            <span>
                                Discount
                            </span>

                            <strong>
                                - AED{" "}
                                {formatAmount(
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
                            AED{" "}
                            {formatAmount(
                                taxableAmount
                            )}
                        </strong>

                    </div>


                    {Number(vatRate) > 0 && (

                        <div>

                            <span>
                                VAT ({vatRate}%)
                            </span>

                            <strong>
                                AED{" "}
                                {formatAmount(
                                    vatAmount
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
                            {formatAmount(
                                totalAmount
                            )}
                        </strong>

                    </div>

                </div>


                {/* =================================================
                    NARRATION
                ================================================= */}

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
                    className={styles.billFooter}
                >
                    This is a preview.
                    The voucher is only
                    created after saving.
                </div>

            </div>

        </aside>

    );

}