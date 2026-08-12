import styles from "../../Transactions.module.css";

function money(value) {
    return (Number(value) || 0).toLocaleString("en-AE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export default function ExpenseSummary({
    subtotal,
    discountAmount,
    taxableAmount,
    vatRate,
    vatAmount,
    totalAmount
}) {
    return (
        <div className={styles.calculationSummary}>
            <div>
                <span>Subtotal</span>
                <strong>AED {money(subtotal)}</strong>
            </div>

            <div>
                <span>Discount</span>
                <strong className={styles.discountValue}>
                    - AED {money(discountAmount)}
                </strong>
            </div>

            <div>
                <span>Taxable Amount</span>
                <strong>AED {money(taxableAmount)}</strong>
            </div>

            <div>
                <span>VAT ({Number(vatRate) || 0}%)</span>
                <strong>AED {money(vatAmount)}</strong>
            </div>

            <div className={styles.totalRow}>
                <span>Total</span>
                <strong>AED {money(totalAmount)}</strong>
            </div>
        </div>
    );
}
