<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}

try {

    $companyId = getCurrentCompanyId();

    $data = json_decode(
        file_get_contents('php://input'),
        true
    );


    $paymentId =
        (int) (
            $data['payment_id'] ?? 0
        );

    $newAmount =
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


    if ($paymentId <= 0) {
        throw new Exception(
            'Payment ID is required.'
        );
    }

    if ($newAmount <= 0) {
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
    // GET PAYMENT
    // =====================================================

    $paymentStmt = $pdo->prepare("
        SELECT
            id,
            source_voucher_id,
            amount
        FROM vouchers

        WHERE id = :id

        AND company_id = :company_id

        AND voucher_type = 'PAYMENT'

        LIMIT 1
    ");

    $paymentStmt->execute([
        ':id' => $paymentId,
        ':company_id' => $companyId
    ]);

    $payment =
        $paymentStmt->fetch();

    if (!$payment) {

        throw new Exception(
            'Payment voucher not found.'
        );
    }

    $expenseId =
        (int) $payment['source_voucher_id'];

    if ($expenseId <= 0) {

        throw new Exception(
            'This payment is not linked to an expense.'
        );
    }


    // =====================================================
    // GET EXPENSE
    // =====================================================

    $expenseStmt = $pdo->prepare("
        SELECT
            id,
            party_id,
            amount
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
            'Original expense not found.'
        );
    }


    // =====================================================
    // OTHER PAYMENTS
    //
    // Exclude the payment we're editing.
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

        AND id != :payment_id
    ");

    $paidStmt->execute([
        ':company_id' =>
            $companyId,

        ':expense_id' =>
            $expenseId,

        ':payment_id' =>
            $paymentId
    ]);

    $otherPayments =
        (float) (
            $paidStmt->fetch()
            ['paid_amount']
        );


    $expenseAmount =
        (float) $expense['amount'];

    $available =
        $expenseAmount
        - $otherPayments;


    if ($newAmount > $available) {

        throw new Exception(
            'Payment exceeds the remaining '
            . 'available amount. '
            . 'Maximum: AED '
            . number_format(
                $available,
                2
            )
        );
    }


    // =====================================================
    // VERIFY ACCOUNT
    // =====================================================

    $accountStmt = $pdo->prepare("
        SELECT id
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
        ':id' =>
            $paymentAccountId,

        ':company_id' =>
            $companyId
    ]);

    if (!$accountStmt->fetch()) {

        throw new Exception(
            'Invalid Cash/Bank account.'
        );
    }


    // =====================================================
    // UPDATE VOUCHER
    // =====================================================

    $updateVoucher = $pdo->prepare("
        UPDATE vouchers

        SET
            voucher_date = :voucher_date,
            amount = :amount,
            narration = :narration

        WHERE id = :id

        AND company_id = :company_id

        AND voucher_type = 'PAYMENT'
    ");

    $updateVoucher->execute([

        ':voucher_date' =>
            $date,

        ':amount' =>
            $newAmount,

        ':narration' =>
            $narration,

        ':id' =>
            $paymentId,

        ':company_id' =>
            $companyId
    ]);


    // =====================================================
    // UPDATE LEDGER
    // =====================================================

    $deleteLedger = $pdo->prepare("
        DELETE FROM ledger_entries

        WHERE voucher_id = :voucher_id
    ");

    $deleteLedger->execute([
        ':voucher_id' =>
            $paymentId
    ]);


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


    // Payable
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


    // Dr Payable
    $ledgerStmt->execute([

        ':company_id' =>
            $companyId,

        ':voucher_id' =>
            $paymentId,

        ':account_id' =>
            $payable['id'],

        ':party_id' =>
            $expense['party_id'],

        ':debit' =>
            $newAmount,

        ':credit' =>
            0
    ]);


    // Cr Cash / Bank
    $ledgerStmt->execute([

        ':company_id' =>
            $companyId,

        ':voucher_id' =>
            $paymentId,

        ':account_id' =>
            $paymentAccountId,

        ':party_id' =>
            null,

        ':debit' =>
            0,

        ':credit' =>
            $newAmount
    ]);


    $pdo->commit();


    $totalPaid =
        $otherPayments + $newAmount;

    $remaining =
        max(
            0,
            $expenseAmount - $totalPaid
        );


    echo json_encode([

        'success' => true,

        'message' =>
            'Payment updated successfully.',

        'data' => [

            'payment_id' =>
                $paymentId,

            'expense_id' =>
                $expenseId,

            'amount' =>
                $newAmount,

            'paid_amount' =>
                $totalPaid,

            'outstanding_amount' =>
                $remaining,

            'status' =>
                $remaining <= 0
                    ? 'PAID'
                    : (
                        $totalPaid > 0
                            ? 'PARTIALLY_PAID'
                            : 'PENDING'
                    )
        ]
    ]);

} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'Update payment error: '
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}