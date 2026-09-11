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
    }

    /*
     * =========================================================
     * EXPENSE TOTAL
     * =========================================================
     *
     * Expense bills are stored as EXPENSE vouchers.
     * There is no longer an expense account/head that should
     * be used to calculate the Dashboard expense total.
     *
     * The amount of each EXPENSE voucher is therefore the
     * authoritative expense amount for the company.
     */
    $expenseStmt = $pdo->prepare("
        SELECT
            COALESCE(
                SUM(amount),
                0
            ) AS total_expenses
        FROM vouchers
        WHERE company_id = :company_id
          AND voucher_type = 'EXPENSE'
    ");

    $expenseStmt->execute([
        ':company_id' => $companyId
    ]);

    $expenses = round(
        (float) (
            $expenseStmt->fetchColumn() ?? 0
        ),
        2
    );
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
    /*
 * =========================================================
 * CUSTOMER RECEIVABLES
 * =========================================================
 *
 * Receivable balance is calculated from the
 * Accounts Receivable ledger entries grouped
 * by customer.
 *
 * Asset account:
 *     Debit - Credit
 *
 */

    $receivableStmt = $pdo->prepare("
    SELECT
        p.id AS party_id,
        p.party_name,
        p.party_type,

        COALESCE(
            SUM(le.debit - le.credit),
            0
        ) AS balance

    FROM ledger_entries le

    INNER JOIN accounts a
        ON a.id = le.account_id
        AND a.company_id = le.company_id

    INNER JOIN parties p
        ON p.id = le.party_id
        AND p.company_id = le.company_id

    WHERE le.company_id = :company_id

      AND a.account_subtype = 'receivable'

    GROUP BY
        p.id,
        p.party_name,
        p.party_type

    HAVING
        ABS(
            SUM(le.debit - le.credit)
        ) > 0.005

    ORDER BY
        balance DESC,
        p.party_name ASC
");

    $receivableStmt->execute([
        ':company_id' => $companyId
    ]);

    $receivables = [];

    while (
        $row = $receivableStmt->fetch()
    ) {

        $receivables[] = [
            'party_id' =>
            (int) $row['party_id'],

            'party_name' =>
            $row['party_name'],

            'party_type' =>
            $row['party_type'],

            'balance' =>
            round(
                (float) $row['balance'],
                2
            )
        ];
    }


    /*
 * =========================================================
 * SUPPLIER PAYABLES
 * =========================================================
 *
 * Liability account:
 *     Credit - Debit
 *
 */

    $payableStmt = $pdo->prepare("
    SELECT
        p.id AS party_id,
        p.party_name,
        p.party_type,

        COALESCE(
            SUM(le.credit - le.debit),
            0
        ) AS balance

    FROM ledger_entries le

    INNER JOIN accounts a
        ON a.id = le.account_id
        AND a.company_id = le.company_id

    INNER JOIN parties p
        ON p.id = le.party_id
        AND p.company_id = le.company_id

    WHERE le.company_id = :company_id

      AND a.account_subtype = 'payable'

    GROUP BY
        p.id,
        p.party_name,
        p.party_type

    HAVING
        ABS(
            SUM(le.credit - le.debit)
        ) > 0.005

    ORDER BY
        balance DESC,
        p.party_name ASC
");

    $payableStmt->execute([
        ':company_id' => $companyId
    ]);

    $payables = [];

    while (
        $row = $payableStmt->fetch()
    ) {

        $payables[] = [
            'party_id' =>
            (int) $row['party_id'],

            'party_name' =>
            $row['party_name'],

            'party_type' =>
            $row['party_type'],

            'balance' =>
            round(
                (float) $row['balance'],
                2
            )
        ];
    }
    /*
 * =========================================================
 * INVESTOR CAPITAL
 * =========================================================
 *
 * Investor balances represent actual investor capital.
 *
 * A CAPITAL voucher is NOT an investor withdrawal.
 * It simply moves part of the available capital pool
 * into Cash and/or Bank.
 *
 * Therefore:
 *
 * Investor A contribution = 20,000
 * Investor B contribution = 20,000
 *
 * Investor capital = 40,000
 *
 * Move Capital = 10,000
 *
 * Available capital = 30,000
 *
 * The investor rows remain:
 *
 * Investor A = 20,000
 * Investor B = 20,000
 *
 */

    /*
 * ---------------------------------------------------------
 * INVESTOR CONTRIBUTIONS
 * ---------------------------------------------------------
 *
 * Only CONTRIBUTION transactions are shown as investor
 * capital on the dashboard.
 *
 * Genuine WITHDRAWAL transactions are intentionally not
 * subtracted here because the dashboard is showing the
 * investor's contributed capital.
 *
 */

    $capitalInvestorStmt = $pdo->prepare("
    SELECT
        i.id AS investor_id,
        i.investor_name,

        COALESCE(
            SUM(
                CASE
                    WHEN ict.transaction_type = 'CONTRIBUTION'
                    THEN ict.amount
                    ELSE 0
                END
            ),
            0
        ) AS balance

    FROM investors i

    INNER JOIN investor_capital_transactions ict
        ON ict.investor_id = i.id
        AND ict.company_id = i.company_id

    WHERE i.company_id = :company_id

    GROUP BY
        i.id,
        i.investor_name

    HAVING
    ABS(
        SUM(
            CASE
                WHEN ict.transaction_type = 'CONTRIBUTION'
                THEN ict.amount
                ELSE 0
            END
        )
    ) > 0.005

    ORDER BY
        balance DESC,
        i.investor_name ASC
");

    $capitalInvestorStmt->execute([
        ':company_id' => $companyId
    ]);

    $capitalInvestors = [];

    while ($row = $capitalInvestorStmt->fetch()) {

        $capitalInvestors[] = [
            'investor_id' =>
            (int) $row['investor_id'],

            'investor_name' =>
            $row['investor_name'],

            'balance' =>
            round(
                (float) $row['balance'],
                2
            )
        ];
    }


    /*
 * ---------------------------------------------------------
 * TOTAL INVESTOR CAPITAL
 * ---------------------------------------------------------
 */

    $investorCapitalTotal = 0;

    foreach ($capitalInvestors as $investor) {

        $investorCapitalTotal +=
            (float) $investor['balance'];
    }


    /*
 * ---------------------------------------------------------
 * CAPITAL ALREADY TRANSFERRED
 * ---------------------------------------------------------
 *
 * A CAPITAL voucher means that capital has been moved
 * from the unallocated capital pool into Cash and/or Bank.
 *
 * It does NOT change the investor's contributed amount.
 *
 */

    /*
 * ---------------------------------------------------------
 * FIRST INVESTOR CONTRIBUTION DATE
 * ---------------------------------------------------------
 *
 * CAPITAL vouchers before investor contributions are
 * opening balances and should not reduce investor capital.
 *
 */

    $firstContributionStmt = $pdo->prepare("
    SELECT
        MIN(transaction_date)

    FROM investor_capital_transactions

    WHERE company_id = :company_id

    AND transaction_type = 'CONTRIBUTION'
");

    $firstContributionStmt->execute([
        ':company_id' => $companyId
    ]);

    $firstContributionDate =
        $firstContributionStmt->fetchColumn();


    /*
 * ---------------------------------------------------------
 * CAPITAL ALREADY TRANSFERRED
 * ---------------------------------------------------------
 *
 * Only CAPITAL vouchers from the investor-capital period
 * are deducted from available investor capital.
 *
 */

    $capitalTransferStmt = $pdo->prepare("
    SELECT
        COALESCE(
            SUM(amount),
            0
        )

    FROM vouchers

    WHERE company_id = :company_id

    AND voucher_type = 'CAPITAL'

    AND voucher_date >= :contribution_date
");

    $capitalTransferStmt->execute([
        ':company_id' =>
        $companyId,

        ':contribution_date' =>
        $firstContributionDate
    ]);

    $capitalTransferred =
        (float) $capitalTransferStmt->fetchColumn();

    /*
 * ---------------------------------------------------------
 * AVAILABLE CAPITAL
 * ---------------------------------------------------------
 *
 * Investor Capital
 *       -
 * Capital already transferred
 *       =
 * Available Capital
 *
 */

    $availableCapital =
        $investorCapitalTotal -
        $capitalTransferred;

    /*
 * ---------------------------------------------------------
 * PROFIT
 * ---------------------------------------------------------
 */

    $profit = $sales - $expenses;

    echo json_encode([

        'success' => true,

        'data' => [

            'summary' => [

                'cash' => round($cash, 2),

                'bank' => round($bank, 2),

                'receivable' => round($receivable, 2),

                'payable' => round($payable, 2),

                'capital' =>
                round(
                    $capital,
                    2
                ),

                'capital_investor_total' =>
                round(
                    $investorCapitalTotal,
                    2
                ),

                'capital_available' =>
                round(
                    $availableCapital,
                    2
                ),

                'capital_transferred' =>
                round(
                    $capitalTransferred,
                    2
                ),

                'sales' => round($sales, 2),

                'receipts' => round($receipts, 2),

                'payments' => round($payments, 2),

                'expenses' => round($expenses, 2),

                'profit' => round($profit, 2)
            ],
            'accounts' => $balances,
            'receivables' => $receivables,
            'payables' => $payables,
            'capital_investors' => $capitalInvestors,
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
