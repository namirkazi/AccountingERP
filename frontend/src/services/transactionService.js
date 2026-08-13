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