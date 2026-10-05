import { apiRequest } from "./api";


export function searchFundParties(search = "") {
  return apiRequest(
    `funds/parties.php?search=${encodeURIComponent(search)}`,
    {
      method: "GET",
    },
  );
}


export function createFundParty(data) {
  return apiRequest(
    "funds/parties.php",
    {
      method: "POST",

      body: JSON.stringify({
        party_name: data.party_name,
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
      }),
    },
  );
}


export function getFundPartyBalance(partyId) {
  if (!partyId) {
    throw new Error("Party ID is required.");
  }

  return apiRequest(
    `funds/party_balance.php?party_id=${encodeURIComponent(
      partyId,
    )}`,
    {
      method: "GET",
    },
  );
}


export function createFundTransaction(data) {
  return apiRequest(
    "funds/create_transaction.php",
    {
      method: "POST",

      body: JSON.stringify(data),
    },
  );
}
export function getFundDashboard() {
  return apiRequest(
    "funds/dashboard.php",
    {
      method: "GET",
    },
  );
}
export function getFundLedger(filters = {}) {

  const params =
    new URLSearchParams();


  if (filters.search?.trim()) {

    params.set(
      "search",
      filters.search.trim(),
    );
  }


  if (filters.type) {

    params.set(
      "type",
      filters.type,
    );
  }


  if (filters.partyId) {

    params.set(
      "party_id",
      String(
        filters.partyId,
      ),
    );
  }


  if (filters.dateFrom) {

    params.set(
      "date_from",
      filters.dateFrom,
    );
  }


  if (filters.dateTo) {

    params.set(
      "date_to",
      filters.dateTo,
    );
  }


  const query =
    params.toString();


  return apiRequest(
    `funds/ledger.php${
      query
        ? `?${query}`
        : ""
    }`,
    {
      method: "GET",
    },
  );
}