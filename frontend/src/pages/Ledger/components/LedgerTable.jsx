import { Eye, FileText, Paperclip } from "lucide-react";

import styles from "../Ledger.module.css";

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function LedgerTable({ entries = [], loading, onViewVoucher }) {
  if (loading) {
    return (
      <div className={styles.tableState}>
        <div className={styles.spinner} />
        <span>Loading ledger...</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={styles.tableState}>
        <FileText size={32} />

        <strong>No ledger entries found</strong>

        <span>Try changing your search or filters.</span>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Party</th>
            <th>Voucher</th>
            <th>Particulars</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDate(entry.voucher_date)}</td>

              <td>
                <div className={styles.partyCell}>
                  <strong>{entry.party_name || "—"}</strong>

                  {entry.party_type && <span>{entry.party_type}</span>}
                </div>
              </td>
              <td>
                <div className={styles.voucherCell}>
                  <strong>
                    {entry.voucher_number || entry.reference_number || "—"}
                  </strong>

                  <span>{voucherLabel(entry.voucher_type)}</span>

                  {entry.bill_reference && (
                    <span>Ref: {entry.bill_reference}</span>
                  )}
                </div>
              </td>

              <td>
                <div className={styles.accountCell}>
                  <strong>{entry.particulars || "—"}</strong>

                  {entry.bill_reference && (
                    <span>Ref: {entry.bill_reference}</span>
                  )}
                </div>
              </td>

              <td className={styles.debitCell}>
                AED {formatAmount(entry.voucher_amount)}
              </td>

              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className={styles.viewButton}
                    onClick={() => onViewVoucher(entry)}
                    title="View ERP voucher"
                  >
                    <Eye size={16} />

                    <span>View Bill</span>
                  </button>

                  {entry.voucher_type === "PAYMENT" &&
                    Array.isArray(entry.reference_bills) &&
                    entry.reference_bills.map((referenceBill, index) => {
                      const attachment = referenceBill?.attachment;

                      if (!attachment?.url) {
                        return null;
                      }

                      /*
                       * Prefer the supplier's actual
                       * bill/reference number.
                       */
                      const label =
                        referenceBill.bill_reference ||
                        referenceBill.reference_number ||
                        `Bill ${index + 1}`;

                      return (
                        <a
                          key={[
                            entry.voucher_id,
                            referenceBill.expense_id,
                            attachment.id,
                          ].join("-")}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.viewButton}
                          title={
                            attachment.name || `View supplier bill ${label}`
                          }
                          style={{
                            textDecoration: "none",
                          }}
                        >
                          <Paperclip size={15} />

                          <span>Ref {label}</span>
                        </a>
                      );
                    })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
