import { CalendarDays, FileText } from "lucide-react";

import BankAccountSelector from "../../../../components/accounting/BankAccountSelector";
import PartySelector from "../../../../components/accounting/PartySelector";

import PaymentBillSelector from "./PaymentBillSelector";

import TransactionActions from "../Shared/TransactionActions";

import styles from "../../Transactions.module.css";

export default function PaymentForm({
  date,
  setDate,

  party,
  setParty,

  paymentBills,
  paymentAllocations,
  setPaymentAllocations,

  accountId,
  setAccountId,

  paymentAccount,
  setPaymentAccount,

  narration,
  setNarration,

  error,
  message,
  saving,

  onSubmit,
}) {
  const paymentAmount = paymentAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.amount) || 0),
    0,
  );

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {/* =================================
          BASIC DETAILS
      ================================= */}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>
          <FileText size={18} />

          <span>Payment Details</span>
        </div>

        <div className={styles.fieldRow}>
          {/* DATE */}

          <div className={styles.field}>
            <label>Date</label>

            <div className={styles.inputIcon}>
              <CalendarDays size={16} />

              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          {/* SUPPLIER */}

          <div className={styles.field}>
            <label>Supplier</label>

            <PartySelector
              value={party}
              onChange={(selectedParty) => {
                setParty(selectedParty);

                /*
                 * Allocations belong to the currently
                 * selected supplier. Clear them whenever
                 * supplier changes.
                 */
                setPaymentAllocations([]);
              }}
              partyType="supplier"
            />
          </div>
        </div>

        {/* BILLS */}

        <PaymentBillSelector
          party={party}
          paymentBills={paymentBills}
          paymentAllocations={paymentAllocations}
          setPaymentAllocations={setPaymentAllocations}
        />
      </div>

      {/* =================================
          PAYMENT TOTAL
      ================================= */}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Payment Total</div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>Total Payment</label>

            <div className={styles.amountField}>
              <span>AED</span>

              <input type="text" readOnly value={paymentAmount.toFixed(2)} />
            </div>
          </div>
        </div>
      </div>

      {/* =================================
          PAID THROUGH
      ================================= */}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Paid Through</div>

        <BankAccountSelector
          value={accountId}
          onChange={(selectedAccount) => {
            if (!selectedAccount) {
              setAccountId("");
              setPaymentAccount(null);
              return;
            }

            setAccountId(selectedAccount.id);
            setPaymentAccount(selectedAccount);
          }}
        />
      </div>

      {/* =================================
          NARRATION
      ================================= */}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Narration</div>

        <textarea
          rows={4}
          value={narration}
          onChange={(event) => setNarration(event.target.value)}
          placeholder="Optional description..."
        />
      </div>

      <TransactionActions
        error={error}
        message={message}
        saving={saving}
        label="Payment"
      />
    </form>
  );
}
