import { apiRequest } from "./api";


export function getCustomerServices(customerId) {

    return apiRequest(
        `accounting/customer_services.php?customer_id=${encodeURIComponent(customerId)}`,
        {
            method: "GET"
        }
    );

}


export function createCustomerService(data) {

    return apiRequest(
        "accounting/customer_services.php",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );

}