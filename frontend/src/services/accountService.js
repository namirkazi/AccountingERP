import { apiRequest } from "./api";

export function getAccounts() {
    return apiRequest(
        "accounting/accounts.php",
        {
            method: "GET"
        }
    );
}

export function saveOpeningBalance(data) {
    return apiRequest(
        "accounting/opening.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}
export function createExpenseHead(data) {
    return apiRequest(
        "accounting/create_expense_heads.php",
        {
            method: "POST",
            body: JSON.stringify({
                account_name: accountName
            })
        }
    );
}