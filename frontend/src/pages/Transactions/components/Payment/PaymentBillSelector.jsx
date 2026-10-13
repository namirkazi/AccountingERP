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
  availableSupplierAdvance = 0,
}) {
  // =====================================================
  // HELPERS
  // =====================================================

  function getAllocation(billId) {
    return paymentAllocations.find(
      (allocation) => String(allocation.expense_id) === String(billId),
    );
  }

  function isSelected(billId) {
    return Boolean(getAllocation(billId));
  }

  /*
   * =====================================================
   * SELECT BILL
   * =====================================================
   *
   * By default:
   *
   * Total settlement = full outstanding
   * Advance used     = 0
   * Cash / Bank      = full outstanding
   *
   * Example:
   *
   * Outstanding      2,000
   * Advance          0
   * Cash / Bank      2,000
   */

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

          /*
           * Total amount being settled
           * against this Expense.
           */

          amount: outstanding.toFixed(2),

          /*
           * Existing supplier advance
           * being consumed.
           */

          advance_amount: "0.00",

          /*
           * Actual new Cash/Bank payment.
           */

          cash_amount: outstanding.toFixed(2),

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

  // =====================================================
  // REMOVE BILL
  // =====================================================

  function removeBill(billId) {
    setPaymentAllocations((current) =>
      current.filter(
        (allocation) => String(allocation.expense_id) !== String(billId),
      ),
    );
  }

  // =====================================================
  // TOGGLE BILL
  // =====================================================

  function toggleBill(bill) {
    if (isSelected(bill.id)) {
      removeBill(bill.id);
      return;
    }

    selectBill(bill);
  }

  // =====================================================
  // UPDATE TOTAL SETTLEMENT
  // =====================================================

  function updateAmount(bill, value) {
    const outstanding = Number(bill.outstanding_amount) || 0;

    setPaymentAllocations((current) =>
      current.map((allocation) => {
        if (String(allocation.expense_id) !== String(bill.id)) {
          return allocation;
        }

        // Allow clearing the field while typing.
        if (value === "") {
          return {
            ...allocation,
            amount: "",
            advance_amount: "0.00",
            cash_amount: "",
          };
        }

        let settlement = Number(value);

        if (!Number.isFinite(settlement)) {
          return allocation;
        }

        settlement = Math.max(0, Math.min(settlement, outstanding));

        const advance = Math.min(
          Number(allocation.advance_amount) || 0,
          settlement,
        );

        const cash = Math.max(0, Number((settlement - advance).toFixed(2)));

        return {
          ...allocation,
          amount: Number(value) === settlement ? value : settlement.toFixed(2),
          advance_amount: advance.toFixed(2),
          cash_amount: cash.toFixed(2),
        };
      }),
    );
  }

  // =====================================================
  // UPDATE ADVANCE PORTION
  // =====================================================

  function updateAdvanceAmount(bill, value) {
    setPaymentAllocations((current) =>
      current.map((allocation) => {
        if (String(allocation.expense_id) !== String(bill.id)) {
          return allocation;
        }

        const settlement = Number(allocation.amount) || 0;

        const usedByOtherBills = current.reduce((sum, item) => {
          if (String(item.expense_id) === String(bill.id)) {
            return sum;
          }

          return sum + (Number(item.advance_amount) || 0);
        }, 0);

        const remainingAdvance = Math.max(
          0,
          Number(availableSupplierAdvance || 0) - usedByOtherBills,
        );

        /*
         * IMPORTANT:
         * Preserve what the user is typing.
         *
         * This allows:
         * ""
         * "5"
         * "50"
         * "500"
         *
         * without React constantly turning it
         * into 5.00 / 50.00 while typing.
         */

        if (value === "") {
          return {
            ...allocation,
            advance_amount: "",
            cash_amount: settlement.toFixed(2),
          };
        }

        let advance = Number(value);

        if (!Number.isFinite(advance)) {
          advance = 0;
        }

        advance = Math.max(0, advance);

        advance = Math.min(advance, settlement, remainingAdvance);

        const cash = Math.max(0, settlement - advance);

        return {
          ...allocation,

          /*
           * Keep raw typed value unless
           * we had to cap it.
           */
          advance_amount: Number(value) === advance ? value : String(advance),

          cash_amount: cash.toFixed(2),
        };
      }),
    );
  }

  // =====================================================
  // UPDATE CASH/BANK PORTION
  // =====================================================

  function updateCashAmount(bill, value) {
    setPaymentAllocations((current) =>
      current.map((allocation) => {
        if (String(allocation.expense_id) !== String(bill.id)) {
          return allocation;
        }

        const settlement = Number(allocation.amount) || 0;

        let cash = value === "" ? 0 : Math.max(0, Number(value) || 0);

        if (cash > settlement) {
          cash = settlement;
        }

        /*
         * Cash + Advance must always equal
         * the settlement amount.
         */

        const advance = Math.max(0, settlement - cash);

        return {
          ...allocation,

          cash_amount: value === "" ? "" : cash.toFixed(2),

          advance_amount: advance.toFixed(2),
        };
      }),
    );
  }

  // =====================================================
  // SELECT ALL
  // =====================================================

  function selectAll() {
    const nextAllocations = paymentBills
      .filter((bill) => Number(bill.outstanding_amount) > 0)
      .map((bill) => {
        const outstanding = Number(bill.outstanding_amount) || 0;

        return {
          expense_id: Number(bill.id),

          amount: outstanding.toFixed(2),

          advance_amount: "0.00",

          cash_amount: outstanding.toFixed(2),

          reference_number: bill.reference_number || "",

          bill_reference: bill.bill_reference || "",

          bill_amount: Number(bill.amount) || 0,

          paid_amount: Number(bill.paid_amount) || 0,

          outstanding_amount: outstanding,

          party_name: bill.party_name || party?.party_name || "",

          items: Array.isArray(bill.items) ? bill.items : [],

          items_summary: bill.items_summary || "",
        };
      });

    setPaymentAllocations(nextAllocations);
  }

  // =====================================================
  // CLEAR ALL
  // =====================================================

  function clearAll() {
    setPaymentAllocations([]);
  }

  // =====================================================
  // TOTALS
  // =====================================================

  const totalSettlement = paymentAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.amount) || 0),
    0,
  );
  const totalAdvance = paymentAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.advance_amount) || 0),
    0,
  );
  const remainingSupplierAdvance = Math.max(
    0,
    Number(availableSupplierAdvance || 0) - totalAdvance,
  );

  const totalCash = paymentAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.cash_amount) || 0),
    0,
  );

  // =====================================================
  // NO SUPPLIER
  // =====================================================

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

  // =====================================================
  // NO BILLS
  // =====================================================

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

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className={styles.paymentSelection}>
      <div className={styles.field}>
        <label>Outstanding Bills</label>
        <div
          style={{
            marginTop: "8px",
            marginBottom: "12px",
            padding: "12px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#f9fafb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
            Available Supplier Advance
          </span>

          <strong>AED {formatMoney(availableSupplierAdvance)}</strong>
        </div>
        {/* SELECT / CLEAR */}

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

        {/* BILLS */}

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

            const settlement = Number(allocation?.amount) || 0;

            const advanceUsed = Number(allocation?.advance_amount) || 0;

            const cashUsed = Number(allocation?.cash_amount) || 0;

            return (
              <div key={bill.id} className={styles.selectedPaymentBill}>
                {/* HEADER */}

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

                {/* BILL INFORMATION */}

                <div className={styles.selectedPaymentBillAmounts}>
                  <div>
                    <span>Bill Total</span>

                    <strong>AED {formatMoney(bill.amount)}</strong>
                  </div>

                  <div>
                    <span>Already Settled</span>

                    <strong>AED {formatMoney(bill.paid_amount)}</strong>
                  </div>

                  <div>
                    <span>Outstanding</span>

                    <strong>AED {formatMoney(outstanding)}</strong>
                  </div>
                </div>

                {/* SETTLEMENT SPLIT */}

                {selected && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "12px",
                      }}
                    >
                      {/* TOTAL SETTLEMENT */}

                      <div className={styles.field}>
                        <label>Settlement</label>

                        <div className={styles.amountField}>
                          <span>AED</span>

                          <input
                            type="number"
                            min="0.01"
                            max={outstanding}
                            step="0.01"
                            value={allocation?.amount ?? ""}
                            placeholder="Enter settlement amount"
                            onChange={(event) =>
                              updateAmount(bill, event.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* ADVANCE */}

                      <div className={styles.field}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <label>Use Advance</label>

                          {availableSupplierAdvance > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const usedByOtherBills =
                                  paymentAllocations.reduce((sum, item) => {
                                    if (
                                      String(item.expense_id) ===
                                      String(bill.id)
                                    ) {
                                      return sum;
                                    }

                                    return (
                                      sum + (Number(item.advance_amount) || 0)
                                    );
                                  }, 0);

                                const remainingAdvance = Math.max(
                                  0,
                                  Number(availableSupplierAdvance) -
                                    usedByOtherBills,
                                );

                                const maxAdvance = Math.min(
                                  settlement,
                                  remainingAdvance,
                                );

                                updateAdvanceAmount(bill, String(maxAdvance));
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              Use Max
                            </button>
                          )}
                        </div>

                        <div className={styles.amountField}>
                          <span>AED</span>

                          <input
                            type="number"
                            min="0"
                            max={settlement}
                            step="0.01"
                            value={allocation?.advance_amount ?? ""}
                            placeholder="0.00"
                            onChange={(event) =>
                              updateAdvanceAmount(bill, event.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* CASH / BANK */}

                      <div className={styles.field}>
                        <label>Cash / Bank</label>

                        <div className={styles.amountField}>
                          <span>AED</span>

                          <input
                            type="text"
                            readOnly
                            value={formatMoney(cashUsed)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SPLIT CHECK */}

                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "12px",
                        color:
                          Math.abs(advanceUsed + cashUsed - settlement) <= 0.001
                            ? "#6b7280"
                            : "#dc2626",
                      }}
                    >
                      AED {formatMoney(advanceUsed)} advance + AED{" "}
                      {formatMoney(cashUsed)} Cash/Bank = AED{" "}
                      {formatMoney(settlement)} settlement
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* =================================
            TOTAL SUMMARY
        ================================= */}

        <div
          className={styles.selectedPaymentBill}
          style={{
            marginTop: "14px",
          }}
        >
          <div className={styles.selectedPaymentBillHeader}>
            <span>
              {paymentAllocations.length} bill
              {paymentAllocations.length === 1 ? "" : "s"} selected
            </span>

            <strong>
              TOTAL SETTLEMENT: AED {formatMoney(totalSettlement)}
            </strong>
          </div>

          {paymentAllocations.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "12px",
                marginTop: "12px",
              }}
            >
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  From Supplier Advance
                </span>

                <strong>AED {formatMoney(totalAdvance)}</strong>
              </div>
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Advance Remaining
                </span>

                <strong>AED {formatMoney(remainingSupplierAdvance)}</strong>
              </div>
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  From Cash / Bank
                </span>

                <strong>AED {formatMoney(totalCash)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
