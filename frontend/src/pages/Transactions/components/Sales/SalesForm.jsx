import {
    CalendarDays,
    FileText,
    Plus,
    Trash2
} from "lucide-react";

import PartySelector
    from "../../../../components/accounting/PartySelector";

import CustomerServiceSelector
    from "./CustomerServiceSelector";

import TransactionActions
    from "../Shared/TransactionActions";

import styles
    from "../../Transactions.module.css";


export default function SalesForm({

    date,
    setDate,

    party,
    setParty,

    billNumber,

    services,
    addService,
    updateService,
    removeService,

    subtotal,

    discount,
    setDiscount,

    discountMode,
    setDiscountMode,

    vatRate,
    setVatRate,

    afterTaxTotalBeforeDiscount,

    discountAmount,

    taxableAmount,

    vatAmount,

    totalAmount,

    narration,
    setNarration,

    error,
    message,

    saving,

    onSubmit

}) {

    return (

        <form
            className={styles.form}
            onSubmit={onSubmit}
        >

            {/* =========================================
                SALES DETAILS
            ========================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    <FileText size={18} />

                    <span>
                        Sales Details
                    </span>

                </div>


                <div className={styles.fieldRow}>

                    <div className={styles.field}>

                        <label>
                            Date
                        </label>

                        <div
                            className={
                                styles.inputIcon
                            }
                        >

                            <CalendarDays
                                size={16}
                            />

                            <input
                                type="date"
                                value={date}
                                onChange={event =>
                                    setDate(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                    </div>


                    <div className={styles.field}>

                        <label>
                            Customer
                        </label>

                        <PartySelector
                            value={party}
                            onChange={setParty}
                            partyType="customer"
                        />

                    </div>

                </div>


                <div
                    className={
                        styles.referenceField
                    }
                >

                    <label>
                        Bill No.
                    </label>

                    <input
                        type="text"
                        value={
                            billNumber ||
                            "Generated on save"
                        }
                        readOnly
                    />

                </div>

            </div>


            {/* =========================================
                SERVICES
            ========================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    Services

                </div>


                <div
                    className={
                        styles.salesServiceHeader
                    }
                >

                    <span>
                        Service
                    </span>

                    <span>
                        Amount
                    </span>

                </div>

                <button
                    type="button"
                    className={
                        styles.addItemButton
                    }
                    onClick={addService}
                    disabled={!party}
                >

                    <Plus size={16} />

                    Add Service

                </button>
                <div
                    className={
                        styles.salesServiceList
                    }
                >

                    {services.length === 0 && (

                        <div
                            className={
                                styles.emptyItems
                            }
                        >

                            No services added yet.

                        </div>

                    )}


                    {services.map(
                        service => (

                            <div
                                className={
                                    styles.salesServiceRow
                                }
                                key={service.id}
                            >

                                <CustomerServiceSelector

                                    customerId={
                                        party?.id || null
                                    }

                                    value={service}

                                    amount={
                                        service.amount
                                    }

                                    onChange={selected => {

                                        if (!selected) {

                                            updateService(
                                                service.id,
                                                "description",
                                                ""
                                            );

                                            return;

                                        }

                                        updateService(
                                            service.id,
                                            "customerServiceId",
                                            selected.customerServiceId
                                        );

                                        updateService(
                                            service.id,
                                            "description",
                                            selected.description
                                        );

                                        if (
                                            selected.amount !==
                                            undefined
                                        ) {

                                            updateService(
                                                service.id,
                                                "amount",
                                                selected.amount
                                            );

                                        }

                                    }}

                                />


                                <div
                                    className={
                                        styles.salesAmountField
                                    }
                                >

                                    <span>
                                        AED
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            service.amount
                                        }
                                        placeholder="0.00"
                                        onChange={event =>
                                            updateService(
                                                service.id,
                                                "amount",
                                                event.target.value
                                            )
                                        }
                                    />

                                </div>


                                <button
                                    type="button"
                                    className={
                                        styles.removeItemButton
                                    }
                                    onClick={() =>
                                        removeService(
                                            service.id
                                        )
                                    }
                                    title="Remove service"
                                >

                                    <Trash2
                                        size={16}
                                    />

                                </button>

                            </div>

                        )
                    )}

                </div>





                <div
                    className={
                        styles.itemSubtotalBar
                    }
                >

                    <span>
                        Services Subtotal
                    </span>

                    <strong>
                        AED{" "}
                        {Number(
                            subtotal || 0
                        ).toLocaleString(
                            "en-AE",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )}
                    </strong>

                </div>

            </div>


            {/* =========================================
                TAX + DISCOUNT
            ========================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    Tax & Discount

                </div>


                <div
                    className={
                        styles.fieldRow
                    }
                >

                    <div
                        className={
                            styles.field
                        }
                    >

                        <label>
                            Tax
                        </label>

                        <div
                            className={
                                styles.amountField
                            }
                        >

                            <span>
                                %
                            </span>

                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={vatRate}
                                onChange={event =>
                                    setVatRate(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                    </div>


                    <div
                        className={
                            styles.field
                        }
                    >

                        <label>

                            Discount

                            <span
                                className={
                                    styles.optionalLabel
                                }
                            >
                                Optional
                            </span>

                        </label>

                        <div
                            className={
                                styles.amountField
                            }
                        >

                            <span>
                                AED
                            </span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                max={
                                    discountMode ===
                                        "after_tax"
                                        ? afterTaxTotalBeforeDiscount
                                        : subtotal
                                }
                                value={discount}
                                onChange={event =>
                                    setDiscount(
                                        event.target.value
                                    )
                                }
                                placeholder="0.00"
                            />

                        </div>

                    </div>

                </div>


                <div
                    className={
                        styles.discountMode
                    }
                >

                    <label>
                        Discount applied
                    </label>

                    <select
                        value={discountMode}
                        onChange={event =>
                            setDiscountMode(
                                event.target.value
                            )
                        }
                    >

                        <option value="after_tax">
                            After Tax
                        </option>

                        <option value="before_tax">
                            Before Tax
                        </option>

                    </select>

                </div>

            </div>


            {/* =========================================
                TOTALS
            ========================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    Summary

                </div>


                <div
                    className={
                        styles.transactionSummary
                    }
                >

                    <div>
                        <span>
                            Subtotal
                        </span>

                        <strong>
                            AED{" "}
                            {Number(
                                subtotal || 0
                            ).toFixed(2)}
                        </strong>
                    </div>


                    {discountAmount > 0 && (

                        <div>
                            <span>
                                Discount
                            </span>

                            <strong>
                                - AED{" "}
                                {Number(
                                    discountAmount
                                ).toFixed(2)}
                            </strong>
                        </div>

                    )}


                    <div>
                        <span>
                            Taxable Amount
                        </span>

                        <strong>
                            AED{" "}
                            {Number(
                                taxableAmount || 0
                            ).toFixed(2)}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Tax
                        </span>

                        <strong>
                            AED{" "}
                            {Number(
                                vatAmount || 0
                            ).toFixed(2)}
                        </strong>
                    </div>


                    <div
                        className={
                            styles.grandTotal
                        }
                    >

                        <span>
                            Total
                        </span>

                        <strong>
                            AED{" "}
                            {Number(
                                totalAmount || 0
                            ).toFixed(2)}
                        </strong>

                    </div>

                </div>

            </div>


            {/* =========================================
                NARRATION
            ========================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    Narration

                </div>

                <textarea
                    rows={4}
                    value={narration}
                    onChange={event =>
                        setNarration(
                            event.target.value
                        )
                    }
                    placeholder="Optional description..."
                />

            </div>


            <TransactionActions
                error={error}
                message={message}
                saving={saving}
                label="Sale"
            />

        </form>

    );

}