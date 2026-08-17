import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import styles from "./LedgerFilters.module.css";

export default function MultiSelectFilter({
    label,
    options = [],
    selected = [],
    onChange,
    searchable = true,
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef(null);

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

    const filteredOptions = options.filter((option) =>
        String(option.label || "")
            .toLowerCase()
            .includes(query.trim().toLowerCase())
    );

    function toggleOption(value) {
        const exists = selected.some(
            (item) => String(item) === String(value)
        );

        if (exists) {
            onChange(
                selected.filter(
                    (item) =>
                        String(item) !== String(value)
                )
            );
        } else {
            onChange([
                ...selected,
                value,
            ]);
        }
    }

    function clearSelection(event) {
        event.stopPropagation();
        onChange([]);
    }

    return (
        <div
            className={styles.filterWrapper}
            ref={wrapperRef}
        >
            <button
                type="button"
                className={`${styles.filterButton} ${
                    selected.length > 0
                        ? styles.filterButtonActive
                        : ""
                }`}
                onClick={() =>
                    setOpen((value) => !value)
                }
            >
                <span className={styles.filterButtonText}>
                    {label}

                    {selected.length > 0 && (
                        <span className={styles.filterCount}>
                            {selected.length}
                        </span>
                    )}
                </span>

                <span className={styles.filterButtonIcons}>
                    {selected.length > 0 && (
                        <X
                            size={15}
                            onClick={clearSelection}
                        />
                    )}

                    <ChevronDown
                        size={16}
                        className={
                            open
                                ? styles.chevronOpen
                                : ""
                        }
                    />
                </span>
            </button>

            {open && (
                <div className={styles.dropdown}>
                    {searchable && (
                        <div className={styles.dropdownSearch}>
                            <Search size={15} />

                            <input
                                type="text"
                                value={query}
                                onChange={(event) =>
                                    setQuery(
                                        event.target.value
                                    )
                                }
                                placeholder={`Search ${label.toLowerCase()}...`}
                                autoFocus
                            />
                        </div>
                    )}

                    <div className={styles.optionList}>
                        {filteredOptions.length === 0 && (
                            <div
                                className={
                                    styles.emptyOption
                                }
                            >
                                No results found
                            </div>
                        )}

                        {filteredOptions.map((option) => {
                            const checked =
                                selected.some(
                                    (item) =>
                                        String(item) ===
                                        String(option.value)
                                );

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={
                                        styles.option
                                    }
                                    onClick={() =>
                                        toggleOption(
                                            option.value
                                        )
                                    }
                                >
                                    <span
                                        className={`${styles.checkbox} ${
                                            checked
                                                ? styles.checkboxChecked
                                                : ""
                                        }`}
                                    >
                                        {checked && (
                                            <Check
                                                size={13}
                                            />
                                        )}
                                    </span>

                                    <span
                                        className={
                                            styles.optionLabel
                                        }
                                    >
                                        {option.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {selected.length > 0 && (
                        <div
                            className={
                                styles.dropdownFooter
                            }
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    onChange([])
                                }
                            >
                                Clear selection
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}