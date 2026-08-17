import {
    CalendarDays,
    Filter,
    Search,
    X,
} from "lucide-react";

import MultiSelectFilter
    from "./MultiSelectFilter";

import styles
    from "./LedgerFilters.module.css";


export default function LedgerFilters({
    search,
    setSearch,

    accountOptions,
    selectedAccounts,
    setSelectedAccounts,

    voucherTypeOptions,
    selectedVoucherTypes,
    setSelectedVoucherTypes,

    partyOptions,
    selectedParties,
    setSelectedParties,

    dateFrom,
    setDateFrom,

    dateTo,
    setDateTo,

    clearFilters,
}) {
    const hasFilters =
        search.trim() ||
        selectedAccounts.length > 0 ||
        selectedVoucherTypes.length > 0 ||
        selectedParties.length > 0 ||
        dateFrom ||
        dateTo;

    return (
        <div className={styles.filtersCard}>

            <div className={styles.searchRow}>

                <div className={styles.searchBox}>
                    <Search size={18} />

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search accounts, parties, vouchers, amounts..."
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                {hasFilters && (
                    <button
                        type="button"
                        className={styles.clearButton}
                        onClick={clearFilters}
                    >
                        Clear All
                    </button>
                )}

            </div>


            <div className={styles.filterRow}>

                <div className={styles.filterHeading}>
                    <Filter size={16} />

                    <span>
                        Filters
                    </span>
                </div>


                <MultiSelectFilter
                    label="Accounts"
                    options={accountOptions}
                    selected={selectedAccounts}
                    onChange={
                        setSelectedAccounts
                    }
                />


                <MultiSelectFilter
                    label="Voucher Type"
                    options={
                        voucherTypeOptions
                    }
                    selected={
                        selectedVoucherTypes
                    }
                    onChange={
                        setSelectedVoucherTypes
                    }
                    searchable={false}
                />


                <MultiSelectFilter
                    label="Party"
                    options={partyOptions}
                    selected={selectedParties}
                    onChange={
                        setSelectedParties
                    }
                />


                <div className={styles.dateFilter}>
                    <CalendarDays size={16} />

                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) =>
                            setDateFrom(
                                event.target.value
                            )
                        }
                    />

                    <span>to</span>

                    <input
                        type="date"
                        value={dateTo}
                        onChange={(event) =>
                            setDateTo(
                                event.target.value
                            )
                        }
                    />
                </div>

            </div>


            {hasFilters && (
                <div className={styles.activeFilters}>

                    {selectedAccounts.map(
                        (id) => {
                            const option =
                                accountOptions.find(
                                    (item) =>
                                        String(
                                            item.value
                                        ) ===
                                        String(id)
                                );

                            return (
                                <span
                                    key={`account-${id}`}
                                    className={
                                        styles.filterChip
                                    }
                                >
                                    {option?.label ||
                                        id}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedAccounts(
                                                selectedAccounts.filter(
                                                    (value) =>
                                                        String(
                                                            value
                                                        ) !==
                                                        String(
                                                            id
                                                        )
                                                )
                                            )
                                        }
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            );
                        }
                    )}


                    {selectedVoucherTypes.map(
                        (type) => {
                            const option =
                                voucherTypeOptions.find(
                                    (item) =>
                                        item.value ===
                                        type
                                );

                            return (
                                <span
                                    key={`type-${type}`}
                                    className={
                                        styles.filterChip
                                    }
                                >
                                    {option?.label ||
                                        type}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedVoucherTypes(
                                                selectedVoucherTypes.filter(
                                                    (value) =>
                                                        value !==
                                                        type
                                                )
                                            )
                                        }
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            );
                        }
                    )}


                    {selectedParties.map(
                        (id) => {
                            const option =
                                partyOptions.find(
                                    (item) =>
                                        String(
                                            item.value
                                        ) ===
                                        String(id)
                                );

                            return (
                                <span
                                    key={`party-${id}`}
                                    className={
                                        styles.filterChip
                                    }
                                >
                                    {option?.label ||
                                        id}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedParties(
                                                selectedParties.filter(
                                                    (value) =>
                                                        String(
                                                            value
                                                        ) !==
                                                        String(
                                                            id
                                                        )
                                                )
                                            )
                                        }
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            );
                        }
                    )}

                </div>
            )}

        </div>
    );
}