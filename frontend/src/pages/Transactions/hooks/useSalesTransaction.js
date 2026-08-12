import {
    useMemo,
    useState
} from "react";

import {
    calculateSalesTotals
} from "../../../utils/salesCalculations";


function createSalesItem() {

    return {

        id:
            Date.now() +
            Math.random(),

        description: "",

        quantity: 1,

        rate: ""

    };

}


export default function useSalesTransaction() {

    const [
        customer,
        setCustomer
    ] = useState(null);


    const [
        invoiceNumber,
        setInvoiceNumber
    ] = useState("");


    const [
        items,
        setItems
    ] = useState([
        createSalesItem()
    ]);


    const [
        vatRate,
        setVatRate
    ] = useState("5");


    const [
        discount,
        setDiscount
    ] = useState("");


    const [
        discountMode,
        setDiscountMode
    ] = useState("after_tax");


    const [
        narration,
        setNarration
    ] = useState("");


    function updateItem(
        index,
        field,
        value
    ) {

        setItems(
            current =>
                current.map(
                    (item, itemIndex) =>
                        itemIndex === index
                            ? {
                                ...item,
                                [field]: value
                            }
                            : item
                )
        );
    }


    function addItem() {

        setItems(
            current => [
                ...current,
                createSalesItem()
            ]
        );
    }


    function removeItem(
        index
    ) {

        setItems(
            current => {

                if (
                    current.length === 1
                ) {
                    return current;
                }

                return current.filter(
                    (_, itemIndex) =>
                        itemIndex !== index
                );

            }
        );
    }


    const totals = useMemo(
        () =>
            calculateSalesTotals({

                items,

                vatRate,

                discount,

                discountMode

            }),

        [
            items,
            vatRate,
            discount,
            discountMode
        ]
    );


    function resetSales() {

        setCustomer(null);

        setInvoiceNumber("");

        setItems([
            createSalesItem()
        ]);

        setVatRate("5");

        setDiscount("");

        setDiscountMode(
            "after_tax"
        );

        setNarration("");
    }


    return {

        customer,
        setCustomer,

        invoiceNumber,
        setInvoiceNumber,

        items,

        updateItem,
        addItem,
        removeItem,

        vatRate,
        setVatRate,

        discount,
        setDiscount,

        discountMode,
        setDiscountMode,

        narration,
        setNarration,

        ...totals,

        resetSales

    };
}