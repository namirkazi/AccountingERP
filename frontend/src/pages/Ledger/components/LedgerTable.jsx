import {
    Eye,
    FileText,
} from "lucide-react";

import styles from "../Ledger.module.css";


function formatAmount(value) {
    return Number(value || 0).toLocaleString(
        "en-AE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    );
}


function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
}


function voucherLabel(type) {
    const labels = {
        SALE: "Sales",
        RECEIPT: "Receipt",
        PAYMENT: "Payment",
        EXPENSE: "Expense",
    };

    return labels[type] || type || "Voucher";
}


export default function LedgerTable({
    entries = [],
    loading,
    onViewVoucher,
}) {
    if (loading) {
        return (
            <div className={styles.tableState}>
                <div className={styles.spinner} />
                <span>
                    Loading ledger...
                </span>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className={styles.tableState}>
                <FileText size={32} />

                <strong>
                    No ledger entries found
                </strong>

                <span>
                    Try changing your search or filters.
                </span>
            </div>
        );
    }

    return (
        <div className={styles.tableWrapper}>

            <table className={styles.table}>

                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Voucher</th>
                        <th>Account</th>
                        <th>Party</th>
                        <th>Amount</th>
                        <th></th>
                    </tr>
                </thead>


                <tbody>

                    {entries.map((entry) => (
                        <tr key={entry.id}>

                            <td>
                                {formatDate(
                                    entry.voucher_date
                                )}
                            </td>


                            <td>
                                <div
                                    className={
                                        styles.voucherCell
                                    }
                                >
                                    <strong>
                                        {
                                            entry.voucher_number ||
                                            entry.reference_number ||
                                            "—"
                                        }
                                    </strong>

                                    <span>
                                        {voucherLabel(
                                            entry.voucher_type
                                        )}
                                    </span>

                                    {entry.bill_reference && (
                                        <span>
                                            Ref: {entry.bill_reference}
                                        </span>
                                    )}
                                </div>
                            </td>


                            <td>
                                <div
                                    className={
                                        styles.accountCell
                                    }
                                >
                                    <strong>
                                        {
                                            entry.account_name ||
                                            "—"
                                        }
                                    </strong>

                                    {entry.account_subtype && (
                                        <span>
                                            {
                                                entry.account_subtype
                                            }
                                        </span>
                                    )}
                                </div>
                            </td>


                            <td>
                                <div
                                    className={
                                        styles.partyCell
                                    }
                                >
                                    <strong>
                                        {
                                            entry.party_name ||
                                            "—"
                                        }
                                    </strong>

                                    {entry.party_type && (
                                        <span>
                                            {
                                                entry.party_type
                                            }
                                        </span>
                                    )}
                                </div>
                            </td>


                            <td
                                className={
                                    styles.debitCell
                                }
                            >
                                AED {formatAmount(
                                    entry.voucher_amount
                                )}
                            </td>


                            <td>
                                <button
                                    type="button"
                                    className={
                                        styles.viewButton
                                    }
                                    onClick={() =>
                                        onViewVoucher(
                                            entry
                                        )
                                    }
                                    title="View voucher"
                                >
                                    <Eye size={16} />
                                    <span>
                                        View Bill
                                    </span>
                                </button>
                            </td>

                        </tr>
                    ))}

                </tbody>

            </table>

        </div>
    );
}