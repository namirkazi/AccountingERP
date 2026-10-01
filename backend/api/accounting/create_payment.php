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
        throw new Exception('Invalid request data.');
    }


    // =====================================================
    // REQUEST DATA
    // =====================================================

    $paymentAccountId =
        (int) ($data['payment_account_id'] ?? 0);

    $date =
        trim($data['date'] ?? '');

    $narration =
        trim($data['narration'] ?? '');

    $allocations =
        $data['allocations'] ?? [];


    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if ($paymentAccountId <= 0) {
        throw new Exception(
            'Please select Cash or Bank.'
        );
    }

    if ($date === '') {
        throw new Exception(
            'Payment date is required.'
        );
    }

    if (
        !is_array($allocations) ||
        count($allocations) === 0
    ) {
        throw new Exception(
            'Please select at least one bill to pay.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | NORMALIZE ALLOCATIONS
    |--------------------------------------------------------------------------
    |
    | We combine duplicate expense IDs here so that one Expense can only
    | appear once in the final payment.
    |
    */

    $normalizedAllocations = [];

    foreach ($allocations as $allocation) {

        if (!is_array($allocation)) {
            throw new Exception(
                'Invalid payment allocation.'
            );
        }

        $expenseId =
            (int) ($allocation['expense_id'] ?? 0);

        $allocationAmount =
            round(
                (float) ($allocation['amount'] ?? 0),
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

        if (!isset($normalizedAllocations[$expenseId])) {

            $normalizedAllocations[$expenseId] = [
                'expense_id' => $expenseId,
                'amount' => 0
            ];
        }

        $normalizedAllocations[$expenseId]['amount'] =
            round(
                $normalizedAllocations[$expenseId]['amount']
                    + $allocationAmount,
                2
            );
    }

    $allocations =
        array_values($normalizedAllocations);


    // =====================================================
    // START TRANSACTION
    // =====================================================

    $pdo->beginTransaction();


    // =====================================================
    // VERIFY PAYMENT ACCOUNT
    // =====================================================

    $accountStmt = $pdo->prepare("
        SELECT
            id,
            account_name,
            account_subtype

        FROM accounts

        WHERE id = :id

        AND company_id = :company_id

        AND account_subtype IN (
            'cash',
            'bank'
        )

        LIMIT 1
    ");

    $accountStmt->execute([
        ':id' => $paymentAccountId,
        ':company_id' => $companyId
    ]);

    $paymentAccount =
        $accountStmt->fetch();

    if (!$paymentAccount) {
        throw new Exception(
            'Invalid Cash/Bank account.'
        );
    }


    // =====================================================
    // PREPARE EXPENSE LOOKUP
    // =====================================================

    /*
    | FOR UPDATE prevents another payment transaction from
    | settling the same Expense while this payment is being
    | validated and created.
    */

    $expenseStmt = $pdo->prepare("
        SELECT
            id,
            party_id,
            amount,
            narration,
            reference_number,
            bill_reference

        FROM vouchers

        WHERE id = :id

        AND company_id = :company_id

        AND voucher_type = 'EXPENSE'

        LIMIT 1

        FOR UPDATE
    ");


    /*
    |--------------------------------------------------------------------------
    | LEGACY PAYMENT TOTAL
    |--------------------------------------------------------------------------
    |
    | Count source_voucher_id payments only when the Payment voucher does
    | NOT have allocation rows.
    |
    | This prevents a new single-bill Payment from being counted twice.
    |
    */

    $legacyPaidStmt = $pdo->prepare("
        SELECT
            COALESCE(
                SUM(pay.amount),
                0
            ) AS paid_amount

        FROM vouchers pay

        WHERE pay.company_id = :company_id

        AND pay.voucher_type = 'PAYMENT'

        AND pay.source_voucher_id = :expense_id

        AND NOT EXISTS (
            SELECT 1

            FROM payment_allocations pa_check

            WHERE pa_check.company_id = :company_id_check

            AND pa_check.payment_voucher_id = pay.id
        )
    ");


    // =====================================================
    // ALLOCATION PAYMENT TOTAL
    // =====================================================

    $allocationPaidStmt = $pdo->prepare("
        SELECT
            COALESCE(
                SUM(pa.amount),
                0
            ) AS paid_amount

        FROM payment_allocations pa

        WHERE pa.company_id = :company_id

        AND pa.expense_voucher_id = :expense_id
    ");


    // =====================================================
    // VALIDATE EVERY EXPENSE
    // =====================================================

    $validatedAllocations = [];

    $supplierPartyId = null;

    $totalPayment = 0;

    $defaultNarration = '';

    foreach ($allocations as $allocation) {

        $expenseId =
            (int) $allocation['expense_id'];

        $allocationAmount =
            round(
                (float) $allocation['amount'],
                2
            );


        // ---------------------------------------------
        // Load Expense
        // ---------------------------------------------

        $expenseStmt->execute([
            ':id' => $expenseId,
            ':company_id' => $companyId
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
            (int) ($expense['party_id'] ?? 0);

        if ($expensePartyId <= 0) {
            throw new Exception(
                'Expense '
                    . (
                        $expense['reference_number']
                        ?: '#' . $expenseId
                    )
                    . ' does not have a supplier.'
            );
        }


        // ---------------------------------------------
        // All bills must belong to same supplier
        // ---------------------------------------------

        if ($supplierPartyId === null) {

            $supplierPartyId =
                $expensePartyId;

            $defaultNarration =
                trim(
                    (string) ($expense['narration'] ?? '')
                );
        } elseif (
            $supplierPartyId !== $expensePartyId
        ) {

            throw new Exception(
                'All selected bills must belong to the same supplier.'
            );
        }


        // ---------------------------------------------
        // Legacy payments
        // ---------------------------------------------

        $legacyPaidStmt->execute([
            ':company_id' => $companyId,
            ':expense_id' => $expenseId,
            ':company_id_check' => $companyId
        ]);

        $legacyPaidAmount =
            round(
                (float) $legacyPaidStmt->fetchColumn(),
                2
            );


        // ---------------------------------------------
        // Allocation-based payments
        // ---------------------------------------------

        $allocationPaidStmt->execute([
            ':company_id' => $companyId,
            ':expense_id' => $expenseId
        ]);

        $allocationPaidAmount =
            round(
                (float) $allocationPaidStmt->fetchColumn(),
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
                (float) $expense['amount'],
                2
            );

        $outstanding =
            round(
                $originalAmount - $paidAmount,
                2
            );


        if ($outstanding <= 0) {

            throw new Exception(
                'Expense '
                    . (
                        $expense['reference_number']
                        ?: '#' . $expenseId
                    )
                    . ' has already been fully paid.'
            );
        }


        if (
            $allocationAmount
            >
            $outstanding + 0.0001
        ) {

            throw new Exception(
                'Payment for '
                    . (
                        $expense['reference_number']
                        ?: '#' . $expenseId
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
                $outstanding - $allocationAmount,
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

            'outstanding_after' =>
            max(0, $remaining),

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
    }


    if ($supplierPartyId === null) {
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
    // PAYMENT NUMBER
    // =====================================================

    $paymentTimestamp =
        strtotime($date);

    if ($paymentTimestamp === false) {
        throw new Exception(
            'Invalid payment date.'
        );
    }

    $paymentYear =
        (int) date(
            'Y',
            $paymentTimestamp
        );


    $lockName =
        'accounting_payment_'
        . $companyId;


    $lockStmt = $pdo->prepare(
        "SELECT GET_LOCK(:lock_name, 10)"
    );

    $lockStmt->execute([
        ':lock_name' => $lockName
    ]);

    if (
        (int) $lockStmt->fetchColumn()
        !== 1
    ) {
        throw new Exception(
            'Unable to lock Payment numbering. Please try again.'
        );
    }


    $sequenceStmt = $pdo->prepare("
        SELECT reference_number

        FROM vouchers

        WHERE company_id = :company_id

        AND voucher_type = 'PAYMENT'

        AND voucher_date >= :year_start

        AND voucher_date < :next_year_start

        AND reference_number LIKE :pattern

        ORDER BY id DESC
    ");

    $sequenceStmt->execute([

        ':company_id' =>
        $companyId,

        ':year_start' =>
        $paymentYear . '-01-01',

        ':next_year_start' => ($paymentYear + 1) . '-01-01',

        ':pattern' =>
        'PAYMENT/' . $paymentYear . '/%'

    ]);


    $highestSequence = 0;

    while ($row = $sequenceStmt->fetch()) {

        $number =
            trim(
                (string) $row['reference_number']
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
                    (int) $matches[1]
                );
        }
    }


    $paymentReferenceNumber =
        'PAYMENT/'
        . $paymentYear
        . '/'
        . str_pad(
            (string) ($highestSequence + 1),
            5,
            '0',
            STR_PAD_LEFT
        );


    // =====================================================
    // SOURCE VOUCHER / BILL REFERENCE
    // =====================================================

    /*
    | Keep source_voucher_id for a one-bill Payment so older
    | code can still understand it.
    |
    | Multi-bill Payments have no single source voucher.
    */

    $sourceVoucherId =
        count($validatedAllocations) === 1
        ? $validatedAllocations[0]['expense_id']
        : null;


    $paymentBillReference =
        count($validatedAllocations) === 1
        ? (
            $validatedAllocations[0]['bill_reference']
            ?: null
        )
        : null;


    // =====================================================
    // CREATE PAYMENT VOUCHER
    // =====================================================

    $voucherStmt = $pdo->prepare("
        INSERT INTO vouchers (
            company_id,
            voucher_type,
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

        ':narration' =>
        $narration !== ''
            ? $narration
            : $defaultNarration,

        ':source_voucher_id' =>
        $sourceVoucherId,

        ':created_by' =>
        $userId

    ]);


    $paymentVoucherId =
        (int) $pdo->lastInsertId();


    // =====================================================
    // SAVE PAYMENT ALLOCATIONS
    // =====================================================

    $allocationInsertStmt =
        $pdo->prepare("
            INSERT INTO payment_allocations (
                company_id,
                payment_voucher_id,
                expense_voucher_id,
                amount
            )

            VALUES (
                :company_id,
                :payment_voucher_id,
                :expense_voucher_id,
                :amount
            )
        ");


    foreach (
        $validatedAllocations as $allocation
    ) {

        $allocationInsertStmt->execute([

            ':company_id' =>
            $companyId,

            ':payment_voucher_id' =>
            $paymentVoucherId,

            ':expense_voucher_id' =>
            $allocation['expense_id'],

            ':amount' =>
            $allocation['amount']

        ]);
    }


    // =====================================================
    // PAYABLE ACCOUNT
    // =====================================================

    $payableStmt = $pdo->prepare("
        SELECT id

        FROM accounts

        WHERE company_id = :company_id

        AND account_subtype = 'payable'

        LIMIT 1
    ");

    $payableStmt->execute([
        ':company_id' => $companyId
    ]);

    $payable =
        $payableStmt->fetch();

    if (!$payable) {
        throw new Exception(
            'Payable account is missing.'
        );
    }


    // =====================================================
    // LEDGER
    //
    // Dr Accounts Payable
    // Cr Cash / Bank
    // =====================================================

    $ledgerStmt = $pdo->prepare("
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


    // Debit Payable

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


    // Credit Cash / Bank

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


    // =====================================================
    // COMMIT
    // =====================================================

    $pdo->commit();


    // =====================================================
    // RESPONSE
    // =====================================================

    echo json_encode([

        'success' => true,

        'message' =>
        'Payment created successfully.',

        'data' => [

            'payment_voucher_id' =>
            $paymentVoucherId,

            'reference_number' =>
            $paymentReferenceNumber,

            'party_id' =>
            $supplierPartyId,

            'amount' =>
            $totalPayment,

            'payment_account_id' =>
            $paymentAccountId,

            'allocation_count' =>
            count($validatedAllocations),

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

        'success' => false,

        'message' =>
        $e->getMessage()

    ]);
}
