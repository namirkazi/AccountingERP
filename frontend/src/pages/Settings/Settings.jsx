import {
    Building2,
    Upload,
    Save,
    CheckCircle2,
} from "lucide-react";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import AppLayout
    from "../../components/layout/AppLayout";

import styles
    from "./Settings.module.css";

import {
    getCompanyProfile,
    updateCompanyProfile,
} from "../../services/companyService";


export default function Settings() {

    const fileInputRef =
        useRef(null);


    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [message, setMessage] =
        useState("");


    const [logoPreview, setLogoPreview] =
        useState("");


    const [logoFile, setLogoFile] =
        useState(null);


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
     * LOAD COMPANY PROFILE
     * =====================================================
     */

    useEffect(() => {

        async function loadProfile() {

            try {

                setLoading(true);

                setError("");


                const response =
                    await getCompanyProfile();


                const company =
                    response?.company ||
                    response?.data?.company ||
                    {};


                setForm({

                    name:
                        company.name || "",

                    address:
                        company.address || "",

                    city:
                        company.city || "",

                    country:
                        company.country || "",

                    phone:
                        company.phone || "",

                    email:
                        company.email || "",

                    website:
                        company.website || "",

                    trn:
                        company.trn || "",

                    primary_color:
                        company.theme?.primary ||
                        "",

                    secondary_color:
                        company.theme?.secondary ||
                        "",

                    accent_color:
                        company.theme?.accent ||
                        "",

                });


                setLogoPreview(
                    company.logo || ""
                );


            } catch (requestError) {

                console.error(
                    "Company profile error:",
                    requestError
                );


                setError(
                    requestError.message ||
                    "Unable to load company profile."
                );


            } finally {

                setLoading(false);

            }

        }


        loadProfile();

    }, []);


    /*
     * =====================================================
     * INPUT HANDLER
     * =====================================================
     */

    function handleChange(event) {

        const {
            name,
            value,
        } = event.target;


        setForm(
            current => ({

                ...current,

                [name]: value,

            })
        );


        setMessage("");

    }


    /*
     * =====================================================
     * LOGO
     * =====================================================
     */

    function handleLogoChange(event) {

        const file =
            event.target.files?.[0];


        if (!file) {
            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            setError(
                "Please select an image file."
            );

            return;
        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            setError(
                "Logo must be smaller than 5 MB."
            );

            return;
        }


        setLogoFile(file);


        setLogoPreview(
            URL.createObjectURL(file)
        );


        setError("");

        setMessage("");

    }


    /*
     * =====================================================
     * SAVE
     * =====================================================
     */

    async function handleSubmit(event) {

        event.preventDefault();


        setSaving(true);

        setError("");

        setMessage("");


        try {

            const formData =
                new FormData();


            formData.append(
                "name",
                form.name.trim()
            );


            formData.append(
                "address",
                form.address.trim()
            );


            formData.append(
                "city",
                form.city.trim()
            );


            formData.append(
                "country",
                form.country.trim()
            );


            formData.append(
                "phone",
                form.phone.trim()
            );


            formData.append(
                "email",
                form.email.trim()
            );


            formData.append(
                "website",
                form.website.trim()
            );


            formData.append(
                "trn",
                form.trn.trim()
            );


            formData.append(
                "primary_color",
                form.primary_color
            );


            formData.append(
                "secondary_color",
                form.secondary_color
            );


            formData.append(
                "accent_color",
                form.accent_color
            );


            if (logoFile) {

                formData.append(
                    "logo",
                    logoFile
                );

            }


            const response =
                await updateCompanyProfile(
                    formData
                );


            const company =
                response?.company ||
                response?.data?.company ||
                null;


            if (company) {

                setLogoPreview(
                    company.logo ||
                    logoPreview
                );

            }


            setLogoFile(null);


            if (
                fileInputRef.current
            ) {

                fileInputRef.current.value =
                    "";

            }


            setMessage(
                response?.message ||
                "Company profile saved successfully."
            );


        } catch (requestError) {

            console.error(
                "Company profile save error:",
                requestError
            );


            setError(
                requestError.message ||
                "Unable to save company profile."
            );


        } finally {

            setSaving(false);

        }

    }


    if (loading) {

        return (

            <AppLayout>

                <div className={styles.page}>

                    <div className={styles.loading}>
                        Loading company profile...
                    </div>

                </div>

            </AppLayout>

        );

    }


    return (

        <AppLayout>

            <div className={styles.page}>


                {/* =================================================
                    HEADER
                ================================================= */}

                <div className={styles.header}>

                    <div className={styles.titleArea}>

                        <div className={styles.icon}>

                            <Building2
                                size={22}
                            />

                        </div>


                        <div>

                            <h1>
                                Settings
                            </h1>

                            <p>
                                Manage your company
                                profile and branding.
                            </p>

                        </div>

                    </div>

                </div>


                {error && (

                    <div className={styles.error}>

                        {error}

                    </div>

                )}


                {message && (

                    <div className={styles.success}>

                        <CheckCircle2
                            size={17}
                        />

                        {message}

                    </div>

                )}


                <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                >


                    {/* =================================================
                        COMPANY PROFILE
                    ================================================= */}

                    <section className={styles.card}>

                        <div className={styles.cardHeader}>

                            <div>

                                <h2>
                                    Company Profile
                                </h2>

                                <p>
                                    These details will be
                                    used on your bills,
                                    invoices and printed
                                    documents.
                                </p>

                            </div>

                        </div>


                        {/* LOGO */}

                        <div className={styles.logoSection}>

                            <div className={styles.logoPreview}>

                                {logoPreview ? (

                                    <img
                                        src={logoPreview}
                                        alt="Company logo"
                                    />

                                ) : (

                                    <Building2
                                        size={34}
                                    />

                                )}

                            </div>


                            <div className={styles.logoInfo}>

                                <h3>
                                    Company Logo
                                </h3>

                                <p>
                                    Recommended:
                                    square PNG or JPG,
                                    up to 5 MB.
                                </p>


                                <input
                                    ref={
                                        fileInputRef
                                    }
                                    type="file"
                                    accept="image/*"
                                    onChange={
                                        handleLogoChange
                                    }
                                    hidden
                                />


                                <button
                                    type="button"
                                    className={
                                        styles.uploadButton
                                    }
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >

                                    <Upload
                                        size={16}
                                    />

                                    Change Logo

                                </button>

                            </div>

                        </div>


                        <div className={styles.grid}>


                            <div className={styles.field}>

                                <label>
                                    Company Name
                                </label>

                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Company legal name"
                                />

                            </div>


                            <div className={styles.field}>

                                <label>
                                    TRN / VAT Number
                                </label>

                                <input
                                    name="trn"
                                    value={form.trn}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="100000000000000"
                                />

                            </div>


                            <div className={styles.field}>

                                <label>
                                    Phone
                                </label>

                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="+971..."
                                />

                            </div>


                            <div className={styles.field}>

                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="accounts@company.com"
                                />

                            </div>


                            <div className={styles.field}>

                                <label>
                                    Website
                                </label>

                                <input
                                    name="website"
                                    value={form.website}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="https://company.com"
                                />

                            </div>


                            <div className={styles.field}>

                                <label>
                                    City
                                </label>

                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Dubai"
                                />

                            </div>


                            <div className={styles.field}>

                                <label>
                                    Country
                                </label>

                                <input
                                    name="country"
                                    value={form.country}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="United Arab Emirates"
                                />

                            </div>


                            <div
                                className={`${styles.field} ${styles.fullWidth}`}
                            >

                                <label>
                                    Address
                                </label>

                                <textarea
                                    name="address"
                                    value={form.address}
                                    onChange={
                                        handleChange
                                    }
                                    rows={3}
                                    placeholder="Building, street, area..."
                                />

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        BRANDING
                    ================================================= */}

                    <section className={styles.card}>

                        <div className={styles.cardHeader}>

                            <div>

                                <h2>
                                    Branding
                                </h2>

                                <p>
                                    These colors can be
                                    used throughout
                                    company documents.
                                </p>

                            </div>

                        </div>


                        <div className={styles.colorGrid}>


                            <div className={styles.colorField}>

                                <label>
                                    Primary Color
                                </label>

                                <div className={styles.colorControl}>

                                    <input
                                        type="color"
                                        name="primary_color"
                                        value={
                                            form.primary_color ||
                                            "#111827"
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    <input
                                        name="primary_color"
                                        value={
                                            form.primary_color
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>

                            </div>


                            <div className={styles.colorField}>

                                <label>
                                    Secondary Color
                                </label>

                                <div className={styles.colorControl}>

                                    <input
                                        type="color"
                                        name="secondary_color"
                                        value={
                                            form.secondary_color ||
                                            "#64748B"
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    <input
                                        name="secondary_color"
                                        value={
                                            form.secondary_color
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>

                            </div>


                            <div className={styles.colorField}>

                                <label>
                                    Accent Color
                                </label>

                                <div className={styles.colorControl}>

                                    <input
                                        type="color"
                                        name="accent_color"
                                        value={
                                            form.accent_color ||
                                            "#2563EB"
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    <input
                                        name="accent_color"
                                        value={
                                            form.accent_color
                                        }
                                        onChange={
                                            handleChange
                                        }
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
                            className={
                                styles.saveButton
                            }
                            disabled={saving}
                        >

                            <Save
                                size={17}
                            />

                            {saving
                                ? "Saving..."
                                : "Save Changes"}

                        </button>

                    </div>


                </form>

            </div>

        </AppLayout>

    );

}