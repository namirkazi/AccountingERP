import styles from "../../Transactions.module.css";

export default function PaymentSummary({ selectedPaymentExpense, paymentAmount }) {

    if (!selectedPaymentExpense) {
        return null;
    }

    const outstandingAfter = Math.max(
        0,
        Number(selectedPaymentExpense.outstanding_amount || 0) -
        (Number(paymentAmount) || 0)
    );

    return (

        <>

            <div>

                <span>
                    Already Paid
                </span>

                <strong>
                    AED{" "}
                    {Number(selectedPaymentExpense.paid_amount || 0).toLocaleString(
                        "en-AE",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Outstanding After Payment
                </span>

                <strong>
                    AED{" "}
                    {outstandingAfter.toLocaleString(
                        "en-AE",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )}
                </strong>

            </div>

        </>

    );
}
