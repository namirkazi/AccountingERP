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
export async function getNextSalesBillNumber() {

    const response = await api.get(
        "/accounting/next_sales_bill_number.php"
    );

    return response.data;

}