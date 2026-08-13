import { apiRequest } from "./api";


export async function getSupplierItems(
    supplierId
) {

    if (!supplierId) {
        return [];
    }


    const response =
        await apiRequest(
            `accounting/supplier_items.php?supplier_id=${supplierId}`
        );


    return response?.items || [];
}


export async function createSupplierItem(
    payload
) {

    const response =
        await apiRequest(
            "accounting/supplier_items.php",
            {
                method: "POST",

                body: JSON.stringify(
                    payload
                )
            }
        );


    return response?.item || null;
}


export async function updateSupplierItem(
    payload
) {

    const response =
        await apiRequest(
            "accounting/supplier_items.php",
            {
                method: "PUT",

                body: JSON.stringify(
                    payload
                )
            }
        );


    return response;
}


export async function deleteSupplierItem(
    id
) {

    const response =
        await apiRequest(
            "accounting/supplier_items.php",
            {
                method: "DELETE",

                body: JSON.stringify({
                    id
                })
            }
        );


    return response;
}