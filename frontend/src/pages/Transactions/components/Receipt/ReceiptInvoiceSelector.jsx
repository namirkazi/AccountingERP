import styles from "../../Transactions.module.css";

export default function ReceiptInvoiceSelector({
    customer,
    invoices,
    selectedInvoice,
    selectInvoice,
}) {
    function handleChange(event) {
        const selectedId = event.target.value;

        const invoice = invoices.find(
            item =>
                String(item.id) === String(selectedId)
        );

        selectInvoice(invoice || null);
    }

    return (
        <div className={styles.paymentSelection}>

            <div className={styles.field}>

                <label>
                    Bill / Invoice No.
                </label>

                <select
                    value={selectedInvoice?.id || ""}
                    onChange={handleChange}
                    disabled={
                        !customer ||
                        invoices.length === 0
                    }
                >

                    <option value="">
                        {!customer
                            ? "Select customer first"
                            : invoices.length === 0
                                ? "No outstanding invoices"
                                : "Select invoice"
                        }
                    </option>

                    {invoices.map(invoice => (

                        <option
                            key={invoice.id}
                            value={invoice.id}
                        >
                            {invoice.invoice_number ||
                                invoice.reference_number ||
                                `Voucher #${invoice.id}`
                            }

                            {" — AED "}

                            {Number(
                                invoice.outstanding_amount || 0
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


            {selectedInvoice && (

                <div className={styles.selectedPaymentBill}>

                    <div
                        className={
                            styles.selectedPaymentBillHeader
                        }
                    >

                        <span>
                            BILL BEING RECEIVED
                        </span>

                        <strong>
                            {selectedInvoice.invoice_number ||
                                selectedInvoice.reference_number ||
                                `Voucher #${selectedInvoice.id}`
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
                                    selectedInvoice.amount || 0
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
                                Already Received
                            </span>

                            <strong>
                                AED{" "}
                                {Number(
                                    selectedInvoice.paid_amount || 0
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
                                    selectedInvoice.outstanding_amount || 0
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