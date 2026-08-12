import {
    useState
} from "react";


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