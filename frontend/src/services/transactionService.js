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

export function getNextSalesBillNumber() {
    return apiRequest(
        "accounting/next_sales_bill_number.php",
        {
            method: "GET"
        }
    );
}