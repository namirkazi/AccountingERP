import { Check, Save } from "lucide-react";
import styles from "../../Transactions.module.css";

export default function TransactionActions({ error, message, saving, label }) {

    return (

        <>

            {/* =================================
                MESSAGES
            ================================= */}

            {error && (

                <div
                    className={
                        styles.error
                    }
                >
                    {error}
                </div>

            )}


            {message && (

                <div
                    className={
                        styles.success
                    }
                >

                    <Check
                        size={17}
                    />

                    {message}

                </div>

            )}


            {/* =================================
                ACTIONS
            ================================= */}

            <div
                className={
                    styles.actions
                }
            >

                <button
                    type="submit"
                    disabled={saving}
                    className={
                        styles.saveButton
                    }
                >

                    <Save
                        size={17}
                    />

                    {saving
                        ? "Saving..."
                        : `Save ${label}`
                    }

                </button>

            </div>

        </>

    );
}
