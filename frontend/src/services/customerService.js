import { apiRequest } from "./api";

export function getCustomers(search = "") {

    const query = search
        ? `?search=${encodeURIComponent(search)}`
        : "";

    return apiRequest(
        `customers/index.php${query}`,
        {
            method: "GET"
        }
    );
}

export function createCustomer(customer) {

    return apiRequest(
        "customers/index.php",
        {
            method: "POST",
            body: JSON.stringify(customer)
        }
    );
}

export function updateCustomer(id, customer) {

    return apiRequest(
        `customers/index.php?id=${id}`,
        {
            method: "PUT",
            body: JSON.stringify(customer)
        }
    );
}

export function deleteCustomer(id) {

    return apiRequest(
        `customers/index.php?id=${id}`,
        {
            method: "DELETE"
        }
    );
}