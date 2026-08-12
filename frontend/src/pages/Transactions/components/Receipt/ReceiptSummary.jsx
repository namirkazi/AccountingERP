import styles from "../../Transactions.module.css";

export default function ReceiptSummary({ amount }) {

    const total = Number(amount) || 0;

    return (

        <div className={styles.billGrandTotal}>

            <span>
                TOTAL
            </span>

            <strong>
                AED{" "}
                {total.toLocaleString(
                    "en-AE",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )}
            </strong>

        </div>

    );
}
