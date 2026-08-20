import {
    BookOpen,
    RefreshCw,
} from "lucide-react";
import PrintableVoucher from "../../components/accounting/PrintableVoucher";
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
    useRef,
    useState,
} from "react";

import {
    getLedger,
    getVoucher,
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

    const [
        searchParams,
        setSearchParams
    ] = useSearchParams();

    const voucherPrintRef = useRef(null);
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

    const [
        viewingVoucher,
        setViewingVoucher
    ] = useState(null);

    const [
        loadingVoucher,
        setLoadingVoucher
    ] = useState(false);

    const [
        voucherError,
        setVoucherError
    ] = useState("");

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

        if (!voucherType) {
            return;
        }

        setSelectedVoucherTypes(
            voucherType
        );

        const nextParams =
            new URLSearchParams(
                searchParams
            );

        nextParams.delete("type");

        setSearchParams(
            nextParams,
            {
                replace: true
            }
        );

    }, [
        type,
        searchParams,
        setSearchParams
    ]);


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
                        type: "",
                        search,
                        accountIds: selectedAccounts,
                        voucherTypes: selectedVoucherTypes,
                        partyIds: selectedParties,
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
    const handlePrintViewedVoucher = () => {
        if (!voucherPrintRef.current) {
            return;
        }

        window.print();
    };
    async function handleViewVoucher(entry) {

        const voucherId =
            Number(
                entry?.voucher_id
            );


        if (!voucherId) {

            setVoucherError(
                "This ledger entry does not have a valid voucher."
            );

            return;
        }


        try {

            setVoucherError("");
            setLoadingVoucher(true);


            const response =
                await getVoucher(
                    voucherId
                );


            const voucher =
                response?.data ||
                response?.voucher ||
                null;


            if (!voucher) {

                throw new Error(
                    "Unable to load this voucher."
                );
            }


            setViewingVoucher(
                voucher
            );


        } catch (error) {

            console.error(
                "Unable to view voucher:",
                error
            );


            setVoucherError(
                error.message ||
                "Unable to load voucher."
            );


        } finally {

            setLoadingVoucher(false);

        }
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
            {loadingVoucher && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        background: "rgba(15, 23, 42, 0.65)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: 12,
                            padding: "24px 32px",
                            fontWeight: 600,
                            color: "#111827",
                        }}
                    >
                        Loading bill...
                    </div>
                </div>
            )}


            {voucherError && (
                <div
                    style={{
                        position: "fixed",
                        right: 24,
                        bottom: 24,
                        zIndex: 10000,
                        background: "#ffffff",
                        border: "1px solid #fecaca",
                        borderRadius: 10,
                        padding: "14px 18px",
                        color: "#b91c1c",
                        boxShadow:
                            "0 10px 30px rgba(0,0,0,0.15)",
                    }}
                >
                    {voucherError}
                </div>
            )}


            {viewingVoucher && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9998,
                        background:
                            "rgba(15, 23, 42, 0.72)",
                        overflowY: "auto",
                        padding: "24px",
                    }}
                >

                    <div
                        style={{
                            maxWidth: 980,
                            margin: "0 auto",
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 10,
                                marginBottom: 14,
                            }}
                        >

                            <button
                                type="button"
                                onClick={handlePrintViewedVoucher}
                                style={{
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "10px 18px",
                                    background: "#111827",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Print
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setViewingVoucher(null)
                                }
                                style={{
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "10px 18px",
                                    background: "#ffffff",
                                    color: "#111827",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Close
                            </button>
                        </div>

                        <div
                            ref={voucherPrintRef}
                            className={styles.ledgerVoucherPrintArea}
                        >
                            <PrintableVoucher
                                type={viewingVoucher.type}
                                date={viewingVoucher.date}
                                party={viewingVoucher.party}
                                company={viewingVoucher.company}
                                referenceNumber={
                                    viewingVoucher.referenceNumber
                                }
                                voucherNumber={
                                    viewingVoucher.voucherNumber
                                }
                                items={
                                    viewingVoucher.items
                                }
                                amount={
                                    viewingVoucher.amount
                                }
                                discountAmount={
                                    viewingVoucher.discountAmount
                                }
                                vatRate={
                                    viewingVoucher.vatRate
                                }
                                vatAmount={
                                    viewingVoucher.vatAmount
                                }
                                totalAmount={
                                    viewingVoucher.totalAmount
                                }
                                paymentAmount={
                                    viewingVoucher.paymentAmount
                                }
                                receiptAmount={
                                    viewingVoucher.receiptAmount
                                }
                                paymentAccount={
                                    viewingVoucher.paymentAccount
                                }
                                selectedPaymentBill={
                                    viewingVoucher.selectedPaymentBill
                                }
                                selectedReceiptBill={
                                    viewingVoucher.selectedReceiptBill
                                }
                                narration={
                                    viewingVoucher.narration
                                }
                                documentStatus="COPY"
                            />
                        </div>
                    </div>

                </div>
            )}
        </AppLayout>

    );

}