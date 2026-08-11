import { useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import {
    getExpenseAccounts,
    createExpenseAccount
} from "../../services/expenseService";

import styles from "./ExpenseSelector.module.css";

export default function ExpenseSelector({
    value,
    onChange,
    placeholder = "Search expense..."
}) {
    const wrapperRef = useRef(null);

    const [expenses, setExpenses] = useState([]);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    // Load expense accounts
    useEffect(() => {
        async function loadExpenses() {
            try {
                setLoading(true);

                const response =
                    await getExpenseAccounts();

                setExpenses(
                    response?.data?.accounts || []
                );
            } catch (error) {
                console.error(
                    "Failed to load expenses:",
                    error
                );
            } finally {
                setLoading(false);
            }
        }

        loadExpenses();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    const selectedExpense =
        expenses.find(
            (expense) =>
                Number(expense.id) === Number(value)
        );

    const filteredExpenses =
        expenses.filter((expense) =>
            expense.account_name
                .toLowerCase()
                .includes(search.toLowerCase())
        );

    const exactMatch =
        expenses.some(
            (expense) =>
                expense.account_name.toLowerCase() ===
                search.trim().toLowerCase()
        );

    function handleSelect(expense) {
        onChange(expense.id);

        setSearch("");
        setOpen(false);
    }

    function openCreate() {
        setNewName(search.trim());
        setError("");
        setShowCreate(true);
        setOpen(false);
    }

    async function handleCreate() {
        const name = newName.trim();

        if (!name) {
            setError(
                "Please enter an expense name."
            );
            return;
        }

        setCreating(true);
        setError("");

        try {
            const response =
                await createExpenseAccount(name);

            const account =
                response?.data?.account;

            if (!account) {
                throw new Error(
                    "Expense account was not returned."
                );
            }

            setExpenses((current) => {

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

            // Automatically select new expense
            onChange(account.id);

            setNewName("");
            setShowCreate(false);

        } catch (error) {
            setError(
                error.message ||
                "Unable to create expense."
            );
        } finally {
            setCreating(false);
        }
    }

    function clearSelection() {
        onChange(null);
        setSearch("");
    }

    return (
        <>
            <div
                className={styles.wrapper}
                ref={wrapperRef}
            >
                <div className={styles.inputWrapper}>

                    <Search
                        size={16}
                        className={styles.searchIcon}
                    />

                    <input
                        type="text"
                        value={
                            open
                                ? search
                                : selectedExpense
                                    ? selectedExpense.account_name
                                    : search
                        }
                        placeholder={placeholder}
                        onFocus={() => {
                            setOpen(true);

                            if (selectedExpense) {
                                setSearch("");
                            }
                        }}
                        onChange={(event) => {
                            setSearch(
                                event.target.value
                            );

                            setOpen(true);
                        }}
                    />

                    {selectedExpense && !open && (
                        <button
                            type="button"
                            className={styles.clearButton}
                            onClick={clearSelection}
                        >
                            <X size={15} />
                        </button>
                    )}

                </div>


                {open && (
                    <div className={styles.dropdown}>

                        {loading && (
                            <div className={styles.message}>
                                Loading expenses...
                            </div>
                        )}


                        {!loading &&
                            filteredExpenses.length > 0 && (
                                <div className={styles.results}>

                                    {filteredExpenses.map(
                                        (expense) => (
                                            <button
                                                key={expense.id}
                                                type="button"
                                                className={
                                                    styles.result
                                                }
                                                onClick={() =>
                                                    handleSelect(
                                                        expense
                                                    )
                                                }
                                            >
                                                <span>
                                                    {
                                                        expense.account_name
                                                    }
                                                </span>
                                            </button>
                                        )
                                    )}

                                </div>
                            )}


                        {!loading &&
                            search.trim() !== "" &&
                            !exactMatch && (
                                <button
                                    type="button"
                                    className={
                                        styles.createOption
                                    }
                                    onClick={openCreate}
                                >
                                    <span
                                        className={
                                            styles.plusIcon
                                        }
                                    >
                                        <Plus size={16} />
                                    </span>

                                    <span>
                                        Add "
                                        {search.trim()}
                                        "
                                    </span>
                                </button>
                            )}


                        {!loading &&
                            search.trim() === "" &&
                            filteredExpenses.length === 0 && (
                                <div
                                    className={
                                        styles.message
                                    }
                                >
                                    No expenses found.
                                </div>
                            )}

                    </div>
                )}

            </div>


            {/* CREATE EXPENSE MODAL */}

            {showCreate && (
                <div className={styles.overlay}>

                    <div className={styles.modal}>

                        <div
                            className={
                                styles.modalHeader
                            }
                        >
                            <div>
                                <h3>
                                    Add Expense
                                </h3>

                                <p>
                                    Create a new expense
                                    category.
                                </p>
                            </div>

                            <button
                                type="button"
                                className={
                                    styles.closeButton
                                }
                                onClick={() =>
                                    setShowCreate(false)
                                }
                            >
                                <X size={18} />
                            </button>
                        </div>


                        <div
                            className={styles.modalField}
                        >
                            <label>
                                Expense
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
                                }
                            }
                            />
                        </div>


                        {error && (
                            <div
                                className={
                                    styles.error
                                }
                            >
                                {error}
                            </div>
                        )}


                        <div
                            className={
                                styles.modalActions
                            }
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
                                    ? "Creating..."
                                    : "Create"}
                            </button>
                        </div>

                    </div>

                </div>
            )}
        </>
    );
}