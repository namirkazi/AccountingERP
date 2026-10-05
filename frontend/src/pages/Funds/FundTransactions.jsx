import { CalendarDays, CheckCircle2, Save } from "lucide-react";

import { useEffect, useState } from "react";

import AppLayout from "../../components/layout/AppLayout";

import FundPartySelector from "../../components/funds/FundPartySelector";

import {
  createFundTransaction,
  getFundPartyBalance,
} from "../../services/fundService";

import transactionStyles from "../Transactions/Transactions.module.css";

import styles from "./FundTransactions.module.css";
const FUND_CURRENCY = "INR";
const PAYMENT_METHODS = [
  {
    value: "UPI",
    label: "UPI",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
  },
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "OTHER",
    label: "Others",
  },
];

function getLocalDate() {
  const now = new Date();

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMethod(method) {
  if (method === "BANK_TRANSFER") {
    return "Bank Transfer";
  }

  if (method === "OTHER") {
    return "Others";
  }

  return method || "-";
}

export default function FundTransactions() {
  const [type, setType] = useState("DEPOSIT");

  const [date, setDate] = useState(getLocalDate());

  const [party, setParty] = useState(null);

  const [balance, setBalance] = useState(0);

  const [balanceLoading, setBalanceLoading] = useState(false);

  const [amount, setAmount] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");

  const [referenceNumber, setReferenceNumber] = useState("");

  const [remarks, setRemarks] = useState("");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [savedTransaction, setSavedTransaction] = useState(null);

  /*
   * Load current balance whenever
   * the selected party changes.
   */
  useEffect(() => {
    if (!party?.id) {
      setBalance(0);

      return;
    }

    let cancelled = false;

    async function loadBalance() {
      try {
        setBalanceLoading(true);
        setError("");

        const response = await getFundPartyBalance(party.id);

        if (cancelled) {
          return;
        }

        setBalance(Number(response?.data?.current_balance || 0));
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to load fund balance:", error);

        setBalance(0);

        setError(error.message || "Unable to load party balance.");
      } finally {
        if (!cancelled) {
          setBalanceLoading(false);
        }
      }
    }

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [party?.id]);

  function changeType(newType) {
    setType(newType);

    setAmount("");
    setPaymentMethod("");
    setReferenceNumber("");
    setRemarks("");

    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!party?.id) {
      setError("Please select a party.");

      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount.");

      return;
    }

    if (!paymentMethod) {
      setError("Please select a payment method.");

      return;
    }

    /*
     * Frontend convenience check.
     *
     * Backend performs the real
     * authoritative balance check.
     */

    try {
      setSaving(true);

      const response = await createFundTransaction({
        type,

        date,

        party_id: Number(party.id),

        amount: numericAmount,

        payment_method: paymentMethod,

        reference_number: referenceNumber.trim(),

        remarks: remarks.trim(),
      });

      const transaction = response?.data;

      if (!transaction) {
        throw new Error("The server did not return the saved transaction.");
      }

      setBalance(Number(transaction.balance_after || 0));

      setSavedTransaction(transaction);

      setMessage(
        response.message ||
          `${
            type === "DEPOSIT" ? "Deposit" : "Withdrawal"
          } created successfully.`,
      );
    } catch (error) {
      setError(error.message || "Unable to save transaction.");

      /*
       * Balance may have changed in
       * another session, so refresh it.
       */
      if (party?.id) {
        try {
          const response = await getFundPartyBalance(party.id);

          setBalance(Number(response?.data?.current_balance || 0));
        } catch {
          // Keep original error.
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function newTransaction() {
    setSavedTransaction(null);

    setAmount("");
    setPaymentMethod("");
    setReferenceNumber("");
    setRemarks("");

    setMessage("");
    setError("");
  }

  function printVoucher() {
    if (!savedTransaction) {
      return;
    }

    const originalTitle = document.title;

    const partyName = savedTransaction.party?.party_name || "Party";

    document.title =
      `${savedTransaction.voucher_number} - ${partyName}`.replace(
        /[<>:"/\\|?*]/g,
        "",
      );

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }

  const businessName =
    import.meta.env.VITE_FUNDS_BUSINESS_NAME || "Funds Management";

  return (
    <AppLayout>
      <div className={transactionStyles.page}>
        <div className={styles.typeHeader}>
          <h1>Deposit / Withdrawal</h1>

          <p>Record party deposits and withdrawals.</p>
        </div>

        {/* TYPE */}

        <div className={transactionStyles.typeBar}>
          <button
            type="button"
            className={
              type === "DEPOSIT"
                ? transactionStyles.activeType
                : transactionStyles.typeButton
            }
            onClick={() => changeType("DEPOSIT")}
          >
            Deposit
          </button>

          <button
            type="button"
            className={
              type === "WITHDRAWAL"
                ? transactionStyles.activeType
                : transactionStyles.typeButton
            }
            onClick={() => changeType("WITHDRAWAL")}
          >
            Withdrawal
          </button>
        </div>

        <form className={transactionStyles.form} onSubmit={handleSubmit}>
          {/* TRANSACTION DETAILS */}

          <div className={transactionStyles.card}>
            <div className={transactionStyles.sectionTitle}>
              {type === "DEPOSIT" ? "Deposit Details" : "Withdrawal Details"}
            </div>

            <div className={transactionStyles.fieldRow}>
              <div className={transactionStyles.field}>
                <label>Date</label>

                <div className={transactionStyles.inputIcon}>
                  <CalendarDays size={16} />

                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={transactionStyles.field}>
                <label>Party</label>

                <FundPartySelector value={party} onChange={setParty} />
              </div>
            </div>

            {party && (
              <div
                style={{
                  marginTop: "16px",
                }}
              >
                <div className={styles.balanceBox}>
                  <span>Available Balance</span>

                  <strong
                    className={balanceLoading ? styles.balanceLoading : ""}
                  >
                    {balanceLoading
                      ? "Loading..."
                      : `${FUND_CURRENCY} ${formatMoney(balance)}`}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* AMOUNT */}

          <div className={transactionStyles.card}>
            <div className={transactionStyles.sectionTitle}>Amount</div>

            <div className={transactionStyles.field}>
              <label>
                {type === "DEPOSIT" ? "Deposit Amount" : "Withdrawal Amount"}
              </label>

              <div className={transactionStyles.amountField}>
                <span>{FUND_CURRENCY}</span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          {/* METHOD */}

          <div className={transactionStyles.card}>
            <div className={transactionStyles.sectionTitle}>
              {type === "DEPOSIT" ? "Deposited Through" : "Withdrawn Through"}
            </div>

            <div className={styles.methods}>
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={`${styles.method} ${
                    paymentMethod === method.value ? styles.methodActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />

                  <span>{method.label}</span>
                </label>
              ))}
            </div>

            <div className={transactionStyles.referenceField}>
              <label>Reference No.</label>

              <input
                type="text"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Optional transaction / bank reference"
              />
            </div>
          </div>

          {/* REMARKS */}

          <div className={transactionStyles.card}>
            <div className={transactionStyles.sectionTitle}>Remarks</div>

            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Enter remarks..."
            />
          </div>

          {error && <div className={transactionStyles.error}>{error}</div>}

          {message && (
            <div className={transactionStyles.success}>
              <CheckCircle2 size={17} />

              {message}
            </div>
          )}

          <div className={transactionStyles.actions}>
            <button
              type="submit"
              className={transactionStyles.saveButton}
              disabled={saving || balanceLoading}
            >
              <Save size={16} />

              {saving
                ? "Saving..."
                : type === "DEPOSIT"
                  ? "Save Deposit"
                  : "Save Withdrawal"}
            </button>
          </div>
        </form>
      </div>

      {/* SAVED VOUCHER */}

      {savedTransaction && (
        <div className={styles.voucherOverlay}>
          <div className={styles.voucherToolbar}>
            <div className={styles.voucherToolbarText}>
              <span>SAVED VOUCHER</span>

              <strong>{savedTransaction.voucher_number}</strong>
            </div>

            <div className={styles.voucherActions}>
              <button
                type="button"
                className={styles.printButton}
                onClick={printVoucher}
              >
                Print
              </button>

              <button
                type="button"
                className={styles.newButton}
                onClick={newTransaction}
              >
                Close
              </button>
            </div>
          </div>

          <div className={styles.voucher}>
            <div className={styles.voucherBusiness}>
              <h1>
                {savedTransaction.transaction_type === "DEPOSIT"
                  ? "DEPOSIT VOUCHER"
                  : "WITHDRAWAL VOUCHER"}
              </h1>
            </div>

            <div className={styles.voucherMeta}>
              <div className={styles.metaItem}>
                <span>Voucher No.</span>

                <strong>{savedTransaction.voucher_number}</strong>
              </div>

              <div className={styles.metaItem}>
                <span>Date</span>

                <strong>{savedTransaction.transaction_date}</strong>
              </div>

              <div className={styles.metaItem}>
                <span>Party</span>

                <strong>{savedTransaction.party?.party_name}</strong>
              </div>

              <div className={styles.metaItem}>
                <span>Method</span>

                <strong>{formatMethod(savedTransaction.payment_method)}</strong>
              </div>

              <div className={styles.metaItem}>
                <span>Reference No.</span>

                <strong>{savedTransaction.reference_number || "-"}</strong>
              </div>
            </div>

            <div className={styles.amountDisplay}>
              <span>
                {savedTransaction.transaction_type === "DEPOSIT"
                  ? "Amount Deposited"
                  : "Amount Withdrawn"}
              </span>

              <strong>
                {FUND_CURRENCY} {formatMoney(savedTransaction.amount)}
              </strong>
            </div>

            {savedTransaction.remarks && (
              <div className={styles.remarks}>
                <span>Remarks</span>

                <p>{savedTransaction.remarks}</p>
              </div>
            )}

            <div className={styles.balanceAfter}>
              <span>Balance After</span>

              <strong>
                {FUND_CURRENCY} {formatMoney(savedTransaction.balance_after)}
              </strong>
            </div>

            <div className={styles.signatureRow}>
              <div className={styles.signature}>Party Signature</div>

              <div className={styles.signature}>Authorised Signatory</div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
