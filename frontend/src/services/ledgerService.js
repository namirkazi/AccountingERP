import { apiRequest } from "./api";


export function getLedger(params = {}) {

    const query =
        new URLSearchParams();


    if (params.search) {

        query.set(
            "search",
            params.search
        );
    }


    if (params.dateFrom) {

        query.set(
            "date_from",
            params.dateFrom
        );
    }


    if (params.dateTo) {

        query.set(
            "date_to",
            params.dateTo
        );
    }


    (
        params.accountIds || []
    ).forEach((id) => {

        query.append(
            "account_ids[]",
            id
        );

    });


    (
        params.voucherTypes || []
    ).forEach((type) => {

        query.append(
            "voucher_types[]",
            type
        );

    });


    (
        params.partyIds || []
    ).forEach((id) => {

        query.append(
            "party_ids[]",
            id
        );

    });


    const queryString =
        query.toString();


    return apiRequest(
        `accounting/ledger.php${queryString
            ? `?${queryString}`
            : ""
        }`,
        {
            method: "GET"
        }
    );
}
export function getVoucher(voucherId) {
    if (!voucherId) {
        throw new Error(
            "Voucher ID is required."
        );
    }

    return apiRequest(
        `accounting/view_voucher.php?id=${encodeURIComponent(
            voucherId
        )}`,
        {
            method: "GET",
        }
    );
}