<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


try {

    $companyId = getCurrentCompanyId();
    $userId = getCurrentUserId();


    $data = json_decode(
        file_get_contents('php://input'),
        true
    );


    if (!is_array($data)) {

        throw new Exception(
            'Invalid request data.'
        );
    }


    // =====================================================
    // REQUEST DATA
    // =====================================================

    $paymentType =
        strtolower(
            trim(
                (string) (
                    $data['payment_type']
                    ?? 'bill'
                )
            )
        );


    $paymentAccountId =
        (int) (
            $data['payment_account_id']
            ?? 0
        );


    /*
     * Used directly for Advance Payments.
     *
     * Bill Payments determine supplier from
     * the selected Expense bills.
     */

    $partyId =
        (int) (
            $data['party_id']
            ?? 0
        );


    /*
     * Used only when creating a new
     * Advance Payment.
     */

    $advancePaymentAmount =
        round(
            (float) (
                $data['amount']
                ?? 0
            ),
            2
        );


    $date =
        trim(
            (string) (
                $data['date']
                ?? ''
            )
        );


    $narration =
        trim(
            (string) (
                $data['narration']
                ?? ''
            )
        );


    $allocations =
        $data['allocations']
        ?? [];


    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (
        !in_array(
            $paymentType,
            [
                'bill',
                'advance'
            ],
            true
        )
    ) {

        throw new Exception(
            'Invalid payment type.'
        );
    }


    if ($date === '') {

        throw new Exception(
            'Payment date is required.'
        );
    }


    /*
     * =====================================================
     * ADVANCE PAYMENT
     * =====================================================
     *
     * Example:
     *
     * Supplier advance = AED 1,000
     *
     * Dr Supplier Advances   1,000
     * Cr Cash / Bank         1,000
     *
     * No Expense bill exists yet.
     */

    if ($paymentType === 'advance') {

        if ($partyId <= 0) {

            throw new Exception(
                'Please select a supplier.'
            );
        }


        if ($advancePaymentAmount <= 0) {

            throw new Exception(
                'Advance amount must be greater than zero.'
            );
        }


        if ($paymentAccountId <= 0) {

            throw new Exception(
                'Please select Cash or Bank.'
            );
        }


        /*
         * Advance Payments are not allocated
         * against an Expense bill.
         */

        $allocations = [];
    }


    /*
     * =====================================================
     * BILL PAYMENT
     * =====================================================
     */

    if ($paymentType === 'bill') {

        if (
            !is_array($allocations) ||
            count($allocations) === 0
        ) {

            throw new Exception(
                'Please select at least one bill to pay.'
            );
        }
    }


    // =====================================================
    // NORMALIZE BILL ALLOCATIONS
    // =====================================================
    //
    // amount
    //     = total being settled against the Expense
    //
    // advance_amount
    //     = amount coming from Supplier Advances
    //
    // cash_amount
    //     = amount leaving Cash / Bank now
    //
    // Rule:
    //
    // advance_amount + cash_amount = amount
    //
    // Example:
    //
    // Bill                  2,000
    // Supplier Advance      1,000
    // Bank                  1,000
    //
    // amount                2,000
    // advance_amount        1,000
    // cash_amount           1,000
    // =====================================================

    $normalizedAllocations = [];


    if ($paymentType === 'bill') {

        foreach (
            $allocations
            as $allocation
        ) {

            if (!is_array($allocation)) {

                throw new Exception(
                    'Invalid payment allocation.'
                );
            }


            $expenseId =
                (int) (
                    $allocation['expense_id']
                    ?? 0
                );


            $allocationAmount =
                round(
                    (float) (
                        $allocation['amount']
                        ?? 0
                    ),
                    2
                );


            $advanceAmount =
                round(
                    (float) (
                        $allocation['advance_amount']
                        ?? 0
                    ),
                    2
                );


            /*
             * Backward compatibility:
             *
             * Old frontend only sends:
             *
             * amount: 500
             *
             * Treat that as:
             *
             * advance_amount: 0
             * cash_amount: 500
             */

            $cashAmount =
                round(
                    (float) (
                        $allocation['cash_amount']
                        ?? $allocationAmount
                    ),
                    2
                );


            if ($expenseId <= 0) {

                throw new Exception(
                    'Invalid expense selected.'
                );
            }


            if ($allocationAmount <= 0) {

                throw new Exception(
                    'Each payment allocation must be greater than zero.'
                );
            }


            if (
                $advanceAmount < 0 ||
                $cashAmount < 0
            ) {

                throw new Exception(
                    'Advance and Cash/Bank amounts cannot be negative.'
                );
            }


            if (
                abs(
                    (
                        $advanceAmount
                        + $cashAmount
                    )
                        - $allocationAmount
                ) > 0.001
            ) {

                throw new Exception(
                    'Advance amount plus Cash/Bank amount must equal the bill settlement amount.'
                );
            }


            if (
                !isset(
                    $normalizedAllocations[$expenseId]
                )
            ) {

                $normalizedAllocations[$expenseId] = [

                    'expense_id' =>
                    $expenseId,

                    'amount' =>
                    0,

                    'advance_amount' =>
                    0,

                    'cash_amount' =>
                    0

                ];
            }


            $normalizedAllocations[$expenseId]['amount'] =
                round(
                    $normalizedAllocations[$expenseId]['amount']
                        + $allocationAmount,
                    2
                );


            $normalizedAllocations[$expenseId]['advance_amount'] =
                round(
                    $normalizedAllocations[$expenseId]['advance_amount']
                        + $advanceAmount,
                    2
                );


            $normalizedAllocations[$expenseId]['cash_amount'] =
                round(
                    $normalizedAllocations[$expenseId]['cash_amount']
                        + $cashAmount,
                    2
                );
        }


        $allocations =
            array_values(
                $normalizedAllocations
            );
    }


    // =====================================================
    // START DATABASE TRANSACTION
    // =====================================================

    $pdo->beginTransaction();


    // =====================================================
    // FIND SUPPLIER ADVANCES ACCOUNT
    // =====================================================

    $supplierAdvanceAccountId = 0;


    $supplierAdvanceStmt =
        $pdo->prepare("
            SELECT id

            FROM accounts

            WHERE company_id =
                :company_id

            AND account_subtype =
                'supplier_advance'

            LIMIT 1
        ");


    $supplierAdvanceStmt->execute([

        ':company_id' =>
        $companyId

    ]);


    $supplierAdvanceAccountId =
        (int) (
            $supplierAdvanceStmt
            ->fetchColumn()
            ?: 0
        );


    // =====================================================
    // DETERMINE WHETHER CASH / BANK IS REQUIRED
    // =====================================================

    $requiresPaymentAccount =
        $paymentType === 'advance';


    if ($paymentType === 'bill') {

        foreach (
            $allocations
            as $allocation
        ) {

            $allocationCashAmount =
                round(
                    (float) (
                        $allocation['cash_amount']
                        ?? 0
                    ),
                    2
                );


            if ($allocationCashAmount > 0) {

                $requiresPaymentAccount =
                    true;

                break;
            }
        }
    }


    // =====================================================
    // VERIFY CASH / BANK ACCOUNT
    // =====================================================

    $paymentAccount = null;


    if ($requiresPaymentAccount) {

        if ($paymentAccountId <= 0) {

            throw new Exception(
                'Please select Cash or Bank.'
            );
        }


        $accountStmt =
            $pdo->prepare("
                SELECT
                    id,
                    account_name,
                    account_subtype

                FROM accounts

                WHERE id =
                    :id

                AND company_id =
                    :company_id

                AND account_subtype IN (
                    'cash',
                    'bank'
                )

                LIMIT 1
            ");


        $accountStmt->execute([

            ':id' =>
            $paymentAccountId,

            ':company_id' =>
            $companyId

        ]);


        $paymentAccount =
            $accountStmt->fetch();


        if (!$paymentAccount) {

            throw new Exception(
                'Invalid Cash/Bank account.'
            );
        }
    }


    // =====================================================
    // PREPARE EXPENSE LOOKUP
    // =====================================================

    $expenseStmt =
        $pdo->prepare("
            SELECT
                id,
                party_id,
                amount,
                narration,
                reference_number,
                bill_reference

            FROM vouchers

            WHERE id =
                :id

            AND company_id =
                :company_id

            AND voucher_type =
                'EXPENSE'

            LIMIT 1

            FOR UPDATE
        ");


    // =====================================================
    // LEGACY PAYMENT TOTAL
    // =====================================================
    //
    // Count source_voucher_id Payments only if they
    // do not have allocation rows.
    //
    // This prevents old single-bill Payments from
    // being counted twice.
    // =====================================================

    $legacyPaidStmt =
        $pdo->prepare("
            SELECT
                COALESCE(
                    SUM(pay.amount),
                    0
                )

            FROM vouchers pay

            WHERE pay.company_id =
                :company_id

            AND pay.voucher_type =
                'PAYMENT'

            AND pay.source_voucher_id =
                :expense_id

            AND NOT EXISTS (

                SELECT 1

                FROM payment_allocations pa_check

                WHERE pa_check.company_id =
                    :company_id_check

                AND pa_check.payment_voucher_id =
                    pay.id
            )
        ");


    // =====================================================
    // ALLOCATION-BASED PAYMENT TOTAL
    // =====================================================

    $allocationPaidStmt =
        $pdo->prepare("
            SELECT
                COALESCE(
                    SUM(pa.amount),
                    0
                )

            FROM payment_allocations pa

            WHERE pa.company_id =
                :company_id

            AND pa.expense_voucher_id =
                :expense_id
        ");


    // =====================================================
    // VALIDATE BILL ALLOCATIONS
    // =====================================================

    $validatedAllocations = [];


    $supplierPartyId =
        $paymentType === 'advance'
        ? $partyId
        : null;


    $totalPayment = 0;

    $totalAdvanceUsed = 0;

    $totalCashPayment = 0;


    if ($paymentType === 'bill') {

        foreach (
            $allocations
            as $allocation
        ) {

            $expenseId =
                (int) (
                    $allocation['expense_id']
                    ?? 0
                );


            $allocationAmount =
                round(
                    (float) (
                        $allocation['amount']
                        ?? 0
                    ),
                    2
                );


            $advanceAmount =
                round(
                    (float) (
                        $allocation['advance_amount']
                        ?? 0
                    ),
                    2
                );


            $cashAmount =
                round(
                    (float) (
                        $allocation['cash_amount']
                        ?? 0
                    ),
                    2
                );


            // ---------------------------------------------
            // LOAD EXPENSE
            // ---------------------------------------------

            $expenseStmt->execute([

                ':id' =>
                $expenseId,

                ':company_id' =>
                $companyId

            ]);


            $expense =
                $expenseStmt->fetch();


            if (!$expense) {

                throw new Exception(
                    'Expense voucher #'
                        . $expenseId
                        . ' was not found.'
                );
            }


            $expensePartyId =
                (int) (
                    $expense['party_id']
                    ?? 0
                );


            if ($expensePartyId <= 0) {

                throw new Exception(
                    'Expense '
                        . (
                            $expense['reference_number']
                            ?: '#'
                            . $expenseId
                        )
                        . ' does not have a supplier.'
                );
            }


            // ---------------------------------------------
            // ALL BILLS MUST BELONG TO SAME SUPPLIER
            // ---------------------------------------------

            if ($supplierPartyId === null) {

                $supplierPartyId =
                    $expensePartyId;
            } elseif (
                $supplierPartyId
                !== $expensePartyId
            ) {

                throw new Exception(
                    'All selected bills must belong to the same supplier.'
                );
            }


            // ---------------------------------------------
            // LEGACY PAYMENTS
            // ---------------------------------------------

            $legacyPaidStmt->execute([

                ':company_id' =>
                $companyId,

                ':expense_id' =>
                $expenseId,

                ':company_id_check' =>
                $companyId

            ]);


            $legacyPaidAmount =
                round(
                    (float)
                    $legacyPaidStmt
                        ->fetchColumn(),
                    2
                );


            // ---------------------------------------------
            // ALLOCATION PAYMENTS
            // ---------------------------------------------

            $allocationPaidStmt->execute([

                ':company_id' =>
                $companyId,

                ':expense_id' =>
                $expenseId

            ]);


            $allocationPaidAmount =
                round(
                    (float)
                    $allocationPaidStmt
                        ->fetchColumn(),
                    2
                );


            $paidAmount =
                round(
                    $legacyPaidAmount
                        + $allocationPaidAmount,
                    2
                );


            $originalAmount =
                round(
                    (float) (
                        $expense['amount']
                        ?? 0
                    ),
                    2
                );


            $outstanding =
                round(
                    $originalAmount
                        - $paidAmount,
                    2
                );


            if ($outstanding <= 0) {

                throw new Exception(
                    'Expense '
                        . (
                            $expense['reference_number']
                            ?: '#'
                            . $expenseId
                        )
                        . ' has already been fully paid.'
                );
            }


            if (
                $allocationAmount
                >
                $outstanding
                + 0.0001
            ) {

                throw new Exception(
                    'Payment for '
                        . (
                            $expense['reference_number']
                            ?: '#'
                            . $expenseId
                        )
                        . ' exceeds its outstanding amount. '
                        . 'Outstanding: AED '
                        . number_format(
                            $outstanding,
                            2
                        )
                );
            }


            $remaining =
                round(
                    $outstanding
                        - $allocationAmount,
                    2
                );


            $validatedAllocations[] = [

                'expense_id' =>
                $expenseId,

                'reference_number' =>
                $expense['reference_number'],

                'bill_reference' =>
                $expense['bill_reference'],

                'original_amount' =>
                $originalAmount,

                'previously_paid' =>
                $paidAmount,

                'outstanding_before' =>
                $outstanding,

                'amount' =>
                $allocationAmount,

                'advance_amount' =>
                $advanceAmount,

                'cash_amount' =>
                $cashAmount,

                'outstanding_after' =>
                max(
                    0,
                    $remaining
                ),

                'status' =>
                $remaining <= 0.0001
                    ? 'PAID'
                    : 'PARTIALLY_PAID'

            ];


            $totalPayment =
                round(
                    $totalPayment
                        + $allocationAmount,
                    2
                );


            $totalAdvanceUsed =
                round(
                    $totalAdvanceUsed
                        + $advanceAmount,
                    2
                );


            $totalCashPayment =
                round(
                    $totalCashPayment
                        + $cashAmount,
                    2
                );
        }
    }


    // =====================================================
    // ADVANCE PAYMENT TOTALS
    // =====================================================

    if ($paymentType === 'advance') {

        $totalPayment =
            $advancePaymentAmount;

        $totalAdvanceUsed =
            0;

        $totalCashPayment =
            $advancePaymentAmount;
    }


    // =====================================================
    // VALIDATE SUPPLIER
    // =====================================================

    if (
        $supplierPartyId === null ||
        $supplierPartyId <= 0
    ) {

        throw new Exception(
            'Unable to determine supplier.'
        );
    }


    if ($totalPayment <= 0) {

        throw new Exception(
            'Payment amount must be greater than zero.'
        );
    }


    // =====================================================
    // VALIDATE AVAILABLE SUPPLIER ADVANCE
    // =====================================================

    if (
        $paymentType === 'bill' &&
        $totalAdvanceUsed > 0
    ) {

        if ($supplierAdvanceAccountId <= 0) {

            throw new Exception(
                'This supplier does not have an available advance.'
            );
        }


        /*
         * Available Supplier Advance:
         *
         * Debit increases the advance asset.
         * Credit consumes the advance asset.
         */

        $availableAdvanceStmt =
            $pdo->prepare("
                SELECT
                    COALESCE(
                        SUM(
                            debit
                            - credit
                        ),
                        0
                    )

                FROM ledger_entries

                WHERE company_id =
                    :company_id

                AND account_id =
                    :account_id

                AND party_id =
                    :party_id
            ");


        $availableAdvanceStmt->execute([

            ':company_id' =>
            $companyId,

            ':account_id' =>
            $supplierAdvanceAccountId,

            ':party_id' =>
            $supplierPartyId

        ]);


        $availableAdvance =
            round(
                (float)
                $availableAdvanceStmt
                    ->fetchColumn(),
                2
            );


        if (
            $totalAdvanceUsed
            >
            $availableAdvance
            + 0.001
        ) {

            throw new Exception(
                'Advance used exceeds available supplier advance. Available: AED '
                    . number_format(
                        $availableAdvance,
                        2
                    )
            );
        }
    }


    // =====================================================
    // CREATE SUPPLIER ADVANCES ACCOUNT IF REQUIRED
    // =====================================================

    if (
        $paymentType === 'advance' &&
        $supplierAdvanceAccountId <= 0
    ) {

        $createAdvanceAccountStmt =
            $pdo->prepare("
                INSERT INTO accounts (
                    company_id,
                    account_name,
                    account_type,
                    account_subtype
                )

                VALUES (
                    :company_id,
                    'Supplier Advances',
                    'asset',
                    'supplier_advance'
                )
            ");


        $createAdvanceAccountStmt->execute([

            ':company_id' =>
            $companyId

        ]);


        $supplierAdvanceAccountId =
            (int)
            $pdo->lastInsertId();


        if ($supplierAdvanceAccountId <= 0) {

            throw new Exception(
                'Unable to create Supplier Advances account.'
            );
        }
    }

    // =====================================================
    // SUPPLIER ADVANCE BALANCE SNAPSHOT
    // =====================================================

    $supplierAdvanceBefore = 0.00;

    if ($supplierAdvanceAccountId > 0) {
        $advanceBalanceStmt = $pdo->prepare("
        SELECT COALESCE(SUM(debit - credit), 0)
        FROM ledger_entries
        WHERE company_id = :company_id
          AND account_id = :account_id
          AND party_id = :party_id
    ");

        $advanceBalanceStmt->execute([
            ':company_id' => $companyId,
            ':account_id' => $supplierAdvanceAccountId,
            ':party_id' => $supplierPartyId,
        ]);

        $supplierAdvanceBefore = round(
            (float) $advanceBalanceStmt->fetchColumn(),
            2
        );
    }

    $supplierAdvanceAfter = round(
        $supplierAdvanceBefore +
            (
                $paymentType === 'advance'
                ? $totalPayment
                : -$totalAdvanceUsed
            ),
        2
    );
    // =====================================================
    // PAYMENT NUMBER
    // =====================================================

    $paymentTimestamp =
        strtotime(
            $date
        );


    if ($paymentTimestamp === false) {

        throw new Exception(
            'Invalid payment date.'
        );
    }


    $paymentYear =
        (int)
        date(
            'Y',
            $paymentTimestamp
        );


    $lockName =
        'accounting_payment_'
        . $companyId;


    $lockStmt =
        $pdo->prepare(
            "SELECT GET_LOCK(:lock_name, 10)"
        );


    $lockStmt->execute([

        ':lock_name' =>
        $lockName

    ]);


    if (
        (int)
        $lockStmt->fetchColumn()
        !== 1
    ) {

        throw new Exception(
            'Unable to lock Payment numbering. Please try again.'
        );
    }


    $sequenceStmt =
        $pdo->prepare("
            SELECT
                reference_number

            FROM vouchers

            WHERE company_id =
                :company_id

            AND voucher_type =
                'PAYMENT'

            AND voucher_date >=
                :year_start

            AND voucher_date <
                :next_year_start

            AND reference_number LIKE
                :pattern

            ORDER BY id DESC
        ");


    $sequenceStmt->execute([

        ':company_id' =>
        $companyId,

        ':year_start' =>
        $paymentYear
            . '-01-01',

        ':next_year_start' => ($paymentYear + 1)
            . '-01-01',

        ':pattern' =>
        'PAYMENT/'
            . $paymentYear
            . '/%'

    ]);


    $highestSequence = 0;


    while (
        $row =
        $sequenceStmt->fetch()
    ) {

        $number =
            trim(
                (string) (
                    $row['reference_number']
                    ?? ''
                )
            );


        if (
            preg_match(
                '#^PAYMENT/'
                    . $paymentYear
                    . '/([0-9]+)$#',
                $number,
                $matches
            )
        ) {

            $highestSequence =
                max(
                    $highestSequence,
                    (int)
                    $matches[1]
                );
        }
    }


    $paymentReferenceNumber =
        'PAYMENT/'
        . $paymentYear
        . '/'
        . str_pad(
            (string) (
                $highestSequence
                + 1
            ),
            5,
            '0',
            STR_PAD_LEFT
        );


    // =====================================================
    // SOURCE VOUCHER / BILL REFERENCE
    // =====================================================
    //
    // Keep source_voucher_id for a one-bill Payment
    // for compatibility with existing code.
    //
    // Advance Payments have no Expense source.
    // =====================================================

    $sourceVoucherId =
        (
            $paymentType === 'bill' &&
            count(
                $validatedAllocations
            ) === 1
        )
        ? $validatedAllocations[0]['expense_id']
        : null;


    $paymentBillReference =
        (
            $paymentType === 'bill' &&
            count(
                $validatedAllocations
            ) === 1
        )
        ? (
            $validatedAllocations[0]['bill_reference']
            ?: null
        )
        : null;


    // =====================================================
    // CREATE PAYMENT VOUCHER
    // =====================================================

    $voucherStmt =
        $pdo->prepare("
            INSERT INTO vouchers (
                company_id,
                voucher_type,
                payment_type,
                voucher_date,
                reference_number,
                bill_reference,
                party_id,
                amount,
                narration,
                source_voucher_id,
                created_by
            )

            VALUES (
                :company_id,
                'PAYMENT',
                :payment_type,
                :voucher_date,
                :reference_number,
                :bill_reference,
                :party_id,
                :amount,
                :narration,
                :source_voucher_id,
                :created_by
            )
        ");


    $voucherStmt->execute([

        ':company_id' =>
        $companyId,

        ':payment_type' =>
        $paymentType,

        ':voucher_date' =>
        $date,

        ':reference_number' =>
        $paymentReferenceNumber,

        ':bill_reference' =>
        $paymentBillReference,

        ':party_id' =>
        $supplierPartyId,

        ':amount' =>
        $totalPayment,

        /*
         * Keep narration blank when user
         * leaves it blank.
         */

        ':narration' =>
        $narration !== ''
            ? $narration
            : null,

        ':source_voucher_id' =>
        $sourceVoucherId,

        ':created_by' =>
        $userId

    ]);


    $paymentVoucherId =
        (int)
        $pdo->lastInsertId();


    if ($paymentVoucherId <= 0) {

        throw new Exception(
            'Unable to create Payment voucher.'
        );
    }


    // =====================================================
    // SAVE PAYMENT ALLOCATIONS
    // =====================================================
    //
    // Advance Payments do NOT create allocation rows.
    //
    // Bill Payments store:
    //
    // amount
    // advance_amount
    // cash_amount
    // =====================================================

    if ($paymentType === 'bill') {

        $allocationInsertStmt =
            $pdo->prepare("
                INSERT INTO payment_allocations (
                    company_id,
                    payment_voucher_id,
                    expense_voucher_id,
                    amount,
                    advance_amount,
                    cash_amount
                )

                VALUES (
                    :company_id,
                    :payment_voucher_id,
                    :expense_voucher_id,
                    :amount,
                    :advance_amount,
                    :cash_amount
                )
            ");


        foreach (
            $validatedAllocations
            as $allocation
        ) {

            $allocationInsertStmt->execute([

                ':company_id' =>
                $companyId,

                ':payment_voucher_id' =>
                $paymentVoucherId,

                ':expense_voucher_id' =>
                $allocation['expense_id'],

                ':amount' =>
                $allocation['amount'],

                ':advance_amount' =>
                $allocation['advance_amount'],

                ':cash_amount' =>
                $allocation['cash_amount']

            ]);
        }
    }


    // =====================================================
    // PAYABLE ACCOUNT
    // =====================================================
    //
    // Advance Payments do not touch Payable.
    //
    // Only bill settlements require this account.
    // =====================================================

    $payable = null;


    if ($paymentType === 'bill') {

        $payableStmt =
            $pdo->prepare("
                SELECT id

                FROM accounts

                WHERE company_id =
                    :company_id

                AND account_subtype =
                    'payable'

                LIMIT 1
            ");


        $payableStmt->execute([

            ':company_id' =>
            $companyId

        ]);


        $payable =
            $payableStmt->fetch();


        if (!$payable) {

            throw new Exception(
                'Payable account is missing.'
            );
        }
    }


    // =====================================================
    // LEDGER INSERT
    // =====================================================

    $ledgerStmt =
        $pdo->prepare("
            INSERT INTO ledger_entries (
                company_id,
                voucher_id,
                account_id,
                party_id,
                debit,
                credit
            )

            VALUES (
                :company_id,
                :voucher_id,
                :account_id,
                :party_id,
                :debit,
                :credit
            )
        ");


    // =====================================================
    // ADVANCE PAYMENT
    // =====================================================
    //
    // Example:
    //
    // Pay supplier AED 1,000 in advance.
    //
    // Dr Supplier Advances   1,000
    // Cr Bank                1,000
    // =====================================================

    if ($paymentType === 'advance') {

        $ledgerStmt->execute([

            ':company_id' =>
            $companyId,

            ':voucher_id' =>
            $paymentVoucherId,

            ':account_id' =>
            $supplierAdvanceAccountId,

            ':party_id' =>
            $supplierPartyId,

            ':debit' =>
            $totalPayment,

            ':credit' =>
            0

        ]);


        $ledgerStmt->execute([

            ':company_id' =>
            $companyId,

            ':voucher_id' =>
            $paymentVoucherId,

            ':account_id' =>
            $paymentAccountId,

            ':party_id' =>
            null,

            ':debit' =>
            0,

            ':credit' =>
            $totalPayment

        ]);
    }


    // =====================================================
    // BILL SETTLEMENT
    // =====================================================
    //
    // Example:
    //
    // Expense bill           2,000
    //
    // Use advance            1,000
    // Pay from Bank          1,000
    //
    // Ledger:
    //
    // Dr Payable             2,000
    // Cr Supplier Advances   1,000
    // Cr Bank                1,000
    // =====================================================

    if ($paymentType === 'bill') {

        /*
         * Debit Payable for the FULL amount
         * being settled against the bills.
         */

        $ledgerStmt->execute([

            ':company_id' =>
            $companyId,

            ':voucher_id' =>
            $paymentVoucherId,

            ':account_id' =>
            $payable['id'],

            ':party_id' =>
            $supplierPartyId,

            ':debit' =>
            $totalPayment,

            ':credit' =>
            0

        ]);


        /*
         * Credit Supplier Advances for the
         * part of the bill being settled
         * from previously paid advances.
         */

        if ($totalAdvanceUsed > 0) {

            $ledgerStmt->execute([

                ':company_id' =>
                $companyId,

                ':voucher_id' =>
                $paymentVoucherId,

                ':account_id' =>
                $supplierAdvanceAccountId,

                ':party_id' =>
                $supplierPartyId,

                ':debit' =>
                0,

                ':credit' =>
                $totalAdvanceUsed

            ]);
        }


        /*
         * Credit Cash / Bank only for the
         * new money actually leaving now.
         */

        if ($totalCashPayment > 0) {

            if ($paymentAccountId <= 0) {

                throw new Exception(
                    'Please select Cash or Bank.'
                );
            }


            $ledgerStmt->execute([

                ':company_id' =>
                $companyId,

                ':voucher_id' =>
                $paymentVoucherId,

                ':account_id' =>
                $paymentAccountId,

                ':party_id' =>
                null,

                ':debit' =>
                0,

                ':credit' =>
                $totalCashPayment

            ]);
        }
    }


    // =====================================================
    // FINAL BALANCE CHECK
    // =====================================================

    $balanceStmt =
        $pdo->prepare("
            SELECT
                COALESCE(
                    SUM(debit),
                    0
                ) AS total_debit,

                COALESCE(
                    SUM(credit),
                    0
                ) AS total_credit

            FROM ledger_entries

            WHERE company_id =
                :company_id

            AND voucher_id =
                :voucher_id
        ");


    $balanceStmt->execute([

        ':company_id' =>
        $companyId,

        ':voucher_id' =>
        $paymentVoucherId

    ]);


    $ledgerBalance =
        $balanceStmt->fetch(
            PDO::FETCH_ASSOC
        );


    $totalDebit =
        round(
            (float) (
                $ledgerBalance['total_debit']
                ?? 0
            ),
            2
        );


    $totalCredit =
        round(
            (float) (
                $ledgerBalance['total_credit']
                ?? 0
            ),
            2
        );


    if (
        abs(
            $totalDebit
                - $totalCredit
        ) > 0.001
    ) {

        throw new Exception(
            'Payment ledger is not balanced.'
        );
    }


    // =====================================================
    // COMMIT
    // =====================================================

    $pdo->commit();


    // =====================================================
    // RESPONSE
    // =====================================================

    echo json_encode([

        'success' =>
        true,

        'message' =>
        $paymentType === 'advance'
            ? 'Advance payment created successfully.'
            : 'Payment created successfully.',

        'data' => [

            'payment_voucher_id' =>
            $paymentVoucherId,

            'reference_number' =>
            $paymentReferenceNumber,

            'payment_type' =>
            $paymentType,

            'party_id' =>
            $supplierPartyId,

            /*
             * Total value settled / paid.
             */

            'amount' =>
            $totalPayment,

            /*
             * Amount of an existing supplier
             * advance consumed by this Payment.
             *
             * For a new Advance Payment this is 0.
             */

            'advance_used' =>
            $totalAdvanceUsed,

            /*
             * Actual amount taken from Cash/Bank
             * during this Payment.
             */

            'cash_amount' =>
            $totalCashPayment,

            'payment_account_id' =>
            $paymentAccountId > 0
                ? $paymentAccountId
                : null,

            'allocation_count' =>
            count(
                $validatedAllocations
            ),
            'advance_balance_before' => $supplierAdvanceBefore,

            'advance_balance_after' => $supplierAdvanceAfter,

            'cash_paid_now' => $totalCashPayment,

            'allocations' =>
            $validatedAllocations

        ]

    ]);
} catch (Throwable $e) {

    if ($pdo->inTransaction()) {

        $pdo->rollBack();
    }


    error_log(
        'Create payment error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' =>
        false,

        'message' =>
        $e->getMessage()

    ]);
}
