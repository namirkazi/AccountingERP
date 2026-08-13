import { useMemo, useState } from "react";

const createEmptyItem = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,

    supplierItemId: "",

    description: "",

    unit: "",

    quantity: "1",

    rate: ""
});

export default function useExpenseTransaction() {
    const [items, setItems] = useState([]);
    const [referenceNumber, setReferenceNumber] = useState("");
    const [discount, setDiscount] = useState("");
    const [discountMode, setDiscountMode] = useState("after_tax");
    const [vatRate, setVatRate] = useState("5");
    const [selectedExpense, setSelectedExpense] = useState(null);

    function addItem() {
        setItems(current => [...current, createEmptyItem()]);
    }

    function updateItem(id, field, value) {
        setItems(current =>
            current.map(item =>
                item.id === id
                    ? { ...item, [field]: value }
                    : item
            )
        );
    }

    function removeItem(id) {
        setItems(current => current.filter(item => item.id !== id));
    }

    function resetExpense() {
        setItems([]);
        setReferenceNumber("");
        setDiscount("");
        setDiscountMode("after_tax");
        setVatRate("5");
        setSelectedExpense(null);
    }

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const quantity = Number(item.quantity) || 0;
            const rate = Number(item.rate) || 0;
            return sum + quantity * rate;
        }, 0);
    }, [items]);

    const enteredDiscount = Number(discount) || 0;
    const vatPercentage = Number(vatRate) || 0;

    const beforeTaxDiscount =
        discountMode === "before_tax"
            ? Math.min(enteredDiscount, subtotal)
            : 0;

    const beforeTaxTaxable = Math.max(
        0,
        subtotal - beforeTaxDiscount
    );

    const beforeTaxVat =
        beforeTaxTaxable * vatPercentage / 100;

    const beforeTaxTotal =
        beforeTaxTaxable + beforeTaxVat;

    const afterTaxVat =
        subtotal * vatPercentage / 100;

    const afterTaxTotalBeforeDiscount =
        subtotal + afterTaxVat;

    const afterTaxDiscount =
        discountMode === "after_tax"
            ? Math.min(
                enteredDiscount,
                afterTaxTotalBeforeDiscount
            )
            : 0;

    const afterTaxTotal = Math.max(
        0,
        afterTaxTotalBeforeDiscount - afterTaxDiscount
    );

    const discountAmount =
        discountMode === "after_tax"
            ? afterTaxDiscount
            : beforeTaxDiscount;

    const taxableAmount =
        discountMode === "after_tax"
            ? subtotal
            : beforeTaxTaxable;

    const vatAmount =
        discountMode === "after_tax"
            ? afterTaxVat
            : beforeTaxVat;

    const totalAmount =
        discountMode === "after_tax"
            ? afterTaxTotal
            : beforeTaxTotal;

    const validItems = items.filter(item => {
        return (
            item.description.trim() &&
            Number(item.quantity) > 0 &&
            Number(item.rate) >= 0
        );
    });

    return {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,

        referenceNumber,
        setReferenceNumber,

        selectedExpense,
        setSelectedExpense,

        discount,
        setDiscount,
        discountMode,
        setDiscountMode,

        vatRate,
        setVatRate,

        subtotal,
        grossAmount: subtotal,
        enteredDiscount,
        discountAmount,
        taxableAmount,
        vatAmount,
        totalAmount,
        afterTaxTotalBeforeDiscount,

        validItems,
        resetExpense
    };
}
