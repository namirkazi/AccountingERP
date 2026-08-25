import { apiRequest } from "./api";

/*
 * =========================================================
 * GET COMPANY PROFILE
 * =========================================================
 */

export function getCompanyProfile() {
  return apiRequest("company/profile.php", {
    method: "GET",
  });
}

/*
 * =========================================================
 * UPDATE COMPANY PROFILE
 * =========================================================
 */

export function updateCompanyProfile(formData) {
  return apiRequest("company/update_profile.php", {
    method: "POST",
    body: formData,
  });
}
export function createCompany(formData) {
  return apiRequest("company/create.php", {
    method: "POST",
    body: formData,
  });
}
