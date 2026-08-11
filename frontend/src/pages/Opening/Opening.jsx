import { useEffect, useState } from "react";

import {
    Landmark,
    Wallet,
    CircleDollarSign,
    CheckCircle2
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import {
    getAccounts,
    saveOpeningBalance
} from "../../services/accountService";

import styles from "./Opening.module.css";

export default function Opening() {

    const [accounts, setAccounts] = useState([]);

    const [capital, setCapital] = useState("");
    const [bank, setBank] = useState("");
    const [cash, setCash] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {

        async function loadAccounts() {

            try {

                const response =
                    await getAccounts();

                setAccounts(
                    response.data.accounts
                );

            } catch (error) {

                setError(error.message);

            } finally {

                setLoading(false);
            }
        }

        loadAccounts();

    }, []);

    const capitalValue =
        Number(capital) || 0;

    const bankValue =
        Number(bank) || 0;

    const cashValue =
        Number(cash) || 0;

    const allocated =
        bankValue + cashValue;

    const unallocated =
        capitalValue - allocated;

    function formatAmount(value) {

        return Number(value).toLocaleString(
            "en-AE",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }

    async function handleSubmit(event) {

        event.preventDefault();

        setError("");
        setSuccess("");

        if (capitalValue <= 0) {

            setError(
                "Capital amount must be greater than zero."
            );

            return;
        }

        if (bankValue < 0 || cashValue < 0) {

            setError(
                "Bank and Cash cannot be negative."
            );

            return;
        }

        if (Math.abs(unallocated) > 0.001) {

            setError(
                "Capital must equal the total opening Bank and Cash balances."
            );

            return;
        }

        setSaving(true);

        try {

            /*
             * API will be connected next.
             */

            const response = await saveOpeningBalance({
                capital: capitalValue,
                bank: bankValue,
                cash: cashValue
            });

            setSuccess(
                response.message ||
                "Opening balance posted successfully."
            );

            setCapital("");
            setBank("");
            setCash("");

        } catch (error) {

            setError(
                error.message ||
                "Unable to save opening balances."
            );

        } finally {

            setSaving(false);
        }
    }

    if (loading) {

        return (
            <AppLayout>

                <div className={styles.loading}>
                    Loading accounting setup...
                </div>

            </AppLayout>
        );
    }

    return (

        <AppLayout>

            <div className={styles.page}>

                <div className={styles.header}>

                    <div>

                        <h1>
                            Opening Balance
                        </h1>

                        <p>
                            Set the initial capital,
                            bank and cash position.
                        </p>

                    </div>

                </div>


                <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                >

                    <div className={styles.card}>

                        <div className={styles.cardHeader}>

                            <div
                                className={
                                    styles.icon
                                }
                            >
                                <CircleDollarSign
                                    size={20}
                                />
                            </div>

                            <div>

                                <h2>
                                    Capital
                                </h2>

                                <p>
                                    Initial owner's
                                    capital.
                                </p>

                            </div>

                        </div>

                        <Input
                            label="Capital Amount"
                            type="number"
                            placeholder="0.00"
                            value={capital}
                            onChange={(e) =>
                                setCapital(
                                    e.target.value
                                )
                            }
                            required
                        />

                    </div>


                    <div className={styles.card}>

                        <div className={styles.cardHeader}>

                            <div
                                className={
                                    styles.icon
                                }
                            >
                                <Landmark
                                    size={20}
                                />
                            </div>

                            <div>

                                <h2>
                                    Bank
                                </h2>

                                <p>
                                    Opening bank
                                    balance.
                                </p>

                            </div>

                        </div>

                        <Input
                            label="Bank Amount"
                            type="number"
                            placeholder="0.00"
                            value={bank}
                            onChange={(e) =>
                                setBank(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    <div className={styles.card}>

                        <div className={styles.cardHeader}>

                            <div
                                className={
                                    styles.icon
                                }
                            >
                                <Wallet
                                    size={20}
                                />
                            </div>

                            <div>

                                <h2>
                                    Cash
                                </h2>

                                <p>
                                    Opening cash
                                    balance.
                                </p>

                            </div>

                        </div>

                        <Input
                            label="Cash Amount"
                            type="number"
                            placeholder="0.00"
                            value={cash}
                            onChange={(e) =>
                                setCash(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    <div className={styles.summary}>

                        <div>
                            <span>
                                Capital
                            </span>

                            <strong>
                                AED{" "}
                                {formatAmount(
                                    capitalValue
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Bank + Cash
                            </span>

                            <strong>
                                AED{" "}
                                {formatAmount(
                                    allocated
                                )}
                            </strong>
                        </div>

                        <div
                            className={
                                unallocated === 0
                                    ? styles.balanced
                                    : styles.unbalanced
                            }
                        >

                            <span>
                                Difference
                            </span>

                            <strong>
                                AED{" "}
                                {formatAmount(
                                    Math.abs(
                                        unallocated
                                    )
                                )}
                            </strong>

                        </div>

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

                            {success}

                        </div>

                    )}


                    <div className={styles.actions}>

                        <Button
                            type="submit"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Save Opening Balance"
                            }
                        </Button>

                    </div>

                </form>

            </div>

        </AppLayout>
    );
}