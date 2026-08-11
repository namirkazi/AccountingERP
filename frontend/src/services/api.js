const API_BASE =
    "http://localhost/AccountingERP/backend/api/";

export async function apiRequest(
    endpoint,
    options = {}
) {

    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            credentials: "include",

            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },

            ...options
        }
    );

    const contentType =
        response.headers.get("content-type") || "";

    const text =
        await response.text();

    let data;

    if (contentType.includes("application/json")) {

        try {

            data = JSON.parse(text);

        } catch (error) {

            console.error(
                "Invalid JSON received from API:",
                text
            );

            throw new Error(
                "The server returned invalid JSON."
            );
        }

    } else {

        console.error(
            "Non-JSON response received from API:",
            text
        );

        throw new Error(
            "The server returned an unexpected response. Check the PHP error."
        );
    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Something went wrong."
        );
    }


    if (data.success === false) {

        throw new Error(
            data.message ||
            "Request failed."
        );
    }


    return data;
}