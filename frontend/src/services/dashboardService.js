import { apiRequest } from "./api";

export function getDashboardBalances() {

    return apiRequest(
        "accounting/balances.php",
        {
            method: "GET"
        }
    );
}