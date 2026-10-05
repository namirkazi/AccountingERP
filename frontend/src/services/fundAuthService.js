import { apiRequest } from "./api";

export function fundLogin(username, password) {
  return apiRequest("funds/auth/login.php", {
    method: "POST",

    body: JSON.stringify({
      username,
      password,
    }),
  });
}

export function fundLogout() {
  return apiRequest("funds/auth/logout.php", {
    method: "POST",
  });
}

export function getCurrentFundUser() {
  return apiRequest("funds/auth/me.php", {
    method: "GET",
  });
}