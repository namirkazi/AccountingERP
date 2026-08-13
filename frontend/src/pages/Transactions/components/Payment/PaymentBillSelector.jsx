import styles from "../../Transactions.module.css";

export default function PaymentBillSelector({
    party,
    paymentBills,
    selectedPaymentBill,
    setSelectedPaymentBill,
    setPaymentAmount,
}) {

    function handleChange(event) {

        const selectedId = event.target.value;

        const bill = paymentBills.find(
            item =>
                String(item.id) === String(selectedId)
        );

        if (!bill) {

            setSelectedPaymentBill(null);
            setPaymentAmount("");

            return;
        }

        setSelectedPaymentBill(bill);

        // Default to the full outstanding amount.
        // User can reduce it for a partial payment.
        setPaymentAmount(
            Number(bill.outstanding_amount || 0).toFixed(2)
        );
    }


    return (

        <div className={styles.paymentSelection}>

            <div className={styles.field}>

                <label>
                    Bill / Reference No.
                </label>

                <select
                    value={selectedPaymentBill?.id || ""}
                    onChange={handleChange}
                    disabled={
                        !party ||
                        paymentBills.length === 0
                    }
                >

                    <option value="">

                        {!party
                            ? "Select supplier first"
                            : paymentBills.length === 0
                                ? "No outstanding bills"
                                : "Select bill"
                        }

                    </option>


                    {paymentBills.map(bill => (

                        <option
                            key={bill.id}
                            value={bill.id}
                        >

                            {bill.reference_number ||
                                `Voucher #${bill.id}`
                            }

                            {" — AED "}

                            {Number(
                                bill.outstanding_amount || 0
                            ).toLocaleString(
                                "en-AE",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}

                            {" outstanding"}

                        </option>

                    ))}

                </select>

            </div>


            {selectedPaymentBill && (

                <div className={styles.selectedPaymentBill}>

                    <div
                        className={
                            styles.selectedPaymentBillHeader
                        }
                    >

                        <span>
                            BILL BEING PAID
                        </span>

                        <strong>
                            {selectedPaymentBill.reference_number ||
                                `Voucher #${selectedPaymentBill.id}`
                            }
                        </strong>

                    </div>


                    <div
                        className={
                            styles.selectedPaymentBillAmounts
                        }
                    >

                        <div>

                            <span>
                                Bill Total
                            </span>

                            <strong>
                                AED{" "}
                                {Number(
                                    selectedPaymentBill.amount || 0
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
                                {Number(
                                    selectedPaymentBill.paid_amount || 0
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
                                Outstanding
                            </span>

                            <strong>
                                AED{" "}
                                {Number(
                                    selectedPaymentBill.outstanding_amount || 0
                                ).toLocaleString(
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