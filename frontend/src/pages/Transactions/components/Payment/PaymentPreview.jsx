import { Eye, EyeOff, FileText } from "lucide-react";
import PaymentSummary from "./PaymentSummary";
import styles from "../../Transactions.module.css";

export default function PaymentPreview({
    date,
    party,
    partyName,
    paymentAmount,
    selectedPaymentBill,
    narration,
    voucherNumber,
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
                onClick={() => setShowPreview(true)}
            >

                <Eye size={17} />

                Show Preview

            </button>

        );
    }

    return (

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
                        Payment Voucher
                    </h2>

                </div>


                {showSavedVoucher ? (

                    <div className={styles.savedVoucherActions}>

                        <button
                            type="button"
                            className={styles.printButton}
                            onClick={printVoucher}
                        >

                            <FileText size={17} />

                            Print / Save PDF

                        </button>

                    </div>

                ) : (

                    <button
                        type="button"
                        className={styles.previewHideButton}
                        onClick={() => setShowPreview(false)}
                        title="Hide preview"
                    >

                        <EyeOff size={17} />

                        Hide

                    </button>

                )}

            </div>


            {/* PAPER */}

            <div className={styles.billPreview}>

                {/* COMPANY */}

                <div className={styles.billCompany}>

                    <div className={styles.companyLogo}>
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


                <div className={styles.billTitle}>
                    PAYMENT
                </div>


                {/* META */}

                <div className={styles.billMeta}>

                    <div>

                        <span>
                            Date
                        </span>

                        <strong>
                            {date
                                ? new Date(
                                    date + "T00:00:00"
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


                    <div>

                        <span>
                            Payment No.
                        </span>

                        <strong>
                            {voucherNumber || "PAY-NEW"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Bill Reference
                        </span>

                        <strong>
                            {selectedPaymentBill?.reference_number ||
                                (
                                    selectedPaymentBill?.id
                                        ? `Voucher #${selectedPaymentBill.id}`
                                        : "—"
                                )
                            }
                        </strong>

                    </div>

                </div>


                {/* PARTY */}

                <div className={styles.billParty}>

                    <span>
                        SUPPLIER
                    </span>

                    <strong>
                        {party ? partyName : "—"}
                    </strong>

                </div>


                {/* ITEMS */}

                <div className={styles.billItems}>

                    <div className={styles.billItemsHeader}>

                        <span>
                            DESCRIPTION
                        </span>

                        <span>
                            AMOUNT
                        </span>

                    </div>


                    <div className={styles.billItem}>

                        <span>
                            {selectedPaymentBill?.narration || "Supplier Payment"}
                        </span>

                        <strong>
                            AED{" "}
                            {(Number(paymentAmount) || 0).toLocaleString(
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

                <div className={styles.billTotals}>

                    <div>

                        <PaymentSummary
                            selectedPaymentBill={selectedPaymentBill}
                            paymentAmount={paymentAmount}
                        />

                        <span>
                            Subtotal
                        </span>

                        <strong>
                            AED{" "}
                            {(Number(paymentAmount) || 0).toLocaleString(
                                "en-AE",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}
                        </strong>

                    </div>


                    <div className={styles.billGrandTotal}>

                        <span>
                            TOTAL
                        </span>

                        <strong>
                            AED{" "}
                            {(Number(paymentAmount) || 0).toLocaleString(
                                "en-AE",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}
                        </strong>

                    </div>

                </div>


                {/* NARRATION */}

                {narration && (

                    <div className={styles.billNarration}>

                        <span>
                            Notes
                        </span>

                        <p>
                            {narration}
                        </p>

                    </div>

                )}


                <div className={styles.billFooter}>
                    This is a preview.
                    The voucher is only
                    created after saving.
                </div>

            </div>

        </aside>

    );
}
