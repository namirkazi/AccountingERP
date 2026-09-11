import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Upload, Save, MoveLeft } from "lucide-react";

import { createCompany } from "../../services/companyService";
import styles from "./AddCompany.module.css";

export default function AddCompany() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    company_code: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    trn: "",
    primary_color: "#17202A",
    secondary_color: "#64748B",
    accent_color: "#C28B2C",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Logo must be a JPG, PNG, or WebP image.");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be smaller than 5 MB.");

      return;
    }

    setLogoFile(file);

    setLogoPreview(URL.createObjectURL(file));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!form.company_code.trim()) {
      setError("Company code is required.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await createCompany(formData);

      if (!response?.success) {
        throw new Error(response?.message || "Unable to create company.");
      }

      setSuccess("Company created successfully.");

      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (err) {
      console.error("Create company failed:", err);

      setError(err?.message || "Unable to create company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          <MoveLeft size={22} />
          Back
        </button>
        <div className={styles.headerIcon}>
          <Building2 size={22} />
        </div>

        <div>
          <h1>Add Company</h1>

          <p>Create a new company for the current administrator account.</p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {success && <div className={styles.success}>{success}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* COMPANY INFORMATION */}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Company Information</h2>

            <p>Basic information used throughout the accounting system.</p>
          </div>

          <div className={styles.logoArea}>
            <div className={styles.logoPreview}>
              {logoPreview ? (
                <img src={logoPreview} alt="Company logo preview" />
              ) : (
                <Building2 size={34} />
              )}
            </div>

            <div>
              <h3>Company Logo</h3>

              <p>JPG, PNG or WebP. Maximum 5 MB.</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleLogoChange}
              />

              <button
                type="button"
                className={styles.uploadButton}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Choose Logo
              </button>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Company Name *</label>

              <input
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                placeholder="Company legal name"
              />
            </div>

            <div className={styles.field}>
              <label>Company Code *</label>

              <input
                name="company_code"
                value={form.company_code}
                onChange={handleChange}
                placeholder="COMPANY"
              />
            </div>

            <div className={styles.field}>
              <label>TRN / VAT Number</label>

              <input name="trn" value={form.trn} onChange={handleChange} />
            </div>

            <div className={styles.field}>
              <label>Phone</label>

              <input name="phone" value={form.phone} onChange={handleChange} />
            </div>

            <div className={styles.field}>
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label>Website</label>

              <input
                name="website"
                value={form.website}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label>City</label>

              <input name="city" value={form.city} onChange={handleChange} />
            </div>

            <div className={styles.field}>
              <label>Country</label>

              <input
                name="country"
                value={form.country}
                onChange={handleChange}
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Address</label>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* BRANDING */}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Company Branding</h2>

            <p>
              These colors will later be used throughout this company's
              documents and interface.
            </p>
          </div>

          <div className={styles.colorGrid}>
            <div className={styles.field}>
              <label>Primary Color</label>

              <div className={styles.colorInput}>
                <input
                  type="color"
                  name="primary_color"
                  value={form.primary_color}
                  onChange={handleChange}
                />

                <input
                  name="primary_color"
                  value={form.primary_color}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Secondary Color</label>

              <div className={styles.colorInput}>
                <input
                  type="color"
                  name="secondary_color"
                  value={form.secondary_color}
                  onChange={handleChange}
                />

                <input
                  name="secondary_color"
                  value={form.secondary_color}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Accent Color</label>

              <div className={styles.colorInput}>
                <input
                  type="color"
                  name="accent_color"
                  value={form.accent_color}
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

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Cancel
          </button>

          <button type="submit" className={styles.saveButton} disabled={saving}>
            <Save size={17} />

            {saving ? "Creating..." : "Create Company"}
          </button>
        </div>
      </form>
    </div>
  );
}
