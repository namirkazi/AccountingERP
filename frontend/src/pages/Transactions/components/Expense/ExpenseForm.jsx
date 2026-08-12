import { CalendarDays, FileText } from "lucide-react";
import PartySelector from "../../../../components/accounting/PartySelector";
import ExpenseSelector from "../../../../components/accounting/ExpenseSelector";
import ExpenseItems from "./ExpenseItems";
import ExpenseSummary from "./ExpenseSummary";
import TransactionActions from "../Shared/TransactionActions";
import styles from "../../Transactions.module.css";

export default function ExpenseForm({
    date,
    setDate,
    party,
    setParty,
    referenceNumber,
    setReferenceNumber,
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
        <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.card}>
                <div className={styles.sectionTitle}>
                    <FileText size={18} />
                    <span>Expense Details</span>
                </div>

                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label>Date</label>

                        <div className={styles.inputIcon}>
                            <CalendarDays size={16} />
                            <input
                                type="date"
                                value={date}
                                onChange={event =>
                                    setDate(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Supplier</label>
                        <PartySelector
                            value={party}
                            onChange={setParty}
                            partyType="supplier"
                        />
                    </div>
                </div>

                <div className={styles.referenceField}>
                    <label>Supplier Bill / Reference No.</label>
                    <input
                        type="text"
                        value={referenceNumber}
                        onChange={event =>
                            setReferenceNumber(event.target.value)
                        }
                        placeholder="e.g. RB-2026-0047"
                    />
                </div>
            </div>

            {/* ITEMS COME BEFORE DISCOUNT / TAX */}
            <div className={styles.card}>
                <div className={styles.sectionTitle}>Items</div>

                <ExpenseItems
                    items={items}
                    onAddItem={addItem}
                    onUpdateItem={updateItem}
                    onRemoveItem={removeItem}
                />

                <div className={styles.itemSubtotalBar}>
                    <span>Items Subtotal</span>
                    <strong>
                        AED {Number(subtotal || 0).toLocaleString("en-AE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </strong>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.sectionTitle}>Discount & Tax</div>

                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label>
                            Discount
                            <span className={styles.optionalLabel}>
                                Optional
                            </span>
                        </label>

                        <div className={styles.amountField}>
                            <span>AED</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                max={
                                    discountMode === "after_tax"
                                        ? afterTaxTotalBeforeDiscount
                                        : subtotal
                                }
                                value={discount}
                                onChange={event =>
                                    setDiscount(event.target.value)
                                }
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Discount Applied</label>
                        <select
                            value={discountMode}
                            onChange={event =>
                                setDiscountMode(event.target.value)
                            }
                        >
                            <option value="before_tax">Before Tax</option>
                            <option value="after_tax">After Tax</option>
                        </select>
                    </div>

                    <div className={styles.vatField}>
                        <label>VAT</label>
                        <div className={styles.vatInputWrapper}>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={vatRate}
                                onChange={event =>
                                    setVatRate(event.target.value)
                                }
                                placeholder="5"
                            />
                            <span>%</span>
                        </div>
                    </div>
                </div>

                <ExpenseSummary
                    subtotal={subtotal}
                    discountAmount={discountAmount}
                    taxableAmount={taxableAmount}
                    vatRate={vatRate}
                    vatAmount={vatAmount}
                    totalAmount={totalAmount}
                />
            </div>

            <div className={styles.card}>
                <div className={styles.sectionTitle}>Expense Head</div>

                <div className={styles.field}>
                    <label>Expense</label>
                    <ExpenseSelector
                        value={selectedExpense?.id || null}
                        onChange={id =>
                            setSelectedExpense(id ? { id } : null)
                        }
                        placeholder="Search expense..."
                    />
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.sectionTitle}>Narration</div>

                <textarea
                    rows={4}
                    value={narration}
                    onChange={event => setNarration(event.target.value)}
                    placeholder="Optional description..."
                />
            </div>

            <TransactionActions
                error={error}
                message={message}
                saving={saving}
                label="Expense"
            />
        </form>
    );
}
