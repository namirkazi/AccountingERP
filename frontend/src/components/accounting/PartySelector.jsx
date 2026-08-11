import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    Plus
} from "lucide-react";

import {
    searchCustomers,
    createCustomer,
    searchSuppliers,
    createSupplier
} from "../../services/partyService";

import styles from "./PartySelector.module.css";


export default function PartySelector({
    value,
    onChange,
    partyType = "customer"
}) {

    const isSupplier =
        partyType === "supplier";


    const label =
        isSupplier
            ? "Supplier"
            : "Customer";


    const [query, setQuery] =
        useState(
            value?.party_name || ""
        );


    const [results, setResults] =
        useState([]);


    const [open, setOpen] =
        useState(false);


    const [loading, setLoading] =
        useState(false);


    const [showCreate, setShowCreate] =
        useState(false);


    const [newName, setNewName] =
        useState("");


    const [newPhone, setNewPhone] =
        useState("");


    const [newEmail, setNewEmail] =
        useState("");


    const [creating, setCreating] =
        useState(false);


    const [createError, setCreateError] =
        useState("");


    const wrapperRef =
        useRef(null);


    /*
     * Close dropdown outside click
     */

    useEffect(() => {

        function handleClickOutside(event) {

            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(
                    event.target
                )
            ) {
                setOpen(false);
            }
        }


        document.addEventListener(
            "mousedown",
            handleClickOutside
        );


        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

    }, []);


    /*
     * Keep input synced with selected party
     */

    useEffect(() => {

        if (value) {

            setQuery(
                value.party_name || ""
            );

        } else {

            setQuery("");

        }

    }, [value]);


    /*
     * Search
     */

    useEffect(() => {

        const trimmed =
            query.trim();


        if (
            !trimmed ||
            value?.party_name === query
        ) {

            setResults([]);

            return;
        }


        const timer =
            setTimeout(
                async () => {

                    try {

                        setLoading(true);


                        const response =
                            isSupplier
                                ? await searchSuppliers(
                                    trimmed
                                )
                                : await searchCustomers(
                                    trimmed
                                );


                        setResults(
                            response?.data?.parties ||
                            []
                        );


                        setOpen(true);

                    } catch (error) {

                        console.error(
                            `${label} search failed:`,
                            error
                        );

                        setResults([]);

                    } finally {

                        setLoading(false);

                    }

                },
                250
            );


        return () =>
            clearTimeout(timer);

    }, [
        query,
        value,
        isSupplier
    ]);


    /*
     * Select
     */

    function selectParty(party) {

        setQuery(
            party.party_name
        );

        setResults([]);

        setOpen(false);

        onChange(party);
    }


    /*
     * Open create modal
     */

    function openCreate() {

        setNewName(
            query.trim()
        );

        setNewPhone("");

        setNewEmail("");

        setCreateError("");

        setShowCreate(true);

        setOpen(false);
    }


    /*
     * Create party
     */

    async function handleCreate(event) {

        event.preventDefault();


        if (!newName.trim()) {

            setCreateError(
                `${label} name is required.`
            );

            return;
        }


        try {

            setCreating(true);

            setCreateError("");


            const payload = {

                name:
                    newName.trim(),

                phone:
                    newPhone.trim(),

                email:
                    newEmail.trim()

            };


            const response =
                isSupplier
                    ? await createSupplier(
                        payload
                    )
                    : await createCustomer(
                        payload
                    );


            const party =
                response?.data?.party;


            if (!party) {

                throw new Error(
                    `Unable to create ${label.toLowerCase()}.`
                );
            }


            setQuery(
                party.party_name
            );


            setShowCreate(false);

            setNewName("");

            setNewPhone("");

            setNewEmail("");

            setResults([]);

            onChange(party);


        } catch (error) {

            console.error(
                `${label} creation failed:`,
                error
            );


            setCreateError(
                error.message ||
                `Unable to create ${label.toLowerCase()}.`
            );


        } finally {

            setCreating(false);

        }
    }


    return (
        <>
            <div
                className={styles.wrapper}
                ref={wrapperRef}
            >

                <div
                    className={
                        styles.inputWrapper
                    }
                >

                    <input
                        value={query}
                        placeholder={
                            `Search ${label.toLowerCase()}...`
                        }
                        onChange={(event) => {

                            setQuery(
                                event.target.value
                            );


                            if (value) {

                                onChange(null);

                            }

                        }}
                        onFocus={() => {

                            if (results.length) {

                                setOpen(true);

                            }

                        }}
                    />

                </div>


                {open && (

                    <div
                        className={
                            styles.dropdown
                        }
                    >

                        {loading && (

                            <div
                                className={
                                    styles.message
                                }
                            >
                                Searching...
                            </div>

                        )}


                        {!loading &&
                            results.map(
                                party => (

                                    <button
                                        type="button"
                                        key={party.id}
                                        className={
                                            styles.result
                                        }
                                        onClick={() =>
                                            selectParty(
                                                party
                                            )
                                        }
                                    >

                                        <div>

                                            <strong>
                                                {
                                                    party.party_name
                                                }
                                            </strong>

                                            {party.phone && (

                                                <span>
                                                    {
                                                        party.phone
                                                    }
                                                </span>

                                            )}

                                        </div>

                                    </button>

                                )
                            )
                        }


                        {!loading &&
                            results.length === 0 &&
                            query.trim() !== "" && (

                                <button
                                    type="button"
                                    className={
                                        styles.addButton
                                    }
                                    onClick={
                                        openCreate
                                    }
                                >

                                    <Plus
                                        size={16}
                                    />

                                    <span>
                                        Add "{query.trim()}"
                                    </span>

                                </button>

                            )}

                    </div>

                )}

            </div>


            {showCreate && (

                <div
                    className={styles.overlay}
                >

                    <div
                        className={styles.modal}
                    >

                        <div
                            className={styles.modalHeader}
                        >

                            <div>

                                <span>
                                    New {label}
                                </span>

                                <h3>
                                    Add {label}
                                </h3>

                            </div>

                        </div>


                        <div
                            className={styles.modalForm}
                        >

                            <div
                                className={styles.modalField}
                            >

                                <label>
                                    {label} Name
                                </label>

                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(event) =>
                                        setNewName(
                                            event.target.value
                                        )
                                    }
                                    autoFocus
                                    placeholder={
                                        `Enter ${label.toLowerCase()} name`
                                    }
                                />

                            </div>


                            <div
                                className={styles.modalField}
                            >

                                <label>
                                    Phone
                                </label>

                                <input
                                    type="text"
                                    value={newPhone}
                                    onChange={(event) =>
                                        setNewPhone(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Optional"
                                />

                            </div>


                            <div
                                className={styles.modalField}
                            >

                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(event) =>
                                        setNewEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Optional"
                                />

                            </div>


                            {createError && (

                                <div
                                    className={styles.createError}
                                >
                                    {createError}
                                </div>

                            )}


                            <div
                                className={styles.modalActions}
                            >

                                <button
                                    type="button"
                                    className={
                                        styles.cancelButton
                                    }
                                    onClick={() =>
                                        setShowCreate(false)
                                    }
                                    disabled={creating}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="button"
                                    className={
                                        styles.createButton
                                    }
                                    onClick={handleCreate}
                                    disabled={creating}
                                >

                                    {creating
                                        ? "Adding..."
                                        : `Add ${label}`
                                    }

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </>
    );
}