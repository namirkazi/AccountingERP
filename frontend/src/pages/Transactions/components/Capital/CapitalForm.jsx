import { ArrowDownToLine, Landmark, Wallet, CheckCircle2 } from "lucide-react";
import styles from "./CapitalForm.module.css";

export default function CapitalForm({
  availableCapital,

  amount,
  setAmount,

  cashAmount,
  setCashAmount,

  bankAmount,
  setBankAmount,

  date,
  setDate,

  narration,
  setNarration,

  error,
  message,
  saving,

  onSubmit,
}) {
  const capital = Number(availableCapital) || 0;

  const transferAmount = Number(amount) || 0;

  const cash = Number(cashAmount) || 0;

  const bank = Number(bankAmount) || 0;

  const allocated = cash + bank;

  const difference = transferAmount - allocated;

  const remainingCapital = capital - transferAmount;

  const isBalanced = transferAmount !== 0 && Math.abs(difference) < 0.001;

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {/* =========================================
                HEADER
            ========================================= */}

      <div className={styles.formHeader}>
        <div>
          <h2>Move Capital</h2>

          <p>Transfer available capital into Cash and Bank.</p>
        </div>
      </div>

      {/* =========================================
                AVAILABLE CAPITAL
            ========================================= */}

      <div
        style={{
          padding: "18px 20px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#2563eb",
              }}
            >
              <ArrowDownToLine size={19} />
            </div>

            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "3px",
                }}
              >
                Available Capital
              </div>

              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                AED{" "}
                {capital.toLocaleString("en-AE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
                DATE
            ========================================= */}

      <div className={styles.formGroup}>
        <label>Date</label>

        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      {/* =========================================
                AMOUNT TO MOVE
            ========================================= */}

      <div className={styles.formGroup}>
        <label>Amount to Move</label>

        <div className={styles.amountInput}>
          <span>AED</span>

          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* =========================================
                CASH + BANK
            ========================================= */}

      <div
        className={styles.formRow}
        style={{
          marginTop: "8px",
        }}
      >
        {/* CASH */}

        <div className={styles.formGroup}>
          <label>Cash</label>

          <div className={styles.amountInput}>
            <span>AED</span>

            <input
              type="number"
              step="0.01"
              value={cashAmount}
              onChange={(event) => setCashAmount(event.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* BANK */}

        <div className={styles.formGroup}>
          <label>Bank</label>

          <div className={styles.amountInput}>
            <span>AED</span>

            <input
              type="number"
              step="0.01"
              value={bankAmount}
              onChange={(event) => setBankAmount(event.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* =========================================
                SUMMARY
            ========================================= */}

      <div
        style={{
          marginTop: "8px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #f0f1f3",
            fontSize: "12px",
            fontWeight: 700,
            color: "#374151",
          }}
        >
          Capital Allocation
        </div>

        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "11px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Amount to move</span>

            <strong>AED {transferAmount.toFixed(2)}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Cash</span>

            <strong>AED {cash.toFixed(2)}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Bank</span>

            <strong>AED {bank.toFixed(2)}</strong>
          </div>

          <div
            style={{
              height: "1px",
              background: "#f0f1f3",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Cash + Bank</span>

            <strong>AED {allocated.toFixed(2)}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Remaining Capital</span>

            <strong>AED {remainingCapital.toFixed(2)}</strong>
          </div>

          <div
            style={{
              marginTop: "4px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: isBalanced ? "#ecfdf5" : "#f9fafb",
              color: isBalanced ? "#047857" : "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "12px",
            }}
          >
            <CheckCircle2 size={16} />

            {isBalanced
              ? "Capital is fully allocated."
              : "Cash + Bank must equal the amount being moved."}
          </div>
        </div>
      </div>

      {/* =========================================
                NARRATION
            ========================================= */}

      <div className={styles.formGroup}>
        <label>Narration</label>

        <textarea
          value={narration}
          onChange={(event) => setNarration(event.target.value)}
          placeholder="Enter capital movement details..."
          rows={3}
        />
      </div>

      {/* =========================================
                MESSAGES
            ========================================= */}

      {error && <div className={styles.error}>{error}</div>}

      {message && <div className={styles.success}>{message}</div>}

      {/* =========================================
                SUBMIT
            ========================================= */}

      <div className={styles.formActions}>
        <button
          type="submit"
          disabled={saving || !isBalanced}
          className={styles.primaryButton}
        >
          {saving ? "Moving Capital..." : "Move Capital"}
        </button>
      </div>
    </form>
  );
}
