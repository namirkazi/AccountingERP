import {
    useState
} from "react";

import {
    searchReceiptInvoices
} from "../../../services/transactionService";

export default function useReceiptTransaction() {

    const [
        customer,
        setCustomer
    ] = useState(null);


    const [
        invoices,
        setInvoices
    ] = useState([]);


    const [
        selectedInvoice,
        setSelectedInvoice
    ] = useState(null);


    const [
        receiptAmount,
        setReceiptAmount
    ] = useState("");


    const [
        accountId,
        setAccountId
    ] = useState("");


    const [
        narration,
        setNarration
    ] = useState("");

    useEffect(() => {

        if (!customer?.party_name) {

            setInvoices([]);
            setSelectedInvoice(null);
            setReceiptAmount("");

            return;
        }

        let cancelled = false;

        async function loadInvoices() {

            try {

                const response =
                    await searchReceiptInvoices(
                        customer.party_name
                    );

                if (cancelled) {
                    return;
                }

                const invoices =
                    response?.data?.invoices || [];

                setInvoices(invoices);

            } catch (error) {

                if (!cancelled) {

                    console.error(
                        "Unable to load receipt invoices:",
                        error
                    );

                    setInvoices([]);
                }
            }
        }

        loadInvoices();

        return () => {
            cancelled = true;
        };

    }, [customer]);
    function selectInvoice(
        invoice
    ) {

        setSelectedInvoice(
            invoice || null
        );


        if (!invoice) {

            setReceiptAmount("");

            return;
        }


        setReceiptAmount(
            invoice.outstanding_amount ??
            ""
        );
    }


    function resetReceipt() {

        setCustomer(null);

        setInvoices([]);

        setSelectedInvoice(null);

        setReceiptAmount("");

        setAccountId("");

        setNarration("");
    }


    return {

        customer,
        setCustomer,

        invoices,
        setInvoices,

        selectedInvoice,
        setSelectedInvoice,

        receiptAmount,
        setReceiptAmount,

        accountId,
        setAccountId,

        narration,
        setNarration,

        selectInvoice,

        resetReceipt

    };
}