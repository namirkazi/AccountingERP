import { ArrowDownLeft, ArrowUpRight, FileText } from "lucide-react";

import styles from "../Ledger.module.css";

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LedgerSummary({
  sales = 0,
  expenses = 0,
  payments = 0,
  payable = 0,
  receipts = 0,
  receivable = 0,
  onPayableClick,
  onReceivableClick,
}) {
  return (
    <div className={styles.summaryGrid}>
      {/* SALES */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <FileText size={19} />
        </div>

        <div>
          <span>Sales</span>

          <strong>AED {formatAmount(sales)}</strong>
        </div>
      </div>

      {/* RECEIVED */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <ArrowUpRight size={19} />
        </div>

        <div>
          <span>Receipts</span>

          <strong>AED {formatAmount(receipts)}</strong>
        </div>
      </div>
      {/* RECEIVABLE */}
      <button
        type="button"
        className={`${styles.summaryCard} ${styles.summaryCardClickable}`}
        onClick={onReceivableClick}
      >
        <div className={styles.summaryIcon}>
          <FileText size={19} />
        </div>

        <div>
          <span>Total Receivable</span>

          <strong>AED {formatAmount(receivable)}</strong>
        </div>
      </button>
      {/* EXPENSES */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <ArrowDownLeft size={19} />
        </div>

        <div>
          <span>Expenses</span>

          <strong>AED {formatAmount(expenses)}</strong>
        </div>
      </div>

      {/* PAID */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>
          <ArrowDownLeft size={19} />
        </div>

        <div>
          <span>Payments</span>

          <strong>AED {formatAmount(payments)}</strong>
        </div>
      </div>

      {/* PAYABLE */}
      <button
        type="button"
        className={`${styles.summaryCard} ${styles.summaryCardClickable}`}
        onClick={onPayableClick}
      >
        <div className={styles.summaryIcon}>
          <FileText size={19} />
        </div>

        <div>
          <span>Total Payable</span>

          <strong>AED {formatAmount(payable)}</strong>
        </div>
      </button>
    </div>
  );
}
