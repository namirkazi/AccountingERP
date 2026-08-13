import { useEffect, useState } from "react";
import { Plus, X, Search } from "lucide-react";

import {
    getAccounts,
    createExpenseHead
} from "../../services/accountService";

import styles from "./AccountSelector.module.css";

export default function AccountSelector({
    value,
    onChange,
    filter,
    creatable = false,
    createLabel = "Create New",
    placeholder = "Select account",
    returnObject = false
}) {

    const [accounts, setAccounts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [showCreate, setShowCreate] =
        useState(false);

    const [newName, setNewName] =
        useState("");

    const [creating, setCreating] =
        useState(false);

    const [error, setError] =
        useState("");


    async function loadAccounts() {

        try {

            const response =
                await getAccounts();

            setAccounts(
                response?.data?.accounts || []
            );

        } catch (error) {

            console.error(
                "Failed to load accounts:",
                error
            );

        } finally {

            setLoading(false);
        }
    }


    useEffect(() => {
        loadAccounts();
    }, []);


    const filteredAccounts =
        filter
            ? accounts.filter(filter)
            : accounts;


    async function handleCreate() {

        const name =
            newName.trim();

        if (!name) {

            setError(
                "Please enter a name."
            );

            return;
        }

        setCreating(true);
        setError("");

        try {

            const response =
                await createExpenseHead(name);

            const account =
                response?.data?.account;

            if (!account) {
                throw new Error(
                    "Account was not returned by the server."
                );
            }


            /*
             * Add the newly created account
             * immediately to the selector.
             */

            setAccounts((current) => {

                const exists =
                    current.some(
                        (item) =>
                            Number(item.id) ===
                            Number(account.id)
                    );

                if (exists) {
                    return current;
                }

                return [
                    ...current,
                    account
                ];
            });


            /*
             * Automatically select it.
             */

            onChange(
                returnObject
                    ? account
                    : String(account.id)
            );


            setNewName("");
            setShowCreate(false);

        } catch (error) {

            setError(
                error.message ||
                "Unable to create expense head."
            );

        } finally {

            setCreating(false);
        }
    }


    return (
        <div className={styles.wrapper}>

            <div className={styles.selectRow}>

                <select
                    className={styles.select}
                    value={
                        returnObject
                            ? value?.id || ""
                            : value || ""
                    }
                    onChange={(event) => {

                        const selectedId =
                            event.target.value;

                        const selectedAccount =
                            accounts.find(
                                account =>
                                    String(account.id) ===
                                    String(selectedId)
                            );

                        onChange(
                            returnObject
                                ? selectedAccount || null
                                : selectedId
                        );
                    }}
                    disabled={loading}
                >

                    <option value="">
                        {loading
                            ? "Loading..."
                            : placeholder}
                    </option>

                    {filteredAccounts.map(
                        (account) => (

                            <option
                                key={account.id}
                                value={account.id}
                            >
                                {
                                    account.account_name
                                }
                            </option>
                        )
                    )}

                </select>


                {creatable && (

                    <button
                        type="button"
                        className={styles.addButton}
                        onClick={() => {
                            setError("");
                            setNewName("");
                            setShowCreate(true);
                        }}
                        title={createLabel}
                    >
                        <Plus size={17} />
                    </button>

                )}

            </div>


            {creatable && showCreate && (

                <div className={styles.overlay}>

                    <div
                        className={styles.modal}
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className={styles.modalHeader}>

                            <div>
                                <h3>
                                    Create Expense Head
                                </h3>

                                <p>
                                    Add a new expense
                                    category for this
                                    company.
                                </p>
                            </div>

                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() =>
                                    setShowCreate(false)
                                }
                            >
                                <X size={18} />
                            </button>

                        </div>


                        <div className={styles.field}>

                            <label>
                                Expense Head
                            </label>

                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={(event) =>
                                    setNewName(
                                        event.target.value
                                    )
                                }
                                onKeyDown={(event) => {

                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {
                                        event.preventDefault();

                                        handleCreate();
                                    }
                                }}
                                placeholder="e.g. Parking"
                            />

                        </div>


                        {error && (

                            <div className={styles.error}>
                                {error}
                            </div>

                        )}


                        <div className={styles.actions}>

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
                                    ? "Creating..."
                                    : "Create"}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}