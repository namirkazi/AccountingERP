import { Eye, EyeOff, FileText } from "lucide-react";
import ExpenseSummary from "./ExpenseSummary";
import styles from "../../Transactions.module.css";

export default function ExpensePreview({
    date,
    party,
    partyName,
    referenceNumber,
    voucherNumber,
    items = [],
    subtotal = 0,
    expenseName,
    discountAmount,
    taxableAmount,
    vatRate,
    vatAmount,
    totalAmount,
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
                        Expense Voucher
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
                    EXPENSE VOUCHER
                </div>


                {/* META */}

                <div className={styles.billMeta}>
                    <div>
                        <span>Date</span>
                        <strong>
                            {date
                                ? new Date(date + "T00:00:00").toLocaleDateString(
                                    "en-AE",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
                                    }
                                )
                                : "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Voucher No.</span>
                        <strong>
                            {voucherNumber || "Assigned on save"}
                        </strong>
                    </div>

                    <div>
                        <span>Supplier Bill / Reference</span>
                        <strong>
                            {referenceNumber || "—"}
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


                    {items.length === 0 ? (
                        <div className={styles.billItem}>
                            <span>No items added</span>
                            <strong>AED 0.00</strong>
                        </div>
                    ) : (
                        items.map(item => {
                            const lineTotal =
                                (Number(item.quantity) || 0) *
                                (Number(item.rate) || 0);

                            return (
                                <div
                                    className={styles.billItem}
                                    key={item.id}
                                >
                                    <span>
                                        {item.description || "Unnamed item"}
                                        {Number(item.quantity) > 0 && (
                                            <>
                                                <small>
                                                    {` × ${item.quantity}`}
                                                </small>
                                            </>
                                        )}
                                    </span>

                                    <strong>
                                        AED {lineTotal.toLocaleString(
                                            "en-AE",
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            }
                                        )}
                                    </strong>
                                </div>
                            );
                        })
                    )}

                </div>


                {/* TOTALS */}

                <div className={styles.billTotals}>

                    <ExpenseSummary
                        discountAmount={discountAmount}
                        taxableAmount={taxableAmount}
                        vatRate={vatRate}
                        vatAmount={vatAmount}
                        totalAmount={totalAmount}
                    />

                </div>


                {/* STATUS */}

                <div className={styles.pendingBadge}>
                    PENDING PAYMENT
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
