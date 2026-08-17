import {
    ArrowDownLeft,
    ArrowUpRight,
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


export default function LedgerSummary({
    entries = [],
    totalDebit = 0,
    totalCredit = 0,
}) {
    return (
        <div className={styles.summaryGrid}>

            <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>
                    <FileText size={19} />
                </div>

                <div>
                    <span>
                        Entries
                    </span>

                    <strong>
                        {entries.length}
                    </strong>
                </div>
            </div>


            <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>
                    <ArrowDownLeft size={19} />
                </div>

                <div>
                    <span>
                        Total Debit
                    </span>

                    <strong>
                        AED{" "}
                        {formatAmount(
                            totalDebit
                        )}
                    </strong>
                </div>
            </div>


            <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>
                    <ArrowUpRight size={19} />
                </div>

                <div>
                    <span>
                        Total Credit
                    </span>

                    <strong>
                        AED{" "}
                        {formatAmount(
                            totalCredit
                        )}
                    </strong>
                </div>
            </div>


            <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>
                    <FileText size={19} />
                </div>

                <div>
                    <span>
                        Difference
                    </span>

                    <strong>
                        AED{" "}
                        {formatAmount(
                            Math.abs(
                                Number(
                                    totalDebit
                                ) -
                                Number(
                                    totalCredit
                                )
                            )
                        )}
                    </strong>
                </div>
            </div>

        </div>
    );
}