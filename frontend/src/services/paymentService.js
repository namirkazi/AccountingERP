import { apiRequest } from "./api";

export function searchPaymentExpenses(search) {
    return apiRequest(
        `accounting/payment_expenses.php?search=${encodeURIComponent(search)}`,
        {
            method: "GET"
        }
    );
}

export function getPaymentHistory(expenseId) {
    return apiRequest(
        `accounting/payment_history.php?expense_id=${expenseId}`,
        {
            method: "GET"
        }
    );
}

export function createPayment(data) {
    return apiRequest(
        "accounting/create_payment.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export function updatePayment(data) {
    return apiRequest(
        "accounting/update_payment.php",
        {
            method: "PUT",
            body: JSON.stringify(data)
        }
    );
}