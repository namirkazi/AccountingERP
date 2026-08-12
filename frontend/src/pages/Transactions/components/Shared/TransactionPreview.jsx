import ExpensePreview
    from "../Expense/ExpensePreview";

import PaymentPreview
    from "../Payment/PaymentPreview";

import SalesPreview
    from "../Sales/SalesPreview";

import ReceiptPreview
    from "../Receipt/ReceiptPreview";

import styles
    from "../../Transactions.module.css";

export default function TransactionPreview({
    type,
    date,
    narration,

    expense,
    payment,
    sales,
    receipt,

    party
}) {
    return (
        <div className={styles.previewColumn}>
            <div className={styles.previewHeader}>
                <div>
                    <span>LIVE PREVIEW</span>

                    <h2>
                        {type === "expense"
                            ? "Expense Voucher"
                            : type === "payment"
                                ? "Payment Voucher"
                                : type === "sale"
                                    ? "Sales Invoice"
                                    : "Receipt Voucher"}
                    </h2>
                </div>
            </div>

            <div className={styles.previewPaper}>
                {type === "expense" && (
                    <ExpensePreview
                        date={date}
                        party={party}
                        referenceNumber={
                            expense?.referenceNumber
                        }
                        items={expense?.items || []}
                        discountAmount={
                            expense?.discountAmount || 0
                        }
                        taxableAmount={
                            expense?.taxableAmount || 0
                        }
                        vatRate={
                            expense?.vatRate || 0
                        }
                        vatAmount={
                            expense?.vatAmount || 0
                        }
                        totalAmount={
                            expense?.totalAmount || 0
                        }
                        narration={narration}
                    />
                )}

                {type === "payment" && (
                    <PaymentPreview
                        date={date}
                        party={party}
                        selectedPaymentExpense={
                            payment?.selectedPaymentExpense
                        }
                        paymentAmount={
                            payment?.paymentAmount
                        }
                        narration={narration}
                    />
                )}

                {type === "sale" && (
                    <SalesPreview
                        date={date}
                        customer={sales?.customer}
                        invoiceNumber={
                            sales?.invoiceNumber
                        }
                        items={sales?.items || []}
                        subtotal={
                            sales?.subtotal || 0
                        }
                        discountAmount={
                            sales?.discountAmount || 0
                        }
                        taxableAmount={
                            sales?.taxableAmount || 0
                        }
                        vatRate={
                            sales?.vatRate || 0
                        }
                        vatAmount={
                            sales?.vatAmount || 0
                        }
                        totalAmount={
                            sales?.totalAmount || 0
                        }
                        narration={
                            sales?.narration
                        }
                    />
                )}

                {type === "receipt" && (
                    <ReceiptPreview
                        date={date}
                        customer={receipt?.customer}
                        selectedInvoice={
                            receipt?.selectedInvoice
                        }
                        receiptAmount={
                            receipt?.receiptAmount
                        }
                        narration={
                            receipt?.narration
                        }
                    />
                )}
            </div>
        </div>
    );
}
