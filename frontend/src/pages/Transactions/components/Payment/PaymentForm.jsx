import { CalendarDays, FileText } from "lucide-react";

import BankAccountSelector from "../../../../components/accounting/BankAccountSelector";
import PartySelector from "../../../../components/accounting/PartySelector";

import PaymentBillSelector from "./PaymentBillSelector";

import TransactionActions from "../Shared/TransactionActions";

import styles from "../../Transactions.module.css";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PaymentForm({
  date,
  setDate,

  party,
  setParty,

  paymentType = "bill",
  setPaymentType,

  advanceAmount = "",
  setAdvanceAmount,
  availableSupplierAdvance = 0,
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
  /*
   * =====================================================
   * PAYMENT TOTAL
   * =====================================================
   *
   * Bill Payment:
   * Sum of all bill allocations.
   *
   * Advance Payment:
   * Manually entered advance amount.
   */

  const billPaymentAmount = paymentAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.amount) || 0),
    0,
  );

  const paymentAmount =
    paymentType === "advance" ? Number(advanceAmount) || 0 : billPaymentAmount;
  const totalCashAmount = paymentAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.cash_amount) || 0),
    0,
  );

  const requiresPaymentAccount =
    paymentType === "advance" || totalCashAmount > 0;

  /*
   * =====================================================
   * PAYMENT TYPE CHANGE
   * =====================================================
   */

  function handlePaymentTypeChange(nextType) {
    setPaymentType?.(nextType);

    /*
     * Advance Payment has no Expense bills.
     */

    if (nextType === "advance") {
      setPaymentAllocations([]);

      return;
    }

    /*
     * Going back to Bill Payment means the manually
     * entered Advance Payment amount no longer applies.
     */

    setAdvanceAmount?.("");
  }

  /*
   * =====================================================
   * SUPPLIER CHANGE
   * =====================================================
   */

  function handleSupplierChange(selectedParty) {
    setParty(selectedParty);

    /*
     * Existing bill allocations belong to the
     * previously selected supplier.
     */

    setPaymentAllocations([]);

    /*
     * Keep Advance amount blank when switching
     * supplier to avoid accidentally paying the
     * previous value to another supplier.
     */

    if (paymentType === "advance") {
      setAdvanceAmount?.("");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {/* =================================
          PAYMENT DETAILS
      ================================= */}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>
          <FileText size={18} />

          <span>Payment Details</span>
        </div>

        {/* PAYMENT TYPE */}

        <div
          className={styles.field}
          style={{
            marginBottom: "18px",
          }}
        >
          <label>Payment Type</label>

          <select
            value={paymentType}
            onChange={(event) => handlePaymentTypeChange(event.target.value)}
          >
            <option value="bill">Pay Supplier Bill</option>

            <option value="advance">Advance Payment</option>
          </select>
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
              onChange={handleSupplierChange}
              partyType="supplier"
            />
          </div>
        </div>

        {/* =================================
            BILL PAYMENT
        ================================= */}

        {paymentType === "bill" && (
          <PaymentBillSelector
            party={party}
            paymentBills={paymentBills}
            paymentAllocations={paymentAllocations}
            setPaymentAllocations={setPaymentAllocations}
            availableSupplierAdvance={availableSupplierAdvance}
          />
        )}

        {/* =================================
            ADVANCE PAYMENT
        ================================= */}

        {paymentType === "advance" && (
          <div
            className={styles.field}
            style={{
              marginTop: "18px",
            }}
          >
            <label>Advance Amount</label>

            <div className={styles.amountField}>
              <span>AED</span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={advanceAmount}
                placeholder="0.00"
                onChange={(event) => setAdvanceAmount?.(event.target.value)}
              />
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              This amount will be recorded as an advance against the selected
              supplier and can be used against future Expense bills.
            </div>
          </div>
        )}
      </div>

      {/* =================================
          PAYMENT TOTAL
      ================================= */}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Payment Total</div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>
              {paymentType === "advance"
                ? "Advance Payment"
                : "Total Settlement"}
            </label>

            <div className={styles.amountField}>
              <span>AED</span>

              <input type="text" readOnly value={paymentAmount.toFixed(2)} />
            </div>
          </div>
        </div>

        {paymentType === "bill" && paymentAllocations.length > 0 && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Selected bills will be settled for{" "}
            <strong>AED {formatMoney(paymentAmount)}</strong>.
          </div>
        )}
      </div>

      {/* =================================
          PAID THROUGH
      ================================= */}
      {requiresPaymentAccount && (
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

          {paymentType === "advance" && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              The advance amount will be deducted from this Cash / Bank account.
            </div>
          )}

          {paymentType === "bill" && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Only the Cash / Bank portion of the settlement will be deducted
              from this account. Supplier Advance used against the bill will not
              deduct Cash / Bank again.
            </div>
          )}
        </div>
      )}
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
        label={paymentType === "advance" ? "Advance Payment" : "Payment"}
      />
    </form>
  );
}
