export function printVoucher({
    type,
    party,
    referenceNumber,
    selectedPaymentExpense
}) {
    const supplierName =
        party?.party_name ||
        selectedPaymentExpense?.party_name ||
        party?.name ||
        party?.company_name ||
        "Supplier";


    const reference =
        type === "payment"
            ? (
                selectedPaymentExpense
                    ?.reference_number ||
                referenceNumber ||
                "Voucher"
            )
            : (
                referenceNumber ||
                "Voucher"
            );


    const cleanSupplier =
        String(supplierName)
            .replace(
                /[<>:"/\\|?*]/g,
                ""
            )
            .trim();


    const cleanReference =
        String(reference)
            .replace(
                /[<>:"/\\|?*]/g,
                ""
            )
            .trim();


    const originalTitle =
        document.title;


    document.title =
        `${cleanReference} - ${cleanSupplier}`;


    window.print();


    setTimeout(() => {

        document.title =
            originalTitle;

    }, 1000);
}