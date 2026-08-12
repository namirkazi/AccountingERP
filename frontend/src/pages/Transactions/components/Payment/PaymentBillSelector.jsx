import styles from "../../Transactions.module.css";

export default function PaymentBillSelector({
    party,
    paymentExpenses,
    selectedPaymentExpense,
    setSelectedPaymentExpense,
    setPaymentAmount,
    setReferenceNumber
}) {

    function handleChange(event) {

        const selectedId = event.target.value;

        const expense = paymentExpenses.find(
            item =>
                String(item.id) === String(selectedId)
        );

        if (!expense) {

            setSelectedPaymentExpense(null);
            setPaymentAmount("");
            return;
        }

        setSelectedPaymentExpense(expense);
        setPaymentAmount(expense.outstanding_amount);
        setReferenceNumber(expense.reference_number || "");
    }

    return (

        <div className={styles.paymentSelection}>

            <div className={styles.field}>

                <label>
                    Bill / Reference No.
                </label>

                <select
                    value={selectedPaymentExpense?.id || ""}
                    onChange={handleChange}
                    disabled={!party || paymentExpenses.length === 0}
                >

                    <option value="">
                        {!party
                            ? "Select supplier first"
                            : paymentExpenses.length === 0
                                ? "No outstanding bills"
                                : "Select bill"
                        }
                    </option>

                    {paymentExpenses.map(
                        expense => (

                            <option
                                key={expense.id}
                                value={expense.id}
                            >

                                {expense.reference_number ||
                                    `Voucher #${expense.id}`
                                }

                                {" — AED "}

                                {Number(expense.outstanding_amount || 0).toLocaleString(
                                    "en-AE",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}

                                {" outstanding"}

                            </option>

                        )
                    )}

                </select>

            </div>


            {selectedPaymentExpense && (

                <div className={styles.selectedPaymentBill}>

                    <div className={styles.selectedPaymentBillHeader}>

                        <span>
                            BILL BEING PAID
                        </span>

                        <strong>
                            {selectedPaymentExpense.reference_number ||
                                `Voucher #${selectedPaymentExpense.id}`
                            }
                        </strong>

                    </div>


                    <div className={styles.selectedPaymentBillAmounts}>

                        <div>

                            <span>
                                Bill Total
                            </span>

                            <strong>
                                AED{" "}
                                {Number(
                                    selectedPaymentExpense.total_amount ||
                                    selectedPaymentExpense.amount ||
                                    0
                                ).toLocaleString(
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
                                Outstanding
                            </span>

                            <strong>
                                AED{" "}
                                {Number(selectedPaymentExpense.outstanding_amount || 0).toLocaleString(
                                    "en-AE",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </strong>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );
}
