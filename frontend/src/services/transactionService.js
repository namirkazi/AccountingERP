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