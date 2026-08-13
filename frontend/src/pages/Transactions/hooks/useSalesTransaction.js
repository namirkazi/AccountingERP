import { useMemo, useState } from "react";

const createEmptyService = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    customerServiceId: "",
    description: "",
    amount: ""
});

export default function useSalesTransaction() {

    const [services, setServices] = useState([]);

    const [discount, setDiscount] = useState("");

    const [discountMode, setDiscountMode] =
        useState("after_tax");

    const [vatRate, setVatRate] =
        useState("5");

    function addService() {

        setServices(current => [
            ...current,
            createEmptyService()
        ]);

    }

    function updateService(id, field, value) {

        setServices(current =>
            current.map(service =>
                service.id === id
                    ? {
                        ...service,
                        [field]: value
                    }
                    : service
            )
        );

    }

    function removeService(id) {

        setServices(current =>
            current.filter(
                service =>
                    service.id !== id
            )
        );

    }

    const subtotal = useMemo(() => {

        return services.reduce(
            (sum, service) => {

                return (
                    sum +
                    (
                        Number(
                            service.amount
                        ) || 0
                    )
                );

            },
            0
        );

    }, [services]);


    const enteredDiscount =
        Number(discount) || 0;

    const vatPercentage =
        Number(vatRate) || 0;


    /*
     * Discount BEFORE TAX
     */

    const beforeTaxDiscount =
        discountMode === "before_tax"
            ? Math.min(
                enteredDiscount,
                subtotal
            )
            : 0;

    const beforeTaxTaxable =
        Math.max(
            0,
            subtotal -
            beforeTaxDiscount
        );

    const beforeTaxVat =
        beforeTaxTaxable *
        vatPercentage /
        100;

    const beforeTaxTotal =
        beforeTaxTaxable +
        beforeTaxVat;


    /*
     * Discount AFTER TAX
     */

    const afterTaxVat =
        subtotal *
        vatPercentage /
        100;

    const afterTaxTotalBeforeDiscount =
        subtotal +
        afterTaxVat;

    const afterTaxDiscount =
        discountMode === "after_tax"
            ? Math.min(
                enteredDiscount,
                afterTaxTotalBeforeDiscount
            )
            : 0;

    const afterTaxTotal =
        Math.max(
            0,
            afterTaxTotalBeforeDiscount -
            afterTaxDiscount
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


    const validServices =
        services.filter(service => {

            return (
                service.description.trim() !== "" &&
                Number(service.amount) > 0
            );

        });


    function resetSales() {

        setServices([]);

        setDiscount("");

        setDiscountMode("after_tax");

        setVatRate("5");

    }


    return {

        services,

        addService,

        updateService,

        removeService,

        discount,

        setDiscount,

        discountMode,

        setDiscountMode,

        vatRate,

        setVatRate,

        subtotal,

        enteredDiscount,

        discountAmount,

        taxableAmount,

        vatAmount,

        totalAmount,

        afterTaxTotalBeforeDiscount,

        validServices,

        resetSales

    };

}