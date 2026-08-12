import { CalendarDays, FileText } from "lucide-react";
import PartySelector from "../../../../components/accounting/PartySelector";
import AccountSelector from "../../../../components/accounting/AccountSelector";
import TransactionActions from "../Shared/TransactionActions";
import styles from "../../Transactions.module.css";

export default function ReceiptForm({
    date,
    setDate,
    party,
    setParty,
    amount,
    setAmount,
    accountId,
    setAccountId,
    narration,
    setNarration,
    error,
    message,
    saving,
    onSubmit
}) {

    return (

        <form
            className={styles.form}
            onSubmit={onSubmit}
        >

            {/* =================================
                BASIC DETAILS
            ================================= */}

            <div className={styles.card}>

                <div className={styles.sectionTitle}>

                    <FileText size={18} />

                    <span>
                        Receipt Details
                    </span>

                </div>


                {/* DATE + PARTY */}

                <div className={styles.fieldRow}>

                    <div className={styles.field}>

                        <label>
                            Date
                        </label>

                        <div className={styles.inputIcon}>

                            <CalendarDays size={16} />

                            <input
                                type="date"
                                value={date}
                                onChange={
                                    event =>
                                        setDate(event.target.value)
                                }
                            />

                        </div>

                    </div>


                    <div className={styles.field}>

                        <label>
                            Customer
                        </label>

                        <PartySelector
                            value={party}
                            onChange={setParty}
                            partyType="customer"
                        />

                    </div>

                </div>

            </div>


            {/* =================================
                AMOUNT
            ================================= */}

            <div className={styles.card}>

                <div className={styles.sectionTitle}>
                    Amount Details
                </div>

                <div className={styles.fieldRow}>

                    <div className={styles.field}>

                        <label>
                            Amount
                        </label>

                        <div className={styles.amountField}>

                            <span>
                                AED
                            </span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={
                                    event =>
                                        setAmount(event.target.value)
                                }
                            />

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================
                RECEIVED THROUGH
            ================================= */}

            <div className={styles.card}>

                <div className={styles.sectionTitle}>
                    Received Through
                </div>

                <AccountSelector
                    value={accountId}
                    onChange={setAccountId}
                    filter={
                        account =>
                            account.account_subtype === "cash" ||
                            account.account_subtype === "bank"
                    }
                />

            </div>


            {/* =================================
                NARRATION
            ================================= */}

            <div className={styles.card}>

                <div className={styles.sectionTitle}>
                    Narration
                </div>

                <textarea
                    rows={4}
                    value={narration}
                    onChange={
                        event =>
                            setNarration(event.target.value)
                    }
                    placeholder="Optional description..."
                />

            </div>


            <TransactionActions
                error={error}
                message={message}
                saving={saving}
                label="Receipt"
            />

        </form>

    );
}
