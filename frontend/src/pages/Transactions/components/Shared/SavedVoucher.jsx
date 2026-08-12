import { FileText } from "lucide-react";
import PrintableVoucher from "../../../../components/accounting/PrintableVoucher";
import styles from "../../Transactions.module.css";

export default function SavedVoucher({
    type,
    currentType,
    date,
    party,
    referenceNumber,
    voucherNumber,
    items = [],
    amount,
    discountAmount,
    vatRate,
    vatAmount,
    totalAmount,
    paymentAmount,
    accountId,
    selectedPaymentExpense,
    narration,
    printVoucher,
    closeSavedVoucher
}) {

    return (

        <div className={styles.savedVoucherOverlay}>

            <div className={styles.savedVoucherToolbar}>

                <div>

                    <span>
                        SAVED VOUCHER
                    </span>

                    <strong>
                        {type === "payment"
                            ? "Payment Voucher"
                            : type === "expense"
                                ? "Expense Voucher"
                                : `${currentType.label} Voucher`
                        }
                    </strong>

                </div>


                <div className={styles.savedVoucherActions}>

                    <button
                        type="button"
                        className={
                            styles.printVoucherButton
                        }
                        onClick={printVoucher}
                    >

                        <FileText
                            size={17}
                        />

                        Print / Save PDF

                    </button>


                    <button
                        type="button"
                        className={
                            styles.closeVoucherButton
                        }
                        onClick={
                            closeSavedVoucher
                        }
                    >

                        Close

                    </button>

                </div>

            </div>


            <div className={styles.printableVoucherPaper}>

                <PrintableVoucher

                    type={type}

                    date={date}

                    party={party}

                    referenceNumber={
                        referenceNumber
                    }

                    voucherNumber={voucherNumber}

                    items={items}

                    amount={amount}

                    discountAmount={
                        discountAmount
                    }

                    vatRate={vatRate}

                    vatAmount={vatAmount}

                    totalAmount={totalAmount}

                    paymentAmount={
                        paymentAmount
                    }

                    paymentAccount={
                        accountId
                    }

                    selectedPaymentExpense={
                        selectedPaymentExpense
                    }

                    narration={
                        narration
                    }

                />

            </div>

        </div>

    );
}
