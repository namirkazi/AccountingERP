import styles from "./PrintableCapitalVoucher.module.css";


function formatAmount(value) {

    return Number(value || 0).toLocaleString(
        "en-AE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function numberToWords(number) {

    const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen"
    ];

    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety"
    ];


    function convertBelowThousand(value) {

        let result = "";


        if (value >= 100) {

            result +=
                ones[Math.floor(value / 100)] +
                " Hundred";

            value %= 100;

            if (value > 0) {
                result += " ";
            }

        }


        if (value >= 20) {

            result +=
                tens[Math.floor(value / 10)];

            value %= 10;

            if (value > 0) {
                result +=
                    " " + ones[value];
            }

        } else if (value > 0) {

            result += ones[value];

        }


        return result;

    }


    number = Math.floor(
        Number(number || 0)
    );


    if (number === 0) {
        return "Zero";
    }


    let result = "";


    if (number >= 1000000000) {

        result +=
            convertBelowThousand(
                Math.floor(number / 1000000000)
            ) +
            " Billion";

        number %= 1000000000;

        if (number > 0) {
            result += " ";
        }

    }


    if (number >= 1000000) {

        result +=
            convertBelowThousand(
                Math.floor(number / 1000000)
            ) +
            " Million";

        number %= 1000000;

        if (number > 0) {
            result += " ";
        }

    }


    if (number >= 1000) {

        result +=
            convertBelowThousand(
                Math.floor(number / 1000)
            ) +
            " Thousand";

        number %= 1000;

        if (number > 0) {
            result += " ";
        }

    }


    if (number > 0) {

        result +=
            convertBelowThousand(number);

    }


    return result;

}


function amountInWords(value) {

    const amount =
        Number(value || 0);

    const dirhams =
        Math.floor(amount);

    const fils =
        Math.round(
            (amount - dirhams) * 100
        );


    let words =
        numberToWords(dirhams);


    words +=
        dirhams === 1
            ? " Dirham"
            : " Dirhams";


    if (fils > 0) {

        words +=
            ` and ${fils} Fils`;

    }


    return `${words} Only`;

}


function formatDate(date) {

    if (!date) {
        return "—";
    }


    const parsed =
        new Date(date);


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return date;
    }


    return parsed.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


export default function PrintableCapitalVoucher({
    voucherNumber,
    date,
    amount,
    cashAmount,
    bankAmount,
    narration,
    preparedBy = "",
    authorizedBy = ""
}) {

    const capitalAmount =
        Number(amount || 0);


    return (

        <div className={styles.voucher}>

            {/* =========================================
                COMPANY HEADER
            ========================================= */}

            <div className={styles.companyHeader}>

                <div className={styles.companyName}>
                    MOHINII GENERAL TRADING L.L.C
                </div>

                <div className={styles.companyLocation}>
                    DUBAI
                </div>

                <div className={styles.companyEmirate}>
                    Emirate : Dubai
                </div>

            </div>


            {/* =========================================
                TITLE
            ========================================= */}

            <div className={styles.voucherTitle}>
                CAPITAL TRANSFER VOUCHER
            </div>


            {/* =========================================
                NUMBER / DATE
            ========================================= */}

            <div className={styles.topDetails}>

                <div className={styles.detailBlock}>

                    <span>
                        No.
                    </span>

                    <span>
                        :
                    </span>

                    <strong>
                        {voucherNumber || "—"}
                    </strong>

                </div>


                <div className={styles.detailBlock}>

                    <span>
                        Date
                    </span>

                    <span>
                        :
                    </span>

                    <strong>
                        {formatDate(date)}
                    </strong>

                </div>

            </div>


            {/* =========================================
                INVESTOR
            ========================================= */}
            <div className={styles.transferSummary}>

                <div className={styles.transferRow}>

                    <span>
                        Capital Account :
                    </span>

                    <strong>
                        AED {formatAmount(amount)}
                    </strong>

                </div>


                <div className={styles.transferRow}>

                    <span>
                        Cash : 
                    </span>

                    <strong>
                        AED {formatAmount(cashAmount)}
                    </strong>

                </div>


                <div className={styles.transferRow}>

                    <span>
                        Bank : 
                    </span>

                    <strong>
                        AED {formatAmount(bankAmount)}
                    </strong>

                </div>

            </div>
            {/* =========================================
                PARTICULARS
            ========================================= */}

            <table className={styles.particularsTable}>

                <thead>

                    <tr>

                        <th>
                            Particulars
                        </th>

                        <th className={styles.amountColumn}>
                            Amount (AED)
                        </th>

                    </tr>

                </thead>


                <tbody>

                    <tr>

                        <td>

                            <strong>
                                Transfer from Capital
                            </strong>

                            <span className={styles.description}>
                                Amount withdrawn from the Capital account
                                and allocated between Cash and Bank.
                            </span>

                        </td>

                        <td className={styles.amountColumn}>

                            {formatAmount(amount)}

                        </td>

                    </tr>


                    <tr>

                        <td>

                            <strong>
                                Cash Allocation
                            </strong>

                        </td>

                        <td className={styles.amountColumn}>

                            {formatAmount(cashAmount)}

                        </td>

                    </tr>


                    <tr>

                        <td>

                            <strong>
                                Bank Allocation
                            </strong>

                        </td>

                        <td className={styles.amountColumn}>

                            {formatAmount(bankAmount)}

                        </td>

                    </tr>


                    <tr className={styles.totalRow}>

                        <td>
                            TOTAL TRANSFERRED
                        </td>

                        <td className={styles.amountColumn}>

                            {formatAmount(amount)}

                        </td>

                    </tr>

                </tbody>

            </table>


            {/* =========================================
                AMOUNT IN WORDS
            ========================================= */}

            <div className={styles.wordsSection}>

                <span>
                    Amount in Words :
                </span>

                <strong>
                    {amountInWords(
                        capitalAmount
                    )}
                </strong>

            </div>


            {/* =========================================
                ACCOUNTING DESCRIPTION
            ========================================= */}

            <div className={styles.accountingSection}>

                <div className={styles.accountingRow}>

                    <span>
                        Transaction Type
                    </span>

                    <strong>
                        Capital Transfer
                    </strong>

                </div>


                <div className={styles.accountingRow}>

                    <span>
                        Capital Transferred
                    </span>

                    <strong>
                        AED {formatAmount(amount)}
                    </strong>

                </div>

                <div className={styles.accountingRow}>

                    <span>
                        Cash Allocation
                    </span>

                    <strong>
                        AED {formatAmount(cashAmount)}
                    </strong>

                </div>

                <div className={styles.accountingRow}>

                    <span>
                        Bank Allocation
                    </span>

                    <strong>
                        AED {formatAmount(bankAmount)}
                    </strong>

                </div>

            </div>


            {/* =========================================
                SIGNATURES
            ========================================= */}

            <div className={styles.signatures}>

                <div className={styles.signatureBox}>

                    <div className={styles.signatureLine} />

                    <strong>
                        Prepared By
                    </strong>

                    <span>
                        {preparedBy || " "}
                    </span>

                </div>


                <div className={styles.signatureBox}>

                    <div className={styles.signatureLine} />

                    <strong>
                        Accountant
                    </strong>

                    <span>
                        {preparedBy || " "}
                    </span>

                </div>


                <div className={styles.signatureBox}>

                    <div className={styles.signatureLine} />

                    <strong>
                        Authorized By
                    </strong>

                    <span>
                        {authorizedBy || " "}
                    </span>

                </div>

            </div>


            <div className={styles.footer}>
                This document is generated electronically and forms part of the company's accounting records.
            </div>

        </div>

    );

}