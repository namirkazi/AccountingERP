export function calculateSalesTotals({
    items = [],
    vatRate = 5,
    discount = 0
}) {
    const subtotal =
        items.reduce(
            (sum, item) =>
                sum +
                (Number(item.amount) || 0),
            0
        );

    const requestedDiscount =
        Number(discount) || 0;

    const discountAmount =
        Math.min(
            requestedDiscount,
            subtotal
        );

    const taxableAmount =
        Math.max(
            0,
            subtotal -
            discountAmount
        );

    const vatAmount =
        taxableAmount *
        (Number(vatRate) || 0) /
        100;

    const totalAmount =
        taxableAmount +
        vatAmount;


    return {
        subtotal,
        discountAmount,
        taxableAmount,
        vatAmount,
        totalAmount
    };
}