import { apiRequest } from "./api";

export function getExpenseAccounts() {
    return apiRequest(
        "accounting/expense_accounts.php",
        {
            method: "GET"
        }
    );
}

export function createExpenseAccount(name) {
    return apiRequest(
        "accounting/create_expense_account.php",
        {
            method: "POST",
            body: JSON.stringify({
                account_name: name
            })
        }
    );
}

export function createExpense(data) {
    return apiRequest(
        "accounting/expense.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export function getPendingExpenses() {
    return apiRequest(
        "accounting/pending_expenses.php",
        {
            method: "GET"
        }
    );
}