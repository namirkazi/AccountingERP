import { useState } from "react";

import {
    CircleDollarSign,
    CheckCircle2,
    UserRound,
    ArrowUpRight
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import PartySelector
    from "../../components/accounting/PartySelector";

import {
    saveOpeningBalance
} from "../../services/accountService";

import styles from "./Opening.module.css";


export default function Opening() {

    const [investor, setInvestor] =
        useState(null);

    const [amount, setAmount] =
        useState("");

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");


    const amountValue =
        Number(amount) || 0;


    function formatAmount(value) {

        return Number(value || 0).toLocaleString(
            "en-AE",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    }


    function getInvestorId() {

        if (!investor) {
            return 0;
        }

        if (
            typeof investor === "object" &&
            investor.id
        ) {
            return Number(investor.id);
        }

        return Number(investor);

    }


    async function handleSubmit(event) {

        event.preventDefault();

        setError("");
        setSuccess("");


        const investorId =
            getInvestorId();


        if (!investorId) {

            setError(
                "Please select an investor."
            );

            return;
        }


        if (amountValue <= 0) {

            setError(
                "Capital amount must be greater than zero."
            );

            return;
        }


        setSaving(true);


        try {

            const response =
                await saveOpeningBalance({

                    investor_id:
                        investorId,

                    amount:
                        amountValue

                });


            setSuccess(
                response.message ||
                "Capital added successfully."
            );


            setInvestor(null);
            setAmount("");


        } catch (error) {

            setError(
                error.message ||
                "Unable to save capital."
            );

        } finally {

            setSaving(false);

        }

    }


    const hasInvestor = Boolean(
        getInvestorId()
    );

    const hasAmount = amountValue > 0;


    return (

        <AppLayout>

            <div className={styles.page}>

                <header className={styles.header}>

                    <div className={styles.headerCopy}>

                        <div className={styles.eyebrow}>
                            ACCOUNTING SETUP
                        </div>

                        <h1>
                            Opening
                        </h1>

                        <p>
                            Record an investor capital contribution
                            to establish the company's opening position.
                        </p>

                    </div>

                    <div className={styles.headerBadge}>
                        <CircleDollarSign size={18} />
                        <span>Capital</span>
                    </div>

                </header>


                <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                >

                    <div className={styles.layout}>

                        <section className={styles.mainCard}>

                            <div className={styles.cardHeader}>

                                <div className={styles.icon}>
                                    <UserRound size={19} />
                                </div>

                                <div>
                                    <div className={styles.sectionEyebrow}>
                                        CONTRIBUTION
                                    </div>

                                    <h2>
                                        Investor Capital
                                    </h2>

                                    <p>
                                        Select the investor and enter the
                                        amount being contributed.
                                    </p>
                                </div>

                            </div>


                            <div className={styles.fields}>

                                <div className={styles.field}>

                                    <label>
                                        Investor
                                    </label>

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
                                        label="Capital Amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(event) =>
                                            setAmount(
                                                event.target.value
                                            )
                                        }
                                        required
                                    />

                                    <span className={styles.currency}>
                                        AED
                                    </span>

                                </div>

                            </div>


                            <div className={styles.accountingNote}>

                                <div className={styles.noteIcon}>
                                    <ArrowUpRight size={16} />
                                </div>

                                <div>
                                    <strong>
                                        Capital contribution
                                    </strong>

                                    <p>
                                        This entry will be recorded against
                                        the selected investor as a contribution.
                                    </p>
                                </div>

                            </div>

                        </section>


                        <aside className={styles.summaryCard}>

                            <div className={styles.summaryTop}>

                                <div>
                                    <div className={styles.sectionEyebrow}>
                                        PREVIEW
                                    </div>

                                    <h2>
                                        Contribution
                                    </h2>
                                </div>

                                <div
                                    className={
                                        hasInvestor && hasAmount
                                            ? styles.statusReady
                                            : styles.statusPending
                                    }
                                >
                                    <span className={styles.statusDot} />

                                    {hasInvestor && hasAmount
                                        ? "Ready"
                                        : "Pending"}
                                </div>

                            </div>


                            <div className={styles.amountPreview}>

                                <span>
                                    Contribution amount
                                </span>

                                <strong>
                                    <small>AED</small>
                                    {formatAmount(amountValue)}
                                </strong>

                            </div>


                            <div className={styles.summaryDivider} />


                            <div className={styles.summaryRows}>

                                <div className={styles.summaryRow}>

                                    <span>
                                        Investor
                                    </span>

                                    <strong>
                                        {investor?.party_name ||
                                            "Not selected"}
                                    </strong>

                                </div>


                                <div className={styles.summaryRow}>

                                    <span>
                                        Transaction
                                    </span>

                                    <strong>
                                        Capital contribution
                                    </strong>

                                </div>


                                <div className={styles.summaryRow}>

                                    <span>
                                        Currency
                                    </span>

                                    <strong>
                                        AED
                                    </strong>

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


                    {error && (

                        <div className={styles.error}>
                            {error}
                        </div>

                    )}


                    {success && (

                        <div className={styles.success}>

                            <CheckCircle2
                                size={18}
                            />

                            <span>
                                {success}
                            </span>

                        </div>

                    )}


                    <div className={styles.actions}>

                        <div className={styles.actionText}>
                            <span>
                                Opening entry
                            </span>

                            <strong>
                                {hasInvestor && hasAmount
                                    ? `AED ${formatAmount(amountValue)}`
                                    : "Not ready"}
                            </strong>
                        </div>

                        <Button
                            type="submit"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Add Capital"}
                        </Button>

                    </div>

                </form>

            </div>

        </AppLayout>

    );

}
