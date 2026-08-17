import {
    BookOpen,
    RefreshCw,
} from "lucide-react";

import AppLayout
    from "../../components/layout/AppLayout";

import LedgerFilters
    from "./components/LedgerFilters";

import LedgerTable
    from "./components/LedgerTable";

import LedgerSummary
    from "./components/LedgerSummary";

import styles
    from "./Ledger.module.css";
import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    getLedger
} from "../../services/ledgerService";

const VOUCHER_TYPES = [
    {
        value: "SALE",
        label: "Sales",
    },
    {
        value: "RECEIPT",
        label: "Receipts",
    },
    {
        value: "PAYMENT",
        label: "Payments",
    },
    {
        value: "EXPENSE",
        label: "Expenses",
    },
];


export default function Ledger() {

    const [search, setSearch] =
        useState("");

    const [selectedAccounts, setSelectedAccounts] =
        useState([]);

    const [selectedVoucherTypes, setSelectedVoucherTypes] =
        useState([]);

    const [selectedParties, setSelectedParties] =
        useState([]);

    const [dateFrom, setDateFrom] =
        useState("");

    const [dateTo, setDateTo] =
        useState("");

    const [entries, setEntries] =
        useState([]);

    const [accountOptions, setAccountOptions] =
        useState([]);

    const [partyOptions, setPartyOptions] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [totalDebit, setTotalDebit] =
        useState(0);

    const [totalCredit, setTotalCredit] =
        useState(0);


    function clearFilters() {
        setSearch("");
        setSelectedAccounts([]);
        setSelectedVoucherTypes([]);
        setSelectedParties([]);
        setDateFrom("");
        setDateTo("");
    }


    const loadLedger = useCallback(
        async () => {

            setLoading(true);
            setError("");

            try {

                const response =
                    await getLedger({

                        search,

                        accountIds:
                            selectedAccounts,

                        voucherTypes:
                            selectedVoucherTypes,

                        partyIds:
                            selectedParties,

                        dateFrom,

                        dateTo,

                    });


                const data =
                    response?.data || {};


                setEntries(
                    Array.isArray(
                        data.entries
                    )
                        ? data.entries
                        : []
                );


                setTotalDebit(
                    Number(
                        data.totals?.debit || 0
                    )
                );


                setTotalCredit(
                    Number(
                        data.totals?.credit || 0
                    )
                );


                /*
                 * Build Account filter options.
                 */

                setAccountOptions(
                    (
                        data.filters?.accounts ||
                        []
                    ).map(
                        (account) => ({
                            value:
                                String(
                                    account.id
                                ),

                            label:
                                account.account_name,
                        })
                    )
                );


                /*
                 * Build Party filter options.
                 */

                setPartyOptions(
                    (
                        data.filters?.parties ||
                        []
                    ).map(
                        (party) => ({
                            value:
                                String(
                                    party.id
                                ),

                            label:
                                party.party_name,
                        })
                    )
                );

            } catch (requestError) {

                console.error(
                    "Ledger loading failed:",
                    requestError
                );


                setEntries([]);


                setTotalDebit(0);


                setTotalCredit(0);


                setError(
                    requestError.message ||
                    "Unable to load ledger."
                );

            } finally {

                setLoading(false);

            }

        },
        [
            search,
            selectedAccounts,
            selectedVoucherTypes,
            selectedParties,
            dateFrom,
            dateTo,
        ]
    );

    useEffect(() => {

        loadLedger();

    }, [loadLedger]);
    function handleViewVoucher(entry) {

        console.log(
            "View voucher:",
            entry
        );

        /*
         * Next step:
         *
         * fetch voucher by entry.voucher_id
         * and pass it through the existing
         * PrintableVoucher / PDF flow.
         */
    }


    return (
        <AppLayout>

            <div className={styles.page}>

                <header className={styles.header}>

                    <div className={styles.titleArea}>

                        <div
                            className={
                                styles.titleIcon
                            }
                        >
                            <BookOpen size={22} />
                        </div>

                        <div>

                            <h1>
                                General Ledger
                            </h1>

                            <p>
                                View and filter all
                                accounting transactions.
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        className={
                            styles.refreshButton
                        }
                        onClick={loadLedger}
                        disabled={loading}
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading
                                    ? styles.spin
                                    : ""
                            }
                        />

                        Refresh
                    </button>

                </header>


                <LedgerFilters

                    search={search}
                    setSearch={setSearch}

                    accountOptions={
                        accountOptions
                    }

                    selectedAccounts={
                        selectedAccounts
                    }

                    setSelectedAccounts={
                        setSelectedAccounts
                    }

                    voucherTypeOptions={
                        VOUCHER_TYPES
                    }

                    selectedVoucherTypes={
                        selectedVoucherTypes
                    }

                    setSelectedVoucherTypes={
                        setSelectedVoucherTypes
                    }

                    partyOptions={
                        partyOptions
                    }

                    selectedParties={
                        selectedParties
                    }

                    setSelectedParties={
                        setSelectedParties
                    }

                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}

                    dateTo={dateTo}
                    setDateTo={setDateTo}

                    clearFilters={
                        clearFilters
                    }

                />


                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}


                <LedgerSummary
                    entries={entries}
                    totalDebit={totalDebit}
                    totalCredit={totalCredit}
                />


                <section
                    className={
                        styles.tableCard
                    }
                >

                    <LedgerTable
                        entries={entries}
                        loading={loading}
                        onViewVoucher={
                            handleViewVoucher
                        }
                    />

                </section>

            </div>

        </AppLayout>
    );
}