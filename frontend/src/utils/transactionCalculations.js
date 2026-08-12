export function calculateExpenseTotals({
    amount,
    vatRate,
    discount,
    discountMode
}) {
    const grossAmount =
        Number(amount) || 0;

    const enteredDiscount =
        Number(discount) || 0;

    const vatPercentage =
        Number(vatRate) || 0;


    /*
     * BEFORE TAX
     */

    const beforeTaxDiscount =
        discountMode === "before_tax"
            ? Math.min(
                enteredDiscount,
                grossAmount
            )
            : 0;

    const beforeTaxTaxable =
        Math.max(
            0,
            grossAmount -
            beforeTaxDiscount
        );

    const beforeTaxVat =
        beforeTaxTaxable *
        vatPercentage /
        100;

    const beforeTaxTotal =
        beforeTaxTaxable +
        beforeTaxVat;


    /*
     * AFTER TAX
     */

    const afterTaxVat =
        grossAmount *
        vatPercentage /
        100;

    const afterTaxTotalBeforeDiscount =
        grossAmount +
        afterTaxVat;

    const afterTaxDiscount =
        discountMode === "after_tax"
            ? Math.min(
                enteredDiscount,
                afterTaxTotalBeforeDiscount
            )
            : 0;

    const afterTaxTotal =
        Math.max(
            0,
            afterTaxTotalBeforeDiscount -
            afterTaxDiscount
        );


    /*
     * FINAL VALUES
     */

    const discountAmount =
        discountMode === "after_tax"
            ? afterTaxDiscount
            : beforeTaxDiscount;

    const taxableAmount =
        discountMode === "after_tax"
            ? grossAmount
            : beforeTaxTaxable;

    const vatAmount =
        discountMode === "after_tax"
            ? afterTaxVat
            : beforeTaxVat;

    const totalAmount =
        discountMode === "after_tax"
            ? afterTaxTotal
            : beforeTaxTotal;


    return {
        grossAmount,
        discountAmount,
        taxableAmount,
        vatAmount,
        totalAmount,

        beforeTaxDiscount,
        beforeTaxTaxable,
        beforeTaxVat,
        beforeTaxTotal,

        afterTaxDiscount,
        afterTaxVat,
        afterTaxTotalBeforeDiscount,
        afterTaxTotal
    };
}