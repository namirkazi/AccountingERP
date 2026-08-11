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

    /*
     * Calculate every account balance directly
     * from the ledger.
     *
     * Assets / Expenses:
     *     Debit - Credit
     *
     * Liabilities / Equity / Income:
     *     Credit - Debit
     */

    $stmt = $pdo->prepare("
        SELECT
            a.id,
            a.account_name,
            a.account_type,
            a.account_subtype,

            COALESCE(SUM(le.debit), 0) AS total_debit,

            COALESCE(SUM(le.credit), 0) AS total_credit

        FROM accounts a

        LEFT JOIN ledger_entries le
            ON le.account_id = a.id
            AND le.company_id = a.company_id

        WHERE a.company_id = :company_id

        GROUP BY
            a.id,
            a.account_name,
            a.account_type,
            a.account_subtype

        ORDER BY a.id
    ");

    $stmt->execute([
        ':company_id' => $companyId
    ]);

    $accounts = $stmt->fetchAll();

    $balances = [];

    $cash = 0;
    $bank = 0;
    $receivable = 0;
    $payable = 0;
    $capital = 0;
    $sales = 0;
    $expenses = 0;
    $receipts = 0;
    $payments = 0;
    foreach ($accounts as $account) {

        $debit = (float) $account['total_debit'];
        $credit = (float) $account['total_credit'];

        if (
            $account['account_type'] === 'asset' ||
            $account['account_type'] === 'expense'
        ) {

            $balance = $debit - $credit;
        } else {

            $balance = $credit - $debit;
        }

        $accountData = [
            'id' => (int) $account['id'],

            'account_name' =>
            $account['account_name'],

            'account_type' =>
            $account['account_type'],

            'account_subtype' =>
            $account['account_subtype'],

            'debit' => $debit,

            'credit' => $credit,

            'balance' => $balance
        ];

        $balances[] = $accountData;


        /*
         * Dashboard totals
         */

        switch ($account['account_subtype']) {

            case 'cash':

                $cash += $balance;

                break;


            case 'bank':

                $bank += $balance;

                break;


            case 'receivable':

                $receivable += $balance;

                break;


            case 'payable':

                $payable += $balance;

                break;


            case 'capital':

                $capital += $balance;

                break;


            case 'sales':

                $sales += $balance;

                break;
        }


        if (
            $account['account_type'] === 'expense'
        ) {

            $expenses += $balance;
        }
    }
    $voucherStmt = $pdo->prepare("
    SELECT
        voucher_type,
        COALESCE(SUM(amount), 0) AS total
    FROM vouchers
    WHERE company_id = :company_id
    GROUP BY voucher_type
");

    $voucherStmt->execute([
        ':company_id' => $companyId
    ]);

    $voucherTotals = $voucherStmt->fetchAll();

    foreach ($voucherTotals as $voucher) {

        $amount = (float) $voucher['total'];

        switch ($voucher['voucher_type']) {

            case 'RECEIPT':
                $receipts += $amount;
                break;

            case 'PAYMENT':
                $payments += $amount;
                break;
        }
    }

    $profit = $sales - $expenses;


    echo json_encode([

        'success' => true,

        'data' => [

            'summary' => [

                'cash' => round($cash, 2),

                'bank' => round($bank, 2),

                'receivable' => round($receivable, 2),

                'payable' => round($payable, 2),

                'capital' => round($capital, 2),

                'sales' => round($sales, 2),

                'receipts' => round($receipts, 2),

                'payments' => round($payments, 2),

                'expenses' => round($expenses, 2),

                'profit' => round($profit, 2)
            ],
            'accounts' => $balances
        ]
    ]);
} catch (Throwable $e) {

    error_log(
        'Balances API error: '
            . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
        'Unable to calculate account balances.'
    ]);
}
