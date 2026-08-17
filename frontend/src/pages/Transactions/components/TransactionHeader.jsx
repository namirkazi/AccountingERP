import styles from "../Transactions.module.css";

export const TRANSACTION_TYPES = [
    {
        key: "sale",
        label: "Sales",
        shortcut: "Alt + S"
    },
    {
        key: "receipt",
        label: "Receipt",
        shortcut: "Alt + R"
    },
    {
        key: "payment",
        label: "Payment",
        shortcut: "Alt + P"
    },
    {
        key: "expense",
        label: "Expense",
        shortcut: "Alt + E"
    },
    {
        key: "capital",
        label: "Capital",
        shortcut: "Alt + C"
    }
];

export default function TransactionHeader({ type, changeType }) {

    return (

        <>

            {/* =========================================
                HEADER
            ========================================= */}

            <div className={styles.header}>

                <div>

                    <h1>
                        Transactions
                    </h1>

                    <p>
                        Record sales, receipts,
                        payments and expenses.
                    </p>

                </div>

            </div>


            {/* =========================================
                TRANSACTION TYPE
            ========================================= */}

            <div className={styles.typeBar}>

                {TRANSACTION_TYPES.map(
                    item => (

                        <button
                            key={item.key}
                            type="button"
                            className={
                                type === item.key
                                    ? styles.activeType
                                    : styles.typeButton
                            }
                            onClick={() =>
                                changeType(
                                    item.key
                                )
                            }
                        >

                            <span>
                                {item.label}
                            </span>

                            <kbd>
                                {item.shortcut}
                            </kbd>

                        </button>

                    )
                )}

            </div>

        </>

    );
}
