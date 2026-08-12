import {
    useState
} from "react";


export default function usePaymentTransaction() {

    const [
        paymentExpenses,
        setPaymentExpenses
    ] = useState([]);


    const [
        selectedPaymentExpense,
        setSelectedPaymentExpense
    ] = useState(null);


    const [
        paymentAmount,
        setPaymentAmount
    ] = useState("");


    /*
     * SELECT BILL
     */

    function selectPaymentExpense(
        expense
    ) {

        setSelectedPaymentExpense(
            expense || null
        );


        if (!expense) {

            setPaymentAmount("");

            return;
        }


        setPaymentAmount(
            expense.outstanding_amount ??
            ""
        );
    }


    /*
     * RESET
     */

    function resetPayment() {

        setPaymentExpenses([]);

        setSelectedPaymentExpense(
            null
        );

        setPaymentAmount("");
    }


    return {

        paymentExpenses,
        setPaymentExpenses,

        selectedPaymentExpense,
        setSelectedPaymentExpense,

        paymentAmount,
        setPaymentAmount,

        selectPaymentExpense,

        resetPayment

    };
}