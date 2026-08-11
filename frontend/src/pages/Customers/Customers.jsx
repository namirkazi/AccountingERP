import { useEffect, useState } from "react";

import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Users
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

import Button from "../../components/ui/Button";

import {
    getCustomers,
    deleteCustomer
} from "../../services/customerService";

import styles from "./Customers.module.css";

export default function Customers() {

    const [customers, setCustomers] = useState([]);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    async function loadCustomers(
        searchValue = ""
    ) {

        try {

            setLoading(true);

            setError("");

            const response =
                await getCustomers(searchValue);

            setCustomers(
                response.data.customers
            );

        } catch (error) {

            setError(
                error.message ||
                "Unable to load customers."
            );

        } finally {

            setLoading(false);

        }
    }

    useEffect(() => {

        loadCustomers();

    }, []);

    async function handleDelete(id) {

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this customer?"
            );

        if (!confirmed) {
            return;
        }

        try {

            await deleteCustomer(id);

            await loadCustomers(search);

        } catch (error) {

            setError(
                error.message ||
                "Unable to delete customer."
            );

        }
    }

    function handleSearch(event) {

        const value =
            event.target.value;

        setSearch(value);

        loadCustomers(value);
    }

    return (

        <AppLayout>

            <div className={styles.page}>

                <div className={styles.header}>

                    <div>

                        <h1>
                            Customers
                        </h1>

                        <p>
                            Manage your customers
                            and their account details.
                        </p>

                    </div>

                    <Button>

                        <Plus size={18} />

                        Add Customer

                    </Button>

                </div>


                <div className={styles.toolbar}>

                    <div className={styles.search}>

                        <Search size={18} />

                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={search}
                            onChange={handleSearch}
                        />

                    </div>

                    <span>
                        {customers.length} customers
                    </span>

                </div>


                {error && (

                    <div className={styles.error}>
                        {error}
                    </div>

                )}


                <div className={styles.tableCard}>

                    {loading ? (

                        <div className={styles.loading}>
                            Loading customers...
                        </div>

                    ) : customers.length === 0 ? (

                        <div className={styles.empty}>

                            <div className={styles.emptyIcon}>
                                <Users size={22} />
                            </div>

                            <h3>
                                No customers found
                            </h3>

                            <p>
                                Add your first customer
                                to get started.
                            </p>

                        </div>

                    ) : (

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Customer
                                    </th>

                                    <th>
                                        Phone
                                    </th>

                                    <th>
                                        Email
                                    </th>

                                    <th>
                                        Opening Balance
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {customers.map(
                                    customer => (

                                        <tr
                                            key={
                                                customer.id
                                            }
                                        >

                                            <td>
                                                <strong>
                                                    {
                                                        customer.customer_name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    customer.phone
                                                    || "—"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    customer.email
                                                    || "—"
                                                }
                                            </td>

                                            <td>
                                                AED{" "}
                                                {Number(
                                                    customer.opening_balance
                                                ).toFixed(2)}
                                            </td>

                                            <td>

                                                <div
                                                    className={
                                                        styles.actions
                                                    }
                                                >

                                                    <button
                                                        title="Edit"
                                                    >
                                                        <Pencil
                                                            size={17}
                                                        />
                                                    </button>

                                                    <button
                                                        title="Delete"
                                                        onClick={() =>
                                                            handleDelete(
                                                                customer.id
                                                            )
                                                        }
                                                    >
                                                        <Trash2
                                                            size={17}
                                                        />
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    )}

                </div>

            </div>

        </AppLayout>
    );
}