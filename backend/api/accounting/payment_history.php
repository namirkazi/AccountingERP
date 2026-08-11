<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}

try {

    $companyId = getCurrentCompanyId();

    $expenseId =
        (int) (
            $_GET['expense_id'] ?? 0
        );

    if ($expenseId <= 0) {

        throw new Exception(
            'Expense ID is required.'
        );
    }


    /*
     * Make sure the expense belongs
     * to the current company.
     */

    $expenseStmt = $pdo->prepare("
        SELECT
            id,
            voucher_date,
            reference_number,
            party_id,
            amount,
            narration
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

    $expense = $expenseStmt->fetch();

    if (!$expense) {

        throw new Exception(
            'Expense voucher not found.'
        );
    }


    /*
     * Fetch all payments linked
     * to this expense.
     */

    $paymentStmt = $pdo->prepare("
        SELECT
            pay.id,
            pay.voucher_date,
            pay.reference_number,
            pay.amount,
            pay.narration,

            account.account_name
                AS payment_account_name

        FROM vouchers pay

        LEFT JOIN ledger_entries ledger
            ON ledger.voucher_id = pay.id
            AND ledger.credit > 0

        LEFT JOIN accounts account
            ON account.id = ledger.account_id

        WHERE pay.company_id = :company_id

        AND pay.voucher_type = 'PAYMENT'

        AND pay.source_voucher_id = :expense_id

        ORDER BY
            pay.voucher_date ASC,
            pay.id ASC
    ");

    $paymentStmt->execute([
        ':company_id' => $companyId,
        ':expense_id' => $expenseId
    ]);

    $payments =
        $paymentStmt->fetchAll();


    $paidAmount = 0;

    foreach ($payments as &$payment) {

        $payment['amount'] =
            (float) $payment['amount'];

        $paidAmount +=
            $payment['amount'];
    }


    $expense['amount'] =
        (float) $expense['amount'];

    $expense['paid_amount'] =
        $paidAmount;

    $expense['outstanding_amount'] =
        max(
            0,
            $expense['amount']
            - $paidAmount
        );


    if (
        $expense['outstanding_amount'] <= 0
    ) {

        $expense['status'] = 'PAID';

    } elseif (
        $paidAmount > 0
    ) {

        $expense['status'] =
            'PARTIALLY_PAID';

    } else {

        $expense['status'] =
            'PENDING';
    }


    echo json_encode([
        'success' => true,

        'data' => [
            'expense' => $expense,
            'payments' => $payments
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Payment history error: '
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}