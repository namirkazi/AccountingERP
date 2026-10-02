import styles from "../../Transactions.module.css";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PaymentBillSelector({
  party,
  paymentBills,
  paymentAllocations,
  setPaymentAllocations,
}) {
  function getAllocation(billId) {
    return paymentAllocations.find(
      (allocation) => String(allocation.expense_id) === String(billId),
    );
  }

  function isSelected(billId) {
    return Boolean(getAllocation(billId));
  }

  function selectBill(bill) {
    const outstanding = Number(bill.outstanding_amount) || 0;

    if (outstanding <= 0) {
      return;
    }

    setPaymentAllocations((current) => {
      const exists = current.some(
        (allocation) => String(allocation.expense_id) === String(bill.id),
      );

      if (exists) {
        return current;
      }

      return [
        ...current,
        {
          expense_id: Number(bill.id),
          amount: outstanding.toFixed(2),

          reference_number: bill.reference_number || "",

          bill_reference: bill.bill_reference || "",

          bill_amount: Number(bill.amount) || 0,

          paid_amount: Number(bill.paid_amount) || 0,

          outstanding_amount: outstanding,

          party_name: bill.party_name || party?.party_name || "",

          items: Array.isArray(bill.items) ? bill.items : [],

          items_summary: bill.items_summary || "",
        },
      ];
    });
  }

  function removeBill(billId) {
    setPaymentAllocations((current) =>
      current.filter(
        (allocation) => String(allocation.expense_id) !== String(billId),
      ),
    );
  }

  function toggleBill(bill) {
    if (isSelected(bill.id)) {
      removeBill(bill.id);
      return;
    }

    selectBill(bill);
  }

  function updateAmount(bill, value) {
    const outstanding = Number(bill.outstanding_amount) || 0;

    let nextValue = value;

    if (value !== "" && Number(value) > outstanding) {
      nextValue = outstanding.toFixed(2);
    }

    setPaymentAllocations((current) =>
      current.map((allocation) =>
        String(allocation.expense_id) === String(bill.id)
          ? {
              ...allocation,
              amount: nextValue,
            }
          : allocation,
      ),
    );
  }

  function selectAll() {
    const nextAllocations = paymentBills
      .filter((bill) => Number(bill.outstanding_amount) > 0)
      .map((bill) => ({
        expense_id: Number(bill.id),

        amount: Number(bill.outstanding_amount || 0).toFixed(2),

        reference_number: bill.reference_number || "",

        bill_reference: bill.bill_reference || "",

        bill_amount: Number(bill.amount) || 0,

        paid_amount: Number(bill.paid_amount) || 0,

        outstanding_amount: Number(bill.outstanding_amount) || 0,

        party_name: bill.party_name || party?.party_name || "",

        items: Array.isArray(bill.items) ? bill.items : [],

        items_summary: bill.items_summary || "",
      }));

    setPaymentAllocations(nextAllocations);
  }

  function clearAll() {
    setPaymentAllocations([]);
  }

  const totalPayment = paymentAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.amount) || 0),
    0,
  );

  if (!party) {
    return (
      <div className={styles.paymentSelection}>
        <div className={styles.field}>
          <label>Outstanding Bills</label>

          <div className={styles.selectedPaymentBill}>
            Select a supplier first.
          </div>
        </div>
      </div>
    );
  }

  if (paymentBills.length === 0) {
    return (
      <div className={styles.paymentSelection}>
        <div className={styles.field}>
          <label>Outstanding Bills</label>

          <div className={styles.selectedPaymentBill}>
            No outstanding bills found for this supplier.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.paymentSelection}>
      <div className={styles.field}>
        <label>Outstanding Bills</label>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={selectAll}>
            Select All
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={paymentAllocations.length === 0}
          >
            Clear All
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {paymentBills.map((bill) => {
            const selected = isSelected(bill.id);

            const allocation = getAllocation(bill.id);

            const outstanding = Number(bill.outstanding_amount) || 0;

            return (
              <div key={bill.id} className={styles.selectedPaymentBill}>
                <div className={styles.selectedPaymentBillHeader}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleBill(bill)}
                      />

                      <strong>
                        {bill.reference_number || `Voucher #${bill.id}`}
                      </strong>
                    </label>

                    {bill.bill_reference && (
                      <span>
                        Supplier Ref: <strong>{bill.bill_reference}</strong>
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {bill.attachment?.url ? (
                      <a
                        href={bill.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "32px",
                          padding: "0 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "7px",
                          background: "#ffffff",
                          color: "#111827",
                          fontSize: "12px",
                          fontWeight: 600,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View Supplier Bill
                      </a>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        No attachment
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.selectedPaymentBillAmounts}>
                  <div>
                    <span>Bill Total</span>

                    <strong>AED {formatMoney(bill.amount)}</strong>
                  </div>

                  <div>
                    <span>Already Paid</span>

                    <strong>AED {formatMoney(bill.paid_amount)}</strong>
                  </div>

                  <div>
                    <span>Outstanding</span>

                    <strong>AED {formatMoney(outstanding)}</strong>
                  </div>

                  <div>
                    <span>Pay Now</span>

                    <div className={styles.amountField}>
                      <span>AED</span>

                      <input
                        type="number"
                        min="0.01"
                        max={outstanding}
                        step="0.01"
                        disabled={!selected}
                        value={selected ? (allocation?.amount ?? "") : ""}
                        placeholder="0.00"
                        onChange={(event) =>
                          updateAmount(bill, event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={styles.selectedPaymentBill}
          style={{ marginTop: "14px" }}
        >
          <div className={styles.selectedPaymentBillHeader}>
            <span>
              {paymentAllocations.length} bill
              {paymentAllocations.length === 1 ? "" : "s"} selected
            </span>

            <strong>TOTAL PAYMENT: AED {formatMoney(totalPayment)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
