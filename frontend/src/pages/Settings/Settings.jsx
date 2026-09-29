import {
  Building2,
  CheckCircle2,
  Landmark,
  Pencil,
  Plus,
  Power,
  Save,
  Upload,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import AppLayout from "../../components/layout/AppLayout";

import styles from "./Settings.module.css";

import {
  getCompanyProfile,
  updateCompanyProfile,
} from "../../services/companyService";

import { apiRequest } from "../../services/api";

export default function Settings() {
  const fileInputRef = useRef(null);

  /*
   * =====================================================
   * COMPANY PROFILE STATE
   * =====================================================
   */

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [logoPreview, setLogoPreview] = useState("");

  const [logoFile, setLogoFile] = useState(null);

  const [form, setForm] = useState({
    name: "",

    address: "",

    city: "",

    country: "",

    phone: "",

    email: "",

    website: "",

    trn: "",

    primary_color: "",

    secondary_color: "",

    accent_color: "",
  });

  /*
   * =====================================================
   * BANK ACCOUNT STATE
   * =====================================================
   */

  const [bankAccounts, setBankAccounts] = useState([]);

  const [bankLoading, setBankLoading] = useState(true);

  const [bankSaving, setBankSaving] = useState(false);

  const [showBankForm, setShowBankForm] = useState(false);

  const [editingBankId, setEditingBankId] = useState(null);

  const [bankForm, setBankForm] = useState({
    bank_name: "",

    account_name: "",

    account_number: "",

    iban: "",

    currency: "AED",
  });

  /*
   * =====================================================
   * LOAD COMPANY PROFILE
   * =====================================================
   */

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);

        setError("");

        const response = await getCompanyProfile();

        const company = response?.company || response?.data?.company || {};

        setForm({
          name: company.name || "",

          address: company.address || "",

          city: company.city || "",

          country: company.country || "",

          phone: company.phone || "",

          email: company.email || "",

          website: company.website || "",

          trn: company.trn || "",

          primary_color: company.theme?.primary || "",

          secondary_color: company.theme?.secondary || "",

          accent_color: company.theme?.accent || "",
        });

        setLogoPreview(company.logo_data || "");
      } catch (requestError) {
        console.error("Company profile error:", requestError);

        setError(requestError.message || "Unable to load company profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();

    loadBankAccounts();
  }, []);

  /*
   * =====================================================
   * LOAD BANK ACCOUNTS
   * =====================================================
   */

  async function loadBankAccounts() {
    try {
      setBankLoading(true);

      const response = await apiRequest(
        "bank_accounts/list.php?include_inactive=1",
        {
          method: "GET",
        },
      );

      setBankAccounts(response?.data?.bank_accounts || []);
    } catch (requestError) {
      console.error("Bank account loading error:", requestError);

      setError(requestError.message || "Unable to load bank accounts.");
    } finally {
      setBankLoading(false);
    }
  }

  /*
   * =====================================================
   * COMPANY INPUT HANDLER
   * =====================================================
   */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,

      [name]: value,
    }));

    setMessage("");
  }

  /*
   * =====================================================
   * LOGO
   * =====================================================
   */

  function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be smaller than 5 MB.");

      return;
    }

    setLogoFile(file);

    setLogoPreview(URL.createObjectURL(file));

    setError("");

    setMessage("");
  }

  /*
   * =====================================================
   * SAVE COMPANY PROFILE
   * =====================================================
   */

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);

    setError("");

    setMessage("");

    try {
      const formData = new FormData();

      formData.append("name", form.name.trim());

      formData.append("address", form.address.trim());

      formData.append("city", form.city.trim());

      formData.append("country", form.country.trim());

      formData.append("phone", form.phone.trim());

      formData.append("email", form.email.trim());

      formData.append("website", form.website.trim());

      formData.append("trn", form.trn.trim());

      formData.append("primary_color", form.primary_color);

      formData.append("secondary_color", form.secondary_color);

      formData.append("accent_color", form.accent_color);

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await updateCompanyProfile(formData);

      const company = response?.company || response?.data?.company || null;

      if (company) {
        setLogoPreview(company.logo_data || logoPreview);
      }

      setLogoFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage(response?.message || "Company profile saved successfully.");
    } catch (requestError) {
      console.error("Company profile save error:", requestError);

      setError(requestError.message || "Unable to save company profile.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =====================================================
   * BANK FORM HANDLER
   * =====================================================
   */

  function handleBankChange(event) {
    const { name, value } = event.target;

    setBankForm((current) => ({
      ...current,

      [name]: value,
    }));

    setError("");

    setMessage("");
  }

  /*
   * =====================================================
   * OPEN ADD BANK FORM
   * =====================================================
   */

  function openBankForm() {
    setEditingBankId(null);

    setBankForm({
      bank_name: "",

      account_name: "",

      account_number: "",

      iban: "",

      currency: "AED",
    });

    setShowBankForm(true);

    setError("");

    setMessage("");
  }

  /*
   * =====================================================
   * OPEN EDIT BANK FORM
   * =====================================================
   */

  function openEditBankForm(account) {
    setEditingBankId(account.id);

    setBankForm({
      bank_name: account.bank_name || "",

      account_name: account.account_name || "",

      account_number: account.account_number || "",

      iban: account.iban || "",

      currency: account.currency || "AED",
    });

    setShowBankForm(true);

    setError("");

    setMessage("");
  }

  /*
   * =====================================================
   * CLOSE BANK FORM
   * =====================================================
   */

  function closeBankForm() {
    if (bankSaving) {
      return;
    }

    setShowBankForm(false);

    setEditingBankId(null);

    setBankForm({
      bank_name: "",

      account_name: "",

      account_number: "",

      iban: "",

      currency: "AED",
    });
  }

  /*
   * =====================================================
   * SAVE BANK ACCOUNT
   * =====================================================
   */

  async function handleBankSubmit(event) {
    event.preventDefault();

    setBankSaving(true);

    setError("");

    setMessage("");

    try {
      const payload = {
        bank_name: bankForm.bank_name.trim(),

        account_name: bankForm.account_name.trim(),

        account_number: bankForm.account_number.trim(),

        iban: bankForm.iban.trim(),

        currency: bankForm.currency.trim().toUpperCase(),
      };

      let response;

      if (editingBankId) {
        response = await apiRequest("bank_accounts/update.php", {
          method: "PUT",

          body: JSON.stringify({
            id: editingBankId,

            ...payload,
          }),
        });
      } else {
        response = await apiRequest("bank_accounts/create.php", {
          method: "POST",

          body: JSON.stringify(payload),
        });
      }

      setShowBankForm(false);

      setEditingBankId(null);

      setBankForm({
        bank_name: "",

        account_name: "",

        account_number: "",

        iban: "",

        currency: "AED",
      });

      await loadBankAccounts();

      setMessage(
        response?.message ||
          (editingBankId
            ? "Bank account updated successfully."
            : "Bank account created successfully."),
      );
    } catch (requestError) {
      console.error("Bank account save error:", requestError);

      setError(requestError.message || "Unable to save bank account.");
    } finally {
      setBankSaving(false);
    }
  }

  /*
   * =====================================================
   * TOGGLE BANK ACCOUNT
   * =====================================================
   */

  async function toggleBankAccount(account) {
    try {
      setError("");

      setMessage("");

      const response = await apiRequest("bank_accounts/toggle.php", {
        method: "PATCH",

        body: JSON.stringify({
          id: account.id,

          is_active: account.is_active ? 0 : 1,
        }),
      });

      await loadBankAccounts();

      setMessage(response?.message || "Bank account updated successfully.");
    } catch (requestError) {
      console.error("Bank account toggle error:", requestError);

      setError(requestError.message || "Unable to update bank account.");
    }
  }

  /*
   * =====================================================
   * MASK ACCOUNT NUMBER
   * =====================================================
   */

  function getMaskedAccountNumber(accountNumber) {
    if (!accountNumber) {
      return "No account number";
    }

    const value = String(accountNumber);

    if (value.length <= 4) {
      return `•••• ${value}`;
    }

    return `•••• ${value.slice(-4)}`;
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <AppLayout>
        <div className={styles.page}>
          <div className={styles.loading}>Loading company profile...</div>
        </div>
      </AppLayout>
    );
  }

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* =================================================
                    HEADER
                ================================================= */}

        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.icon}>
              <Building2 size={22} />
            </div>

            <div>
              <h1>Settings</h1>

              <p>Manage your company profile and branding.</p>
            </div>
          </div>
        </div>

        {/* =================================================
                    ERROR
                ================================================= */}

        {error && <div className={styles.error}>{error}</div>}

        {/* =================================================
                    SUCCESS
                ================================================= */}

        {message && (
          <div className={styles.success}>
            <CheckCircle2 size={17} />

            {message}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* =================================================
                        COMPANY PROFILE
                    ================================================= */}

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Company Profile</h2>

                <p>
                  These details will be used on your bills, invoices and printed
                  documents.
                </p>
              </div>
            </div>

            {/* LOGO */}

            <div className={styles.logoSection}>
              <div className={styles.logoPreview}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Company logo" />
                ) : (
                  <Building2 size={34} />
                )}
              </div>

              <div className={styles.logoInfo}>
                <h3>Company Logo</h3>

                <p>Recommended: square PNG or JPG, up to 5 MB.</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  hidden
                />

                <button
                  type="button"
                  className={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  Change Logo
                </button>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Company Name</label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Company legal name"
                />
              </div>

              <div className={styles.field}>
                <label>TRN / VAT Number</label>

                <input
                  name="trn"
                  value={form.trn}
                  onChange={handleChange}
                  placeholder="100000000000000"
                />
              </div>

              <div className={styles.field}>
                <label>Phone</label>

                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+971..."
                />
              </div>

              <div className={styles.field}>
                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="accounts@company.com"
                />
              </div>

              <div className={styles.field}>
                <label>Website</label>

                <input
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://company.com"
                />
              </div>

              <div className={styles.field}>
                <label>City</label>

                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Dubai"
                />
              </div>

              <div className={styles.field}>
                <label>Country</label>

                <input
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  placeholder="United Arab Emirates"
                />
              </div>

              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label>Address</label>

                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Building, street, area..."
                />
              </div>
            </div>
          </section>

          {/* =================================================
                        BANK ACCOUNTS
                    ================================================= */}

          <section className={styles.card}>
            <div className={styles.cardHeaderWithAction}>
              <div>
                <h2>Bank Accounts</h2>

                <p>
                  Manage the bank accounts used for payments, receipts and
                  opening balances.
                </p>
              </div>

              <button
                type="button"
                className={styles.addButton}
                onClick={openBankForm}
              >
                <Plus size={16} />
                Add Bank Account
              </button>
            </div>

            {bankLoading ? (
              <div className={styles.bankLoading}>Loading bank accounts...</div>
            ) : bankAccounts.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Landmark size={26} />
                </div>

                <h3>No bank accounts</h3>

                <p>
                  Add a bank account to use it for payments, receipts and
                  opening balances.
                </p>

                <button
                  type="button"
                  className={styles.addButton}
                  onClick={openBankForm}
                >
                  <Plus size={16} />
                  Add Bank Account
                </button>
              </div>
            ) : (
              <div className={styles.bankList}>
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`
                                                ${styles.bankItem}
                                                ${
                                                  !account.is_active
                                                    ? styles.bankItemInactive
                                                    : ""
                                                }
                                            `}
                  >
                    <div className={styles.bankIcon}>
                      <Landmark size={20} />
                    </div>

                    <div className={styles.bankDetails}>
                      <div className={styles.bankName}>{account.bank_name}</div>

                      <div className={styles.accountName}>
                        {account.account_name}
                      </div>

                      <div className={styles.bankMeta}>
                        {getMaskedAccountNumber(account.account_number)}

                        {" · "}

                        {account.currency}

                        {account.iban && (
                          <>
                            {" · IBAN "}
                            {account.iban}
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.bankStatus}>
                      <span
                        className={
                          account.is_active
                            ? styles.activeBadge
                            : styles.inactiveBadge
                        }
                      >
                        {account.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className={styles.bankActions}>
                      <button
                        type="button"
                        onClick={() => openEditBankForm(account)}
                        className={styles.iconButton}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleBankAccount(account)}
                        className={styles.iconButton}
                        title={account.is_active ? "Disable" : "Activate"}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* =================================================
                        BRANDING
                    ================================================= */}

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Branding</h2>

                <p>These colors can be used throughout company documents.</p>
              </div>
            </div>

            <div className={styles.colorGrid}>
              <div className={styles.colorField}>
                <label>Primary Color</label>

                <div className={styles.colorControl}>
                  <input
                    type="color"
                    name="primary_color"
                    value={form.primary_color || "#111827"}
                    onChange={handleChange}
                  />

                  <input
                    name="primary_color"
                    value={form.primary_color}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.colorField}>
                <label>Secondary Color</label>

                <div className={styles.colorControl}>
                  <input
                    type="color"
                    name="secondary_color"
                    value={form.secondary_color || "#64748B"}
                    onChange={handleChange}
                  />

                  <input
                    name="secondary_color"
                    value={form.secondary_color}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.colorField}>
                <label>Accent Color</label>

                <div className={styles.colorControl}>
                  <input
                    type="color"
                    name="accent_color"
                    value={form.accent_color || "#2563EB"}
                    onChange={handleChange}
                  />

                  <input
                    name="accent_color"
                    value={form.accent_color}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
                        SAVE
                    ================================================= */}

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              <Save size={17} />

              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* =================================================
                    BANK ACCOUNT MODAL
                ================================================= */}

        {showBankForm && (
          <div
            className={styles.modalOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeBankForm();
              }
            }}
          >
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <div>
                  <h2>
                    {editingBankId ? "Edit Bank Account" : "Add Bank Account"}
                  </h2>

                  <p>Enter the details for this company bank account.</p>
                </div>

                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={closeBankForm}
                  disabled={bankSaving}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form className={styles.bankForm} onSubmit={handleBankSubmit}>
                <div className={styles.field}>
                  <label>Bank Name</label>

                  <input
                    name="bank_name"
                    value={bankForm.bank_name}
                    onChange={handleBankChange}
                    placeholder="e.g. Emirates NBD"
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Account Name</label>

                  <input
                    name="account_name"
                    value={bankForm.account_name}
                    onChange={handleBankChange}
                    placeholder="e.g. Main AED Account"
                    required
                  />
                </div>

                <div className={styles.modalGrid}>
                  <div className={styles.field}>
                    <label>Account Number</label>

                    <input
                      name="account_number"
                      value={bankForm.account_number}
                      onChange={handleBankChange}
                      placeholder="Account number"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Currency</label>

                    <select
                      name="currency"
                      value={bankForm.currency}
                      onChange={handleBankChange}
                    >
                      <option value="AED">AED</option>

                      <option value="USD">USD</option>

                      <option value="EUR">EUR</option>

                      <option value="GBP">GBP</option>

                      <option value="SAR">SAR</option>

                      <option value="QAR">QAR</option>

                      <option value="KWD">KWD</option>

                      <option value="BHD">BHD</option>

                      <option value="OMR">OMR</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>IBAN</label>

                  <input
                    name="iban"
                    value={bankForm.iban}
                    onChange={handleBankChange}
                    placeholder="AE..."
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={closeBankForm}
                    disabled={bankSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={styles.modalSaveButton}
                    disabled={bankSaving}
                  >
                    <Save size={16} />

                    {bankSaving
                      ? "Saving..."
                      : editingBankId
                        ? "Update Account"
                        : "Add Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
