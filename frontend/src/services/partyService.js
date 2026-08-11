import { apiRequest } from "./api";


export function searchCustomers(query) {

    return apiRequest(
        `customers/search.php?q=${encodeURIComponent(query)}`,
        {
            method: "GET"
        }
    );
}


export function createCustomer(data) {

    return apiRequest(
        "customers/create.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}


/*
|--------------------------------------------------------------------------
| SUPPLIERS
|--------------------------------------------------------------------------
*/

export function searchSuppliers(query) {

    return apiRequest(
        `suppliers/search.php?q=${encodeURIComponent(query)}`,
        {
            method: "GET"
        }
    );
}


export function createSupplier(data) {

    return apiRequest(
        "suppliers/create.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}