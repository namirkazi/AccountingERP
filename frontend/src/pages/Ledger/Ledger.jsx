import {
    BookOpen,
    RefreshCw,
} from "lucide-react";

import {
    useSearchParams,
} from "react-router-dom";

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

    const [searchParams] =
        useSearchParams();


    /*
     * Dashboard navigation type.
     *
     * Examples:
     *
     * /ledger?type=sales
     * /ledger?type=receipt
     * /ledger?type=expense
     * /ledger?type=payments
     *
     */

    const type =
        searchParams.get("type") || "";


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


    /*
     * =====================================================
     * DASHBOARD TYPE → VOUCHER TYPE FILTER
     * =====================================================
     *
     * The Dashboard sends a simple type through the URL.
     *
     * Example:
     *
     * /ledger?type=sales
     *
     * That needs to activate the existing Voucher Type
     * filter rather than creating a second filter system.
     *
     */

    useEffect(() => {

        const typeMap = {

            sales: ["SALE"],

            receipt: ["RECEIPT"],

            expense: ["EXPENSE"],

            payments: ["PAYMENT"],

        };


        const voucherType =
            typeMap[type];


        /*
         * If this is one of the voucher-based Dashboard
         * types, select it in the existing Voucher Type
         * filter.
         */

        if (voucherType) {

            setSelectedVoucherTypes(
                voucherType
            );

        }

    }, [type]);


    /*
     * =====================================================
     * CLEAR FILTERS
     * =====================================================
     */

    function clearFilters() {

        setSearch("");

        setSelectedAccounts([]);

        setSelectedVoucherTypes([]);

        setSelectedParties([]);

        setDateFrom("");

        setDateTo("");

    }


    /*
     * =====================================================
     * LOAD LEDGER
     * =====================================================
     */

    const loadLedger = useCallback(
        async () => {

            setLoading(true);

            setError("");


            try {

                const response =
                    await getLedger({

                        /*
                         * Keep the Dashboard type in the
                         * request as well.
                         */

                        type,

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


                /*
                 * Ledger entries
                 */

                setEntries(
                    Array.isArray(
                        data.entries
                    )
                        ? data.entries
                        : []
                );


                /*
                 * Totals
                 */

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
            type,
            search,
            selectedAccounts,
            selectedVoucherTypes,
            selectedParties,
            dateFrom,
            dateTo,
        ]
    );


    /*
     * =====================================================
     * LOAD WHEN FILTERS CHANGE
     * =====================================================
     */

    useEffect(() => {

        loadLedger();

    }, [loadLedger]);


    /*
     * =====================================================
     * VIEW VOUCHER
     * =====================================================
     */

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


                {/* =================================================
                    HEADER
                ================================================= */}

                <header className={styles.header}>


                    <div className={styles.titleArea}>


                        <div
                            className={
                                styles.titleIcon
                            }
                        >

                            <BookOpen
                                size={22}
                            />

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


                {/* =================================================
                    ACTIVE DASHBOARD FILTER
                ================================================= */}

                {type && (

                    <div
                        className={
                            styles.activeTypeFilter
                        }
                    >

                        <span
                            className={
                                styles.activeTypeLabel
                            }
                        >
                            Showing:
                        </span>


                        <strong>

                            {
                                type === "sales"
                                    ? "Sales"
                                    : type === "receipt"
                                        ? "Receipts"
                                        : type === "expense"
                                            ? "Expenses"
                                            : type === "payments"
                                                ? "Payments"
                                                : type === "receivable"
                                                    ? "Receivables"
                                                    : type === "payable"
                                                        ? "Payables"
                                                        : type === "cash"
                                                            ? "Cash"
                                                            : type === "bank"
                                                                ? "Bank"
                                                                : type === "capital"
                                                                    ? "Capital"
                                                                    : type
                            }

                        </strong>

                    </div>

                )}


                {/* =================================================
                    FILTERS
                ================================================= */}

                <LedgerFilters

                    search={
                        search
                    }

                    setSearch={
                        setSearch
                    }


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


                    dateFrom={
                        dateFrom
                    }

                    setDateFrom={
                        setDateFrom
                    }


                    dateTo={
                        dateTo
                    }

                    setDateTo={
                        setDateTo
                    }


                    clearFilters={
                        clearFilters
                    }

                />


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (

                    <div
                        className={
                            styles.error
                        }
                    >

                        {error}

                    </div>

                )}


                {/* =================================================
                    SUMMARY
                ================================================= */}

                <LedgerSummary

                    entries={
                        entries
                    }

                    totalDebit={
                        totalDebit
                    }

                    totalCredit={
                        totalCredit
                    }

                />


                {/* =================================================
                    TABLE
                ================================================= */}

                <section
                    className={
                        styles.tableCard
                    }
                >

                    <LedgerTable

                        entries={
                            entries
                        }

                        loading={
                            loading
                        }

                        onViewVoucher={
                            handleViewVoucher
                        }

                    />

                </section>


            </div>

        </AppLayout>

    );

}