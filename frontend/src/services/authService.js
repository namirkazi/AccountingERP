import { apiRequest } from "./api";

export function login(username, password) {

    return apiRequest("auth/login.php", {
        method: "POST",

        body: JSON.stringify({
            username,
            password
        })
    });
}

export function logout() {

    return apiRequest("auth/logout.php", {
        method: "POST"
    });
}

export function getCurrentUser() {

    return apiRequest("auth/me.php", {
        method: "GET"
    });
}