import { useState } from "react";

import {
  CircleDollarSign,
  CheckCircle2,
  UserRound,
  ArrowUpRight,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import PartySelector from "../../components/accounting/PartySelector";

import { saveOpeningBalance } from "../../services/accountService";

import styles from "./Opening.module.css";

export default function Opening() {
  const [investor, setInvestor] = useState(null);

  const [amount, setAmount] = useState("");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const amountValue = Number(amount);

  function formatAmount(value) {
    return Math.abs(Number(value || 0)).toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatSignedAmount(value) {
    const number = Number(value || 0);

    if (number > 0) {
      return `+AED ${formatAmount(number)}`;
    }

    if (number < 0) {
      return `-AED ${formatAmount(number)}`;
    }

    return "AED 0.00";
  }

  function getInvestorId() {
    if (!investor) {
      return 0;
    }

    if (typeof investor === "object" && investor.id) {
      return Number(investor.id);
    }

    return Number(investor);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const investorId = getInvestorId();

    if (!investorId) {
      setError("Please select an investor.");

      return;
    }

    if (!Number.isFinite(amountValue) || amountValue === 0) {
      setError("Opening amount cannot be zero.");

      return;
    }

    setSaving(true);

    try {
      const response = await saveOpeningBalance({
        investor_id: investorId,

        amount: amountValue,
      });

      setSuccess(response.message || "Opening balance saved successfully.");

      setInvestor(null);
      setAmount("");
    } catch (error) {
      setError(error.message || "Unable to save opening balance.");
    } finally {
      setSaving(false);
    }
  }

  const hasInvestor = Boolean(getInvestorId());

  const hasAmount = Number.isFinite(amountValue) && amountValue !== 0;

  const amountIsNegative = amountValue < 0;

  return (
    <AppLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <div className={styles.eyebrow}>ACCOUNTING SETUP</div>

            <h1>Opening</h1>

            <p>Record an investor's opening capital position.</p>
          </div>

          <div className={styles.headerBadge}>
            <CircleDollarSign size={18} />
            <span>Capital</span>
          </div>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.layout}>
            <section className={styles.mainCard}>
              <div className={styles.cardHeader}>
                <div className={styles.icon}>
                  <UserRound size={19} />
                </div>

                <div>
                  <div className={styles.sectionEyebrow}>OPENING BALANCE</div>

                  <h2>Investor Capital</h2>

                  <p>
                    Enter the investor's opening balance. Positive and negative
                    balances are supported.
                  </p>
                </div>
              </div>

              <div className={styles.fields}>
                <div className={styles.field}>
                  <label>Investor</label>

                  <PartySelector
                    value={investor}
                    onChange={setInvestor}
                    partyType="investor"
                  />

                  <span className={styles.fieldHint}>
                    Search an existing investor or add a new one.
                  </span>
                </div>

                <div className={styles.amountField}>
                  <Input
                    label="Opening Balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />

                  <span className={styles.currency}>AED</span>
                </div>
              </div>

              <div className={styles.accountingNote}>
                <div className={styles.noteIcon}>
                  <ArrowUpRight size={16} />
                </div>

                <div>
                  <strong>Opening balance</strong>

                  <p>
                    Use a negative amount when the opening position needs to be
                    carried forward as a deduction. Later contributions can be
                    entered normally as positive amounts.
                  </p>
                </div>
              </div>
            </section>

            <aside className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <div>
                  <div className={styles.sectionEyebrow}>PREVIEW</div>

                  <h2>Opening Balance</h2>
                </div>

                <div
                  className={
                    hasInvestor && hasAmount
                      ? styles.statusReady
                      : styles.statusPending
                  }
                >
                  <span className={styles.statusDot} />

                  {hasInvestor && hasAmount ? "Ready" : "Pending"}
                </div>
              </div>

              <div className={styles.amountPreview}>
                <span>Opening balance</span>

                <strong>
                  <small>AED</small>
                  {amountIsNegative ? "-" : ""}
                  {formatAmount(amountValue)}
                </strong>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Investor</span>

                  <strong>
                    {investor?.party_name ||
                      investor?.investor_name ||
                      "Not selected"}
                  </strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>Entry type</span>

                  <strong>Opening balance</strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>Position</span>

                  <strong>
                    {amountIsNegative ? "Negative opening" : "Positive opening"}
                  </strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>Currency</span>

                  <strong>AED</strong>
                </div>
              </div>

              <div className={styles.summaryFooter}>
                <div
                  className={
                    hasInvestor && hasAmount
                      ? styles.checkReady
                      : styles.checkPending
                  }
                >
                  <CheckCircle2 size={17} />

                  <span>
                    {hasInvestor && hasAmount
                      ? "All required details are ready."
                      : "Select an investor and enter an amount."}
                  </span>
                </div>
              </div>
            </aside>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {success && (
            <div className={styles.success}>
              <CheckCircle2 size={18} />

              <span>{success}</span>
            </div>
          )}

          <div className={styles.actions}>
            <div className={styles.actionText}>
              <span>Opening entry</span>

              <strong>
                {hasInvestor && hasAmount
                  ? formatSignedAmount(amountValue)
                  : "Not ready"}
              </strong>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Opening Balance"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
