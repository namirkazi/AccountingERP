import {
    FileText
} from "lucide-react";

import {
    useRef,
    useState
} from "react";

import PrintableCapitalVoucher from "./PrintableCapitalVoucher";

import styles from "./SavedCapitalVoucher.module.css";

import {
    generateVoucherPDF} from "../../utils/generateVoucherPDF"


export default function SavedCapitalVoucher({

    voucherNumber,
    date,

    amount,
    cashAmount,
    bankAmount,

    narration,

    preparedBy,
    authorizedBy,

    closeSavedVoucher

}) {

    const voucherRef =
        useRef(null);


    const [
        isGeneratingPdf,
        setIsGeneratingPdf
    ] = useState(false);


    const handleSavePdf =
        async () => {

            if (
                !voucherRef.current ||
                isGeneratingPdf
            ) {
                return;
            }


            try {

                setIsGeneratingPdf(true);


                const fileName =
                    String(
                        voucherNumber ||
                        "Capital-Contribution-Voucher"
                    )
                        .replace(
                            /[^a-z0-9/_-]+/gi,
                            "-"
                        )
                        .replace(
                            /\//g,
                            "-"
                        );


                await generateVoucherPDF(
                    voucherRef.current,
                    {
                        fileName:
                            `${fileName}.pdf`
                    }
                );


            } catch (error) {

                console.error(
                    "Failed to generate capital voucher PDF:",
                    error
                );

            } finally {

                setIsGeneratingPdf(false);

            }

        };


    return (

        <div
            className={
                styles.savedVoucherOverlay
            }
        >

            {/* =========================================
                TOOLBAR
            ========================================= */}

            <div
                className={
                    styles.savedVoucherToolbar
                }
            >

                <div>

                    <span>
                        SAVED VOUCHER
                    </span>

                    <strong>
                        Capital Transfer Voucher
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
                        onClick={
                            handleSavePdf
                        }
                        disabled={
                            isGeneratingPdf
                        }
                    >

                        <FileText
                            size={17}
                        />

                        {isGeneratingPdf
                            ? "Generating PDF..."
                            : "Print / Save PDF"
                        }

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


            {/* =========================================
                PRINTABLE PAPER
            ========================================= */}

            <div
                ref={voucherRef}
                className={
                    styles.printableVoucherPaper
                }
            >

                <PrintableCapitalVoucher

                    voucherNumber={
                        voucherNumber
                    }

                    date={
                        date
                    }

                    amount={
                        amount
                    }

                    cashAmount={
                        cashAmount
                    }

                    bankAmount={
                        bankAmount
                    }

                    narration={
                        narration
                    }

                    preparedBy={
                        preparedBy
                    }

                    authorizedBy={
                        authorizedBy
                    }

                />

            </div>

        </div>

    );

}