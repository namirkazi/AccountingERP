import { ArrowDownLeft, ArrowUpRight, FileText } from "lucide-react";

import styles from "../Ledger.module.css";

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LedgerSummary({
  entries = [],
  sales = 0,
  expenses = 0,
  netActivity = 0,
}) {
  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <FileText size={19} />
        </div>

        <div>
          <span>Entries</span>

          <strong>{entries.length}</strong>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <ArrowUpRight size={19} />
        </div>

        <div>
          <span>Sales</span>

          <strong>AED {formatAmount(sales)}</strong>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <ArrowDownLeft size={19} />
        </div>

        <div>
          <span>Expenses</span>

          <strong>AED {formatAmount(expenses)}</strong>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <FileText size={19} />
        </div>

        <div>
          <span>Net</span>

          <strong>AED {formatAmount(netActivity)}</strong>
        </div>
      </div>
    </div>
  );
}
