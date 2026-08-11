import { useAuth } from "../../context/AuthContext";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/ui/StatCard";
import { useEffect, useState } from "react";

import { getDashboardBalances } from "../../services/dashboardService";

import {
    Wallet,
    Landmark,
    ArrowDownToLine,
    ArrowUpFromLine,
} from "lucide-react";

import styles from "./Dashboard.module.css";

export default function Dashboard() {
    const [summary, setSummary] = useState({
        cash: 0,
        bank: 0,
        receivable: 0,
        payable: 0,
        capital: 0,
        sales: 0,
        receipts: 0,
        payments: 0,
        expenses: 0,
        profit: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { user } = useAuth();

    const firstName = user?.full_name
        ? user.full_name.split(" ")[0]
        : "User";
    useEffect(() => {

        async function loadDashboard() {

            try {

                setLoading(true);

                const response =
                    await getDashboardBalances();

                setSummary(
                    response.data.summary
                );

            } catch (error) {

                console.error(
                    "Dashboard error:",
                    error
                );

                setError(
                    error.message ||
                    "Unable to load dashboard."
                );

            } finally {

                setLoading(false);
            }
        }

        loadDashboard();

    }, []);
    return (
        <AppLayout>

            <div className={styles.page}>

                {/* Header */}
                <div className={styles.header}>

                    <div>
                        <h1>Dashboard</h1>

                        <p>
                            Good morning, {firstName}.
                            Here's your business overview.
                        </p>
                    </div>

                    <div className={styles.company}>

                        {user?.logo ? (
                            <img
                                src={user.logo}
                                alt={user.company_name}
                            />
                        ) : (
                            <div className={styles.companyLogo}>
                                {user?.company_code?.charAt(0) || "C"}
                            </div>
                        )}

                        <div>
                            <strong>
                                {user?.company_name || "Company"}
                            </strong>

                            <span>
                                {user?.role === "admin"
                                    ? "Administrator"
                                    : "User"}
                            </span>
                        </div>

                    </div>

                </div>


                {/* Main Accounting Overview */}
                <section>

                    <div className={styles.sectionHeader}>
                        <h2>Overview</h2>

                        <span>
                            Current Period
                        </span>
                    </div>


                    <div className={styles.stats}>

                        <StatCard
                            title="Sales"
                            value={`AED ${summary.sales.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`}
                            icon={Wallet}
                        />

                        <StatCard
                            title="Receipts"
                            value={`AED ${summary.receipts.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`}
                            icon={ArrowDownToLine}
                        />

                        <StatCard
                            title="Payments"
                            value={`AED ${summary.payments.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`}
                            icon={ArrowUpFromLine}
                        />

                        <StatCard
                            title="Expenses"
                            value={`AED ${summary.expenses.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`}
                            icon={Landmark}
                        />

                    </div>

                </section>


                {/* Financial Position */}
                <section className={styles.financialSection}>

                    <div className={styles.sectionHeader}>

                        <h2>Financial Position</h2>

                    </div>

                    <div className={styles.financialGrid}>

                        <div className={styles.financialCard}>
                            <span>Cash</span>
                            <strong>AED {summary.cash.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</strong>
                        </div>

                        <div className={styles.financialCard}>
                            <span>Bank</span>
                            <strong>AED {summary.bank.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</strong>
                        </div>

                        <div className={styles.financialCard}>
                            <span>Receivable</span>
                            <strong>AED {summary.receivable.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</strong>
                        </div>

                        <div className={styles.financialCard}>
                            <span>Payable</span>
                            <strong>AED {summary.payable.toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</strong>
                        </div>

                    </div>

                </section>


                {/* Recent Activity */}
                <section className={styles.activitySection}>

                    <div className={styles.sectionHeader}>

                        <h2>Recent Activity</h2>

                    </div>

                    <div className={styles.emptyActivity}>

                        <div className={styles.emptyIcon}>
                            <Wallet size={22} />
                        </div>

                        <div>
                            <strong>
                                No transactions yet
                            </strong>

                            <p>
                                Your sales, receipts, payments
                                and expenses will appear here.
                            </p>
                        </div>

                    </div>

                </section>

            </div>

        </AppLayout>
    );
}