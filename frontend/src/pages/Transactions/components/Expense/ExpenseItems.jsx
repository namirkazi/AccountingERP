import { Plus, Trash2 } from "lucide-react";
import styles from "../../Transactions.module.css";

const ITEM_CATALOG_KEY = "mohinii_expense_item_catalog";

function money(value) {
    return (Number(value) || 0).toLocaleString("en-AE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function readCatalog() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(ITEM_CATALOG_KEY) || "[]"
        );

        return Array.isArray(saved)
            ? saved.filter(item => item?.name)
            : [];
    } catch {
        return [];
    }
}

function rememberItem(name, rate) {
    const cleanName = String(name || "").trim();
    const numericRate = Number(rate);

    if (!cleanName || !Number.isFinite(numericRate) || numericRate < 0) {
        return;
    }

    const catalog = readCatalog();
    const existingIndex = catalog.findIndex(
        item => item.name.toLowerCase() === cleanName.toLowerCase()
    );

    const nextItem = {
        name: cleanName,
        rate: numericRate
    };

    if (existingIndex >= 0) {
        catalog[existingIndex] = nextItem;
    } else {
        catalog.push(nextItem);
    }

    try {
        localStorage.setItem(
            ITEM_CATALOG_KEY,
            JSON.stringify(catalog.slice(-100))
        );
    } catch {
        // Local item memory is an enhancement; do not block the form.
    }
}

export default function ExpenseItems({
    items,
    onAddItem,
    onUpdateItem,
    onRemoveItem
}) {
    const catalog = readCatalog();

    function handleItemNameChange(item, value) {
        const match = catalog.find(
            option =>
                option.name.toLowerCase() === value.trim().toLowerCase()
        );

        onUpdateItem(item.id, "description", value);

        if (match) {
            onUpdateItem(item.id, "rate", String(match.rate));
        }
    }

    function handleRateBlur(item) {
        rememberItem(item.description, item.rate);
    }

    return (
        <div className={styles.expenseItemsSection}>
            <div className={styles.expenseItemsHeader}>
                <div>
                    <h3>Items</h3>
                    <p>
                        Select an existing item to auto-fill its rate, or enter a new item once.
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.addItemButton}
                    onClick={onAddItem}
                >
                    <Plus size={16} />
                    Add Item
                </button>
            </div>

            {items.length === 0 ? (
                <div className={styles.expenseItemsEmpty}>
                    <strong>No items added</strong>
                    <span>
                        Add each item from the supplier bill separately.
                    </span>
                </div>
            ) : (
                <div className={styles.expenseItemsTable}>
                    <div className={styles.expenseItemsTableHeader}>
                        <span>Item</span>
                        <span>Qty</span>
                        <span>Rate</span>
                        <span>Amount</span>
                        <span></span>
                    </div>

                    {items.map(item => {
                        const amount =
                            (Number(item.quantity) || 0) *
                            (Number(item.rate) || 0);

                        return (
                            <div
                                className={styles.expenseItemRow}
                                key={item.id}
                            >
                                <div className={styles.itemSelectorField}>
                                    <input
                                        type="text"
                                        list={`expense-items-${item.id}`}
                                        value={item.description}
                                        onChange={event =>
                                            handleItemNameChange(
                                                item,
                                                event.target.value
                                            )
                                        }
                                        onBlur={() =>
                                            handleRateBlur(item)
                                        }
                                        placeholder="Search or enter item"
                                        autoComplete="off"
                                    />

                                    <datalist id={`expense-items-${item.id}`}>
                                        {catalog.map(option => (
                                            <option
                                                key={option.name}
                                                value={option.name}
                                            />
                                        ))}
                                    </datalist>
                                </div>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.quantity}
                                    onChange={event =>
                                        onUpdateItem(
                                            item.id,
                                            "quantity",
                                            event.target.value
                                        )
                                    }
                                    placeholder="1"
                                />

                                <div className={styles.itemRateField}>
                                    <span>AED</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.rate}
                                        onChange={event =>
                                            onUpdateItem(
                                                item.id,
                                                "rate",
                                                event.target.value
                                            )
                                        }
                                        onBlur={() =>
                                            handleRateBlur(item)
                                        }
                                        placeholder="0.00"
                                    />
                                </div>

                                <strong className={styles.expenseItemAmount}>
                                    AED {money(amount)}
                                </strong>

                                <button
                                    type="button"
                                    className={styles.removeItemButton}
                                    onClick={() => onRemoveItem(item.id)}
                                    title="Remove item"
                                    aria-label="Remove item"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
