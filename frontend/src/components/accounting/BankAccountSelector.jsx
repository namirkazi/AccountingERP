import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import styles from "./BankAccountSelector.module.css";

export default function BankAccountSelector({
  value,
  onChange,
  includeCash = true,
  placeholder = "Select account",
}) {
  const [accounts, setAccounts] = useState([]);
  const [cashAccountId, setCashAccountId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBankAccounts() {
      try {
        const response = await apiRequest("bank_accounts/list.php");

        if (!cancelled) {
          setAccounts(
            response?.data?.bank_accounts || response?.bank_accounts || [],
          );

          setCashAccountId(response?.data?.cash_account_id || null);
        }
      } catch (error) {
        console.error("Failed to load bank accounts:", error);

        if (!cancelled) {
          setAccounts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBankAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  function getLastFour(accountNumber) {
    if (!accountNumber) {
      return "";
    }

    const digits = String(accountNumber).replace(/\s+/g, "").replace(/\D/g, "");

    return digits.slice(-4);
  }

  function getLabel(account) {
    const lastFour = getLastFour(account.account_number);

    const bankName = account.bank_name || account.account_name || "Bank";

    if (!lastFour) {
      return bankName;
    }

    return `${bankName} — ${lastFour}`;
  }

  function handleChange(event) {
    const selectedValue = event.target.value;

    if (cashAccountId && String(selectedValue) === String(cashAccountId)) {
      if (!cashAccountId) {
        onChange(null);
        return;
      }

      onChange({
        id: Number(cashAccountId),
        displayName: "Cash",
      });

      return;
    }

    if (!selectedValue) {
      onChange(null);
      return;
    }

    const selectedAccount = accounts.find(
      (account) =>
        String(account.accounting_account_id) === String(selectedValue),
    );

    if (!selectedAccount) {
      onChange(null);
      return;
    }

    const accountNumber = String(selectedAccount.account_number || "").replace(
      /\s+/g,
      "",
    );

    const last4 = accountNumber.slice(-4);

    onChange({
      id: selectedAccount.accounting_account_id,
      displayName: `${selectedAccount.bank_name} — ${last4}`,
    });
  }

  return (
    <select
      className={styles.select}
      value={typeof value === "object" ? value?.id || "" : value || ""}
      onChange={handleChange}
      disabled={loading}
    >
      <option value="">{loading ? "Loading accounts..." : placeholder}</option>

      {includeCash && cashAccountId && (
        <option value={cashAccountId}>Cash</option>
      )}

      {accounts
        .filter((account) => Number(account.is_active) === 1)
        .map((account) => (
          <option key={account.id} value={account.accounting_account_id}>
            {getLabel(account)}
            {account.currency ? ` (${account.currency})` : ""}
          </option>
        ))}
    </select>
  );
}
