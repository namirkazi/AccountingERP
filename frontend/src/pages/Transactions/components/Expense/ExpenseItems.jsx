import {
    Plus,
    Trash2
} from "lucide-react";

import ExpenseSelector
    from "../../../../components/accounting/ExpenseSelector";

import styles
    from "../../Transactions.module.css";


function money(value) {

    return (
        Number(value) || 0
    ).toLocaleString(
        "en-AE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


export default function ExpenseItems({

    supplierId,

    items = [],

    onAddItem,

    onUpdateItem,

    onRemoveItem

}) {


    /*
     * =====================================================
     * ITEM SELECTED
     * =====================================================
     */

    function handleItemChange(
        expenseItemId,
        supplierItemId,
        supplierItem
    ) {

        /*
         * Cleared.
         */

        if (!supplierItemId) {

            onUpdateItem(
                expenseItemId,
                "supplierItemId",
                ""
            );

            onUpdateItem(
                expenseItemId,
                "description",
                ""
            );

            onUpdateItem(
                expenseItemId,
                "unit",
                ""
            );

            onUpdateItem(
                expenseItemId,
                "rate",
                ""
            );

            return;

        }


        /*
         * Database ID.
         */

        onUpdateItem(
            expenseItemId,
            "supplierItemId",
            String(
                supplierItemId
            )
        );


        /*
         * Snapshot item name.
         */

        onUpdateItem(
            expenseItemId,
            "description",
            supplierItem?.item_name || ""
        );


        /*
         * Snapshot unit.
         */

        onUpdateItem(
            expenseItemId,
            "unit",
            supplierItem?.unit || ""
        );


        /*
         * Use supplier's default rate.
         */

        onUpdateItem(
            expenseItemId,
            "rate",
            String(
                supplierItem?.default_rate ?? ""
            )
        );

    }


    return (

        <div
            className={
                styles.expenseItemsSection
            }
        >

            <div
                className={
                    styles.expenseItemsHeader
                }
            >

                <div>

                    <h3>
                        Items
                    </h3>

                    <p>
                        Search an existing supplier
                        item or type a new one.
                    </p>

                </div>


                <button
                    type="button"
                    className={
                        styles.addItemButton
                    }
                    onClick={
                        onAddItem
                    }
                    disabled={
                        !supplierId
                    }
                >

                    <Plus size={16} />

                    Add Item

                </button>

            </div>


            {!supplierId && (

                <div
                    className={
                        styles.expenseItemsEmpty
                    }
                >

                    <strong>
                        Select a supplier first
                    </strong>

                    <span>
                        Supplier items are specific
                        to each supplier.
                    </span>

                </div>

            )}


            {supplierId &&
                items.length === 0 && (

                    <div
                        className={
                            styles.expenseItemsEmpty
                        }
                    >

                        <strong>
                            No items added
                        </strong>

                        <span>
                            Click Add Item to start
                            adding items to this voucher.
                        </span>

                    </div>

                )}


            {supplierId &&
                items.length > 0 && (

                    <div
                        className={
                            styles.expenseItemsTable
                        }
                    >

                        <div
                            className={
                                styles.expenseItemsTableHeader
                            }
                        >

                            <span>
                                Item
                            </span>

                            <span>
                                Qty
                            </span>

                            <span>
                                Rate
                            </span>

                            <span>
                                Amount
                            </span>

                            <span>
                            </span>

                        </div>


                        {items.map(item => {

                            const amount =
                                (
                                    Number(
                                        item.quantity
                                    ) || 0
                                ) *
                                (
                                    Number(
                                        item.rate
                                    ) || 0
                                );


                            return (

                                <div
                                    className={
                                        styles.expenseItemRow
                                    }
                                    key={
                                        item.id
                                    }
                                >

                                    {/* ITEM */}

                                    <div
                                        className={
                                            styles.itemSelectorField
                                        }
                                    >

                                        <ExpenseSelector
                                            supplierId={supplierId}
                                            value={item.supplierItemId || null}
                                            onChange={(supplierItemId, supplierItem) =>
                                                handleItemChange(
                                                    item.id,
                                                    supplierItemId,
                                                    supplierItem
                                                )
                                            }
                                            placeholder="Search or enter item..."
                                        />

                                    </div>


                                    {/* QUANTITY */}

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            item.quantity
                                        }
                                        onChange={
                                            event =>
                                                onUpdateItem(
                                                    item.id,
                                                    "quantity",
                                                    event.target.value
                                                )
                                        }
                                        placeholder="1"
                                    />


                                    {/* RATE */}

                                    <div
                                        className={
                                            styles.itemRateField
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
                                                item.rate
                                            }
                                            onChange={
                                                event =>
                                                    onUpdateItem(
                                                        item.id,
                                                        "rate",
                                                        event.target.value
                                                    )
                                            }
                                            placeholder="0.00"
                                        />

                                    </div>


                                    {/* AMOUNT */}

                                    <strong
                                        className={
                                            styles.expenseItemAmount
                                        }
                                    >

                                        AED{" "}

                                        {money(
                                            amount
                                        )}

                                    </strong>


                                    {/* REMOVE */}

                                    <button
                                        type="button"
                                        className={
                                            styles.removeItemButton
                                        }
                                        onClick={() =>
                                            onRemoveItem(
                                                item.id
                                            )
                                        }
                                        title="Remove item"
                                        aria-label="Remove item"
                                    >

                                        <Trash2
                                            size={16}
                                        />

                                    </button>

                                </div>

                            );

                        })}

                    </div>

                )}

        </div>

    );

}