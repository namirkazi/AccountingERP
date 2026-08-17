import { apiRequest } from "./api";

export function createTransaction(data) {
    return apiRequest(
        "accounting/transactions.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export function getNextSalesBillNumber(date) {

    const query =
        date
            ? `?date=${encodeURIComponent(date)}`
            : "";

    return apiRequest(
        `accounting/next_sales_bill_number.php${query}`,
        {
            method: "GET"
        }
    );
}
export function getNextReceiptNumber(date) {

    const query =
        date
            ? `?date=${encodeURIComponent(date)}`
            : "";

    return apiRequest(
        `accounting/next_receipt_number.php${query}`,
        {
            method: "GET"
        }
    );
}
export function searchReceiptInvoices(search) {
    return apiRequest(
        `accounting/receipt_invoices.php?search=${encodeURIComponent(search)}`,
        {
            method: "GET"
        }
    );

}
export function getAvailableCapital() {

    return apiRequest(
        "accounting/capital_balance.php",
        {
            method: "GET"
        }
    );

}
