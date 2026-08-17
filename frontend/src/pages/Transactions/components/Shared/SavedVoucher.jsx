import { FileText } from "lucide-react";
import { useRef, useState } from "react";

import PrintableVoucher
    from "../../../../components/accounting/PrintableVoucher";

import styles
    from "../../Transactions.module.css";
import { generateVoucherPDF } from "../../../../utils/generateVoucherPDF";


export default function SavedVoucher({
    type,
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
    paymentAccount,

    selectedPaymentBill,
    selectedReceiptBill,

    receiptAmount,

    narration,

    closeSavedVoucher
}) {

    const voucherRef = useRef(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleSavePdf = async () => {
        if (!voucherRef.current || isGeneratingPdf) return;

        try {
            setIsGeneratingPdf(true);

            await generateVoucherPDF(voucherRef.current, {
                fileName: `${String(voucherNumber || title)
                    .replace(/[^a-z0-9/_-]+/gi, "-")
                    .replace(/\//g, "-")}.pdf`
            });
        } catch (error) {
            console.error("Failed to generate voucher PDF:", error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const title =
        type === "payment"
            ? "Payment Voucher"
            : type === "expense"
                ? "Expense Voucher"
                : type === "sale"
                    ? "Sales Voucher"
                    : type === "receipt"
                        ? "Receipt Voucher"
                        : "Transaction Voucher";


    return (

        <div className={styles.savedVoucherOverlay}>

            <div className={styles.savedVoucherToolbar}>

                <div>

                    <span>
                        SAVED VOUCHER
                    </span>

                    <strong>
                        {title}
                    </strong>

                </div>


                <div
                    className={
                        styles.savedVoucherActions
                    }
                >

                    <button
                        type="button"
                        className={
                            styles.printVoucherButton
                        }
                        onClick={handleSavePdf}
                        disabled={isGeneratingPdf}
                    >

                        <FileText
                            size={17}
                        />

                        {isGeneratingPdf ? "Generating PDF..." : "Print / Save PDF"}

                    </button>


                    <button
                        type="button"
                        className={
                            styles.closeVoucherButton
                        }
                        onClick={closeSavedVoucher}
                    >

                        Close

                    </button>

                </div>

            </div>


            <div
                ref={voucherRef}
                className={styles.printableVoucherPaper}
            >

                <PrintableVoucher

                    type={type}

                    date={date}

                    party={party}

                    referenceNumber={
                        referenceNumber
                    }

                    voucherNumber={
                        voucherNumber
                    }

                    items={items}

                    amount={amount}

                    discountAmount={
                        discountAmount
                    }

                    vatRate={
                        vatRate
                    }

                    vatAmount={
                        vatAmount
                    }

                    totalAmount={
                        totalAmount
                    }

                    paymentAmount={
                        paymentAmount
                    }

                    paymentAccount={
                        paymentAccount
                    }

                    selectedPaymentBill={
                        selectedPaymentBill
                    }
                    selectedReceiptBill={
                        selectedReceiptBill
                    }

                    receiptAmount={
                        receiptAmount
                    }
                    narration={
                        narration
                    }

                />

            </div>

        </div>

    );
}
