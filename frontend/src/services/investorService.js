import { apiRequest } from "./api";


export function searchInvestors(search = "") {

    const query =
        new URLSearchParams();

    if (search.trim()) {
        query.set(
            "search",
            search.trim()
        );
    }

    return apiRequest(
        `accounting/investors.php?${query.toString()}`,
        {
            method: "GET"
        }
    );
}


export function createInvestor(data) {

    return apiRequest(
        "accounting/investors.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}