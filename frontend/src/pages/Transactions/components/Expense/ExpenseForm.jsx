import {
    CalendarDays,
    FileText
} from "lucide-react";

import PartySelector
    from "../../../../components/accounting/PartySelector";

import ExpenseSelector
    from "../../../../components/accounting/ExpenseSelector";

import ExpenseItems
    from "./ExpenseItems";

import ExpenseSummary
    from "./ExpenseSummary";

import TransactionActions
    from "../Shared/TransactionActions";

import styles
    from "../../Transactions.module.css";


export default function ExpenseForm({

    date,
    setDate,

    party,
    setParty,

    referenceNumber,
    setReferenceNumber,

    attachment,
    setAttachment,

    selectedExpense,
    setSelectedExpense,

    items,

    addItem,
    updateItem,
    removeItem,

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

            {/* =================================================
                EXPENSE DETAILS
            ================================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    <FileText size={18} />

                    <span>
                        Expense Details
                    </span>

                </div>


                <div className={styles.fieldRow}>

                    {/* DATE */}

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
                                onChange={
                                    event =>
                                        setDate(
                                            event.target.value
                                        )
                                }
                            />

                        </div>

                    </div>


                    {/* SUPPLIER */}

                    <div className={styles.field}>

                        <label>
                            Supplier
                        </label>

                        <PartySelector
                            value={party}
                            onChange={setParty}
                            partyType="supplier"
                        />

                    </div>

                </div>


                {/* REFERENCE */}

                <div
                    className={
                        styles.referenceField
                    }
                >

                    <label>
                        Supplier Bill / Reference No.
                    </label>

                    <input
                        type="text"
                        value={referenceNumber}
                        onChange={
                            event =>
                                setReferenceNumber(
                                    event.target.value
                                )
                        }
                        placeholder="e.g. RB-2026-0047"
                    />

                </div>

                <div className={styles.referenceField}>
                    <label>
                        Supplier Bill Attachment
                        <span className={styles.optionalLabel}>
                              -Optional · PDF or image
                        </span>
                    </label>

                    <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={event => {
                            const file = event.target.files?.[0] || null;
                            setAttachment(file);
                        }}
                    />

                    {attachment && (
                        <span className={styles.fileName}>
                            {attachment.name}
                        </span>
                    )}
                </div>

            </div>


            {/* =================================================
                ITEMS
            ================================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    Items

                </div>


                <ExpenseItems

                    supplierId={
                        party?.id || null
                    }

                    items={items}

                    onAddItem={addItem}

                    onUpdateItem={updateItem}

                    onRemoveItem={removeItem}

                />


                <div
                    className={
                        styles.itemSubtotalBar
                    }
                >

                    <span>
                        Items Subtotal
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


            {/* =================================================
                DISCOUNT & TAX
            ================================================= */}

            <div className={styles.card}>

                <div
                    className={
                        styles.sectionTitle
                    }
                >

                    Discount & Tax

                </div>


                <div className={styles.fieldRow}>

                    {/* DISCOUNT */}

                    <div className={styles.field}>

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
                                onChange={
                                    event =>
                                        setDiscount(
                                            event.target.value
                                        )
                                }
                                placeholder="0.00"
                            />

                        </div>

                    </div>


                    {/* DISCOUNT MODE */}

                    <div className={styles.field}>

                        <label>
                            Discount Applied
                        </label>


                        <select
                            value={discountMode}
                            onChange={
                                event =>
                                    setDiscountMode(
                                        event.target.value
                                    )
                            }
                        >

                            <option value="before_tax">
                                Before Tax
                            </option>

                            <option value="after_tax">
                                After Tax
                            </option>

                        </select>

                    </div>


                    {/* VAT */}

                    <div className={styles.vatField}>

                        <label>
                            VAT
                        </label>


                        <div
                            className={
                                styles.vatInputWrapper
                            }
                        >

                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={vatRate}
                                onChange={
                                    event =>
                                        setVatRate(
                                            event.target.value
                                        )
                                }
                                placeholder="5"
                            />

                            <span>
                                %
                            </span>

                        </div>

                    </div>

                </div>


                <ExpenseSummary

                    subtotal={subtotal}

                    discountAmount={
                        discountAmount
                    }

                    taxableAmount={
                        taxableAmount
                    }

                    vatRate={vatRate}

                    vatAmount={
                        vatAmount
                    }

                    totalAmount={
                        totalAmount
                    }

                />

            </div>

            {/* =================================================
                NARRATION
            ================================================= */}

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

                    onChange={
                        event =>
                            setNarration(
                                event.target.value
                            )
                    }

                    placeholder="Optional description..."

                />

            </div>


            {/* =================================================
                ACTIONS
            ================================================= */}

            <TransactionActions

                error={error}

                message={message}

                saving={saving}

                label="Expense"

            />

        </form>

    );

}