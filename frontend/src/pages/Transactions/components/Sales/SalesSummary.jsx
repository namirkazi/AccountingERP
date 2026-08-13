import styles from "../../Transactions.module.css";


function formatAmount(value) {

    return Number(value || 0).toLocaleString(
        "en-AE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


export default function SalesSummary({

    subtotal = 0,
    discountAmount = 0,
    taxableAmount = 0,
    vatRate = 0,
    vatAmount = 0,
    totalAmount = 0

}) {

    return (

        <div>

            <div>

                <span>
                    Subtotal
                </span>

                <strong>
                    AED {formatAmount(subtotal)}
                </strong>

            </div>


            {Number(discountAmount) > 0 && (

                <div>

                    <span>
                        Discount
                    </span>

                    <strong>
                        - AED {formatAmount(
                            discountAmount
                        )}
                    </strong>

                </div>

            )}


            <div>

                <span>
                    Taxable Amount
                </span>

                <strong>
                    AED {formatAmount(
                        taxableAmount
                    )}
                </strong>

            </div>


            {Number(vatRate) > 0 && (

                <div>

                    <span>
                        VAT ({vatRate}%)
                    </span>

                    <strong>
                        AED {formatAmount(
                            vatAmount
                        )}
                    </strong>

                </div>

            )}


            <div
                className={
                    styles.billGrandTotal
                }
            >

                <span>
                    TOTAL
                </span>

                <strong>
                    AED {formatAmount(
                        totalAmount
                    )}
                </strong>

            </div>

        </div>

    );

}