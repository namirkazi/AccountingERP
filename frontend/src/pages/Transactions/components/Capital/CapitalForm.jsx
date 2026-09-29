import { ArrowDownToLine, CheckCircle2, Plus, Trash2 } from "lucide-react";
import BankAccountSelector from "../../../../components/accounting/BankAccountSelector";
import styles from "./CapitalForm.module.css";

function createAllocation() {
  return {
    type: "",
    account_id: null,
    account: null,
    amount: "",
  };
}

export default function CapitalForm({
  availableCapital,
  amount,
  setAmount,
  allocations = [],
  setAllocations,
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

  const allocated = allocations.reduce(
    (total, allocation) => total + (Number(allocation.amount) || 0),
    0,
  );

  const difference = transferAmount - allocated;
  const remainingCapital = capital - transferAmount;

  const isBalanced = transferAmount > 0 && Math.abs(difference) < 0.001;

  function addAllocation() {
    setAllocations([...allocations, createAllocation()]);
  }

  function removeAllocation(index) {
    setAllocations(
      allocations.filter((_, allocationIndex) => allocationIndex !== index),
    );
  }

  function updateAllocationType(index, type) {
    setAllocations(
      allocations.map((allocation, allocationIndex) => {
        if (allocationIndex !== index) {
          return allocation;
        }

        return {
          ...allocation,
          type,
          account_id: null,
          account: null,
        };
      }),
    );
  }

  function updateAllocationBank(index, selectedAccount) {
    setAllocations(
      allocations.map((allocation, allocationIndex) => {
        if (allocationIndex !== index) {
          return allocation;
        }

        return {
          ...allocation,
          account_id: selectedAccount?.id || null,
          account: selectedAccount || null,
        };
      }),
    );
  }

  function updateAllocationAmount(index, value) {
    setAllocations(
      allocations.map((allocation, allocationIndex) => {
        if (allocationIndex !== index) {
          return allocation;
        }

        return {
          ...allocation,
          amount: value,
        };
      }),
    );
  }

  function isBankAlreadySelected(accountId, currentIndex) {
    return allocations.some(
      (allocation, index) =>
        index !== currentIndex &&
        allocation.type === "bank" &&
        Number(allocation.account_id) === Number(accountId),
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formHeader}>
        <div>
          <h2>Move Capital</h2>
          <p>
            Allocate available capital between Cash and one or more bank
            accounts.
          </p>
        </div>
      </div>

      {/* AVAILABLE CAPITAL */}
      <div className={styles.capitalCard}>
        <div className={styles.capitalCardInner}>
          <div className={styles.capitalIcon}>
            <ArrowDownToLine size={19} />
          </div>

          <div>
            <div className={styles.capitalLabel}>Available Capital</div>

            <div className={styles.capitalValue}>
              AED{" "}
              {capital.toLocaleString("en-AE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* DATE */}
      <div className={styles.formGroup}>
        <label>Date</label>

        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      {/* AMOUNT */}
      <div className={styles.formGroup}>
        <label>Amount to Move</label>

        <div className={styles.amountInput}>
          <span>AED</span>

          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* ALLOCATIONS */}
      <div className={styles.allocationCard}>
        <div className={styles.allocationHeader}>
          <div>
            <strong>Capital Allocations</strong>
            <span>Add as many Cash or Bank allocations as required.</span>
          </div>

          <button
            type="button"
            className={styles.addButton}
            onClick={addAllocation}
          >
            <Plus size={15} />
            Add Allocation
          </button>
        </div>

        <div className={styles.allocationBody}>
          {allocations.length === 0 ? (
            <div className={styles.emptyAllocation}>
              <p>No allocations added yet.</p>

              <button
                type="button"
                className={styles.emptyAddButton}
                onClick={addAllocation}
              >
                <Plus size={15} />
                Add your first allocation
              </button>
            </div>
          ) : (
            allocations.map((allocation, index) => (
              <div
                className={styles.allocationItem}
                key={`allocation-${index}`}
              >
                <div className={styles.allocationItemHeader}>
                  <span>Allocation {index + 1}</span>

                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeAllocation(index)}
                    title="Remove allocation"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className={styles.allocationGrid}>
                  {/* TYPE */}
                  <div className={styles.formGroup}>
                    <label>Account Type</label>

                    <select
                      value={allocation.type}
                      onChange={(event) =>
                        updateAllocationType(index, event.target.value)
                      }
                    >
                      <option value="">Select type</option>
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                    </select>
                  </div>

                  {/* BANK */}
                  {allocation.type === "bank" && (
                    <div className={styles.formGroup}>
                      <label>Bank Account</label>

                      <BankAccountSelector
                        value={allocation.account_id || ""}
                        includeCash={false}
                        onChange={(selectedAccount) => {
                          if (
                            selectedAccount &&
                            isBankAlreadySelected(selectedAccount.id, index)
                          ) {
                            return;
                          }

                          updateAllocationBank(index, selectedAccount);
                        }}
                        placeholder="Select bank account"
                      />
                    </div>
                  )}

                  {/* AMOUNT */}
                  <div className={styles.formGroup}>
                    <label>Amount</label>

                    <div className={styles.amountInput}>
                      <span>AED</span>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={allocation.amount || ""}
                        onChange={(event) =>
                          updateAllocationAmount(index, event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {allocation.type === "bank" && allocation.account && (
                  <div className={styles.selectedAccount}>
                    {allocation.account.displayName}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SUMMARY */}
      <div className={styles.allocationCard}>
        <div className={styles.allocationHeader}>
          <strong>Allocation Summary</strong>
        </div>

        <div className={styles.allocationBody}>
          <div className={styles.allocationRow}>
            <span>Amount to move</span>
            <strong>AED {transferAmount.toFixed(2)}</strong>
          </div>

          <div className={styles.allocationRow}>
            <span>Total allocated</span>
            <strong>AED {allocated.toFixed(2)}</strong>
          </div>

          <div className={styles.allocationDivider} />

          <div className={styles.remainingRow}>
            <span>Remaining</span>
            <strong>AED {difference.toFixed(2)}</strong>
          </div>

          <div className={styles.allocationRow}>
            <span>Capital remaining after move</span>
            <strong>AED {remainingCapital.toFixed(2)}</strong>
          </div>

          <div
            className={isBalanced ? styles.balanceReady : styles.balancePending}
          >
            <CheckCircle2 size={16} />

            <span>
              {isBalanced
                ? "Capital is fully allocated."
                : "Allocations must equal the amount being moved."}
            </span>
          </div>
        </div>
      </div>

      {/* NARRATION */}
      <div className={styles.formGroup}>
        <label>Narration</label>

        <textarea
          value={narration}
          onChange={(event) => setNarration(event.target.value)}
          placeholder="Enter capital movement details..."
          rows={3}
        />
      </div>

      {/* MESSAGES */}
      {error && <div className={styles.error}>{error}</div>}

      {message && <div className={styles.success}>{message}</div>}

      {/* SUBMIT */}
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
