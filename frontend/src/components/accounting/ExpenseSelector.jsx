import { useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import {
    getSupplierItems,
    createSupplierItem
} from "../../services/supplierItemService";

import styles from "./ExpenseSelector.module.css";


export default function ExpenseSelector({
    supplierId,
    value,
    onChange,
    placeholder = "Search or enter item..."
}) {

    const wrapperRef = useRef(null);

    const [items, setItems] = useState([]);

    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    const [creating, setCreating] = useState(false);

    const [error, setError] = useState("");


    /*
     * =====================================================
     * LOAD SUPPLIER ITEMS
     * =====================================================
     */

    useEffect(() => {

        let cancelled = false;


        async function loadItems() {

            if (!supplierId) {

                setItems([]);
                setSearch("");
                setOpen(false);

                return;

            }


            try {

                setLoading(true);
                setError("");


                const result =
                    await getSupplierItems(
                        supplierId
                    );


                if (!cancelled) {

                    setItems(
                        Array.isArray(result)
                            ? result
                            : []
                    );

                }

            } catch (error) {

                if (!cancelled) {

                    console.error(
                        "Failed to load supplier items:",
                        error
                    );


                    setItems([]);


                    setError(
                        error.message ||
                        "Unable to load supplier items."
                    );

                }

            } finally {

                if (!cancelled) {

                    setLoading(false);

                }

            }

        }


        loadItems();


        return () => {

            cancelled = true;

        };

    }, [supplierId]);


    /*
     * =====================================================
     * CLOSE WHEN CLICKING OUTSIDE
     * =====================================================
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


        return () => {

            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

        };

    }, []);


    /*
     * =====================================================
     * SELECTED ITEM
     * =====================================================
     */

    const selectedItem =
        items.find(
            item =>
                String(item.id) ===
                String(value)
        );


    /*
     * =====================================================
     * SEARCH RESULTS
     * =====================================================
     */

    const filteredItems =
        items.filter(item =>
            String(
                item.item_name || ""
            )
                .toLowerCase()
                .includes(
                    search
                        .trim()
                        .toLowerCase()
                )
        );


    const exactMatch =
        items.some(item =>
            String(
                item.item_name || ""
            )
                .trim()
                .toLowerCase() ===
            search
                .trim()
                .toLowerCase()
        );


    /*
     * =====================================================
     * SELECT EXISTING
     * =====================================================
     */

    function handleSelect(item) {

        onChange(
            item.id,
            item
        );


        setSearch("");

        setOpen(false);

    }


    /*
     * =====================================================
     * CREATE NEW ITEM
     * =====================================================
     */

    async function handleCreate() {

        const name =
            search.trim();


        if (!name) {

            return;

        }


        if (!supplierId) {

            setError(
                "Select a supplier first."
            );

            return;

        }


        if (exactMatch) {

            return;

        }


        try {

            setCreating(true);
            setError("");


            const newItem =
                await createSupplierItem({

                    supplier_id:
                        supplierId,

                    item_name:
                        name,

                    unit:
                        "",

                    default_rate:
                        0

                });


            if (!newItem) {

                throw new Error(
                    "The supplier item was not returned."
                );

            }


            /*
             * Add it to the current supplier's
             * local list immediately.
             */

            setItems(current => {

                const exists =
                    current.some(
                        item =>
                            String(item.id) ===
                            String(newItem.id)
                    );


                if (exists) {

                    return current;

                }


                return [
                    ...current,
                    newItem
                ].sort(
                    (a, b) =>
                        String(
                            a.item_name
                        ).localeCompare(
                            String(
                                b.item_name
                            )
                        )
                );

            });


            /*
             * Automatically select the new item.
             */

            onChange(
                newItem.id,
                newItem
            );


            setSearch("");

            setOpen(false);


        } catch (error) {

            console.error(
                "Failed to create supplier item:",
                error
            );


            setError(
                error.message ||
                "Unable to create item."
            );


        } finally {

            setCreating(false);

        }

    }


    /*
     * =====================================================
     * CLEAR
     * =====================================================
     */

    function handleClear() {

        onChange(
            null,
            null
        );

        setSearch("");

        setOpen(false);

    }


    /*
     * =====================================================
     * NO SUPPLIER
     * =====================================================
     */

    if (!supplierId) {

        return (

            <div
                className={
                    styles.wrapper
                }
            >

                <div
                    className={
                        styles.inputWrapper
                    }
                >

                    <Search
                        size={16}
                        className={
                            styles.searchIcon
                        }
                    />

                    <input
                        type="text"
                        placeholder="Select supplier first"
                        disabled
                    />

                </div>

            </div>

        );

    }


    /*
     * =====================================================
     * RENDER
     * =====================================================
     */

    return (

        <div
            ref={wrapperRef}
            className={
                styles.wrapper
            }
        >

            <div
                className={
                    styles.inputWrapper
                }
            >

                <Search
                    size={16}
                    className={
                        styles.searchIcon
                    }
                />


                <input

                    type="text"

                    value={
                        open
                            ? search
                            : selectedItem
                                ? selectedItem.item_name
                                : ""
                    }

                    placeholder={
                        placeholder
                    }

                    autoComplete="off"

                    onFocus={() => {

                        setOpen(true);

                        setSearch("");

                    }}

                    onChange={event => {

                        setSearch(
                            event.target.value
                        );

                        setOpen(true);

                    }}

                />


                {selectedItem && (

                    <button
                        type="button"
                        className={
                            styles.clearButton
                        }
                        onClick={
                            handleClear
                        }
                    >

                        <X size={15} />

                    </button>

                )}

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
                            Loading items...
                        </div>

                    )}


                    {!loading &&
                        error && (

                        <div
                            className={
                                styles.message
                            }
                        >

                            {error}

                        </div>

                    )}


                    {!loading &&
                        !error &&
                        filteredItems.length > 0 && (

                        <div
                            className={
                                styles.results
                            }
                        >

                            {filteredItems.map(
                                item => (

                                    <button
                                        type="button"
                                        key={
                                            item.id
                                        }
                                        className={
                                            styles.result
                                        }
                                        onClick={() =>
                                            handleSelect(
                                                item
                                            )
                                        }
                                    >

                                        <span>

                                            {
                                                item.item_name
                                            }

                                        </span>


                                        {item.unit && (

                                            <small>

                                                {
                                                    item.unit
                                                }

                                            </small>

                                        )}

                                    </button>

                                )
                            )}

                        </div>

                    )}


                    {!loading &&
                        !error &&
                        search.trim() &&
                        !exactMatch && (

                        <button
                            type="button"
                            className={
                                styles.createOption
                            }
                            onClick={
                                handleCreate
                            }
                            disabled={
                                creating
                            }
                        >

                            <span
                                className={
                                    styles.plusIcon
                                }
                            >

                                <Plus
                                    size={16}
                                />

                            </span>


                            <span>

                                {creating
                                    ? "Adding..."
                                    : `Add "${search.trim()}"`
                                }

                            </span>

                        </button>

                    )}


                    {!loading &&
                        !error &&
                        !search.trim() &&
                        filteredItems.length === 0 && (

                        <div
                            className={
                                styles.message
                            }
                        >

                            No items found.

                        </div>

                    )}

                </div>

            )}

        </div>

    );

}