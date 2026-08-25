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


    $expenseId =
        (int) (
            $data['expense_id'] ?? 0
        );

    $amount =
        (float) (
            $data['amount'] ?? 0
        );

    $paymentAccountId =
        (int) (
            $data['payment_account_id'] ?? 0
        );

    $date =
        trim(
            $data['date'] ?? ''
        );

    $narration =
        trim(
            $data['narration'] ?? ''
        );


    // =====================================================
    // VALIDATION
    // =====================================================

    if ($expenseId <= 0) {

        throw new Exception(
            'Please select an expense.'
        );
    }

    if ($amount <= 0) {

        throw new Exception(
            'Payment amount must be greater than zero.'
        );
    }

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


    $pdo->beginTransaction();


    // =====================================================
    // GET EXPENSE
    // =====================================================

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
    ");

    $expenseStmt->execute([
        ':id' => $expenseId,
        ':company_id' => $companyId
    ]);

    $expense =
        $expenseStmt->fetch();

    if (!$expense) {

        throw new Exception(
            'Expense voucher not found.'
        );
    }


    // =====================================================
    // CALCULATE CURRENT OUTSTANDING
    // =====================================================

    $paidStmt = $pdo->prepare("
        SELECT
            COALESCE(
                SUM(amount),
                0
            ) AS paid_amount

        FROM vouchers

        WHERE company_id = :company_id

        AND voucher_type = 'PAYMENT'

        AND source_voucher_id = :expense_id
    ");

    $paidStmt->execute([
        ':company_id' => $companyId,
        ':expense_id' => $expenseId
    ]);

    $paidAmount =
        (float) (
            $paidStmt->fetch()['paid_amount']
        );

    $originalAmount =
        (float) $expense['amount'];

    $outstanding =
        $originalAmount - $paidAmount;


    if ($outstanding <= 0) {

        throw new Exception(
            'This expense has already been fully paid.'
        );
    }


    if ($amount > $outstanding) {

        throw new Exception(
            'Payment exceeds the outstanding amount. '
                . 'Outstanding: AED '
                . number_format(
                    $outstanding,
                    2
                )
        );
    }


    // =====================================================
    // VERIFY PAYMENT ACCOUNT
    // =====================================================

    $accountStmt = $pdo->prepare("
        SELECT
            id,
            account_name
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

    $paymentYear = (int) date(
        'Y',
        strtotime($date)
    );

    $lockName =
        'accounting_payment_' .
        $companyId;

    $lockStmt = $pdo->prepare(
        "SELECT GET_LOCK(:lock_name, 10)"
    );

    $lockStmt->execute([
        ':lock_name' => $lockName
    ]);

    if ((int) $lockStmt->fetchColumn() !== 1) {
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
        ':company_id' => $companyId,
        ':year_start' => $paymentYear . '-01-01',
        ':next_year_start' => ($paymentYear + 1) . '-01-01',
        ':pattern' => 'PAYMENT/' . $paymentYear . '/%'
    ]);

    $highestSequence = 0;

    while ($row = $sequenceStmt->fetch()) {
        $number = trim(
            (string) $row['reference_number']
        );

        if (preg_match(
            '#^PAYMENT/' .
                $paymentYear .
                '/([0-9]+)$#',
            $number,
            $matches
        )) {
            $highestSequence = max(
                $highestSequence,
                (int) $matches[1]
            );
        }
    }

    $paymentReferenceNumber =
        'PAYMENT/' .
        $paymentYear .
        '/' .
        str_pad(
            (string) ($highestSequence + 1),
            5,
            '0',
            STR_PAD_LEFT
        );
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
        $expense['bill_reference'] ?? null,

        ':party_id' =>
        $expense['party_id'],

        ':amount' =>
        $amount,

        ':narration' =>
        $narration !== ''
            ? $narration
            : $expense['narration'],

        ':source_voucher_id' =>
        $expenseId,

        ':created_by' =>
        $userId
    ]);

    $paymentVoucherId =
        (int) $pdo->lastInsertId();


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


    // =====================================================
    // LEDGER
    //
    // Dr Payable
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
        $expense['party_id'],

        ':debit' =>
        $amount,

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
        $amount
    ]);


    $pdo->commit();


    $remaining =
        $outstanding - $amount;


    echo json_encode([

        'success' => true,

        'message' =>
        'Payment created successfully.',

        'data' => [

            'payment_voucher_id' =>
            $paymentVoucherId,

            'expense_id' =>
            $expenseId,

            'reference_number' =>
            $paymentReferenceNumber,

            'bill_reference' =>
            $expense['bill_reference'] ?? null,

            'amount' =>
            $amount,

            'paid_amount' =>
            $paidAmount + $amount,

            'outstanding_amount' =>
            max(0, $remaining),

            'status' =>
            $remaining <= 0
                ? 'PAID'
                : 'PARTIALLY_PAID'
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
