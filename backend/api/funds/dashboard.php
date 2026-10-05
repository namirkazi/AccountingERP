<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/fund_auth.php';


requireFundRole([
    'admin',
    'operator'
]);


if ($_SERVER['REQUEST_METHOD'] !== 'GET') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


try {

    /*
    |--------------------------------------------------------------------------
    | OVERALL TOTALS
    |--------------------------------------------------------------------------
    */

    $summaryStmt =
        $pdo->query("
            SELECT

                COALESCE(
                    SUM(
                        CASE
                            WHEN transaction_type = 'DEPOSIT'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_deposited,

                COALESCE(
                    SUM(
                        CASE
                            WHEN transaction_type = 'WITHDRAWAL'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_withdrawn,

                COUNT(*) AS transaction_count,

                COUNT(
                    DISTINCT party_id
                ) AS active_parties

            FROM fund_transactions
        ");


    $summary =
        $summaryStmt->fetch(
            PDO::FETCH_ASSOC
        );


    $totalDeposited =
        round(
            (float) (
                $summary['total_deposited']
                ?? 0
            ),
            2
        );


    $totalWithdrawn =
        round(
            (float) (
                $summary['total_withdrawn']
                ?? 0
            ),
            2
        );


    /*
    |--------------------------------------------------------------------------
    | PARTY BALANCES
    |--------------------------------------------------------------------------
    |
    | Each party balance:
    |
    | deposits - withdrawals
    |
    | This represents the money currently held by us
    | on behalf of that party.
    |
    */

    $partyBalanceStmt =
        $pdo->query("
            SELECT

                fp.id AS party_id,
                fp.party_name,
                fp.phone,
                fp.email,
                fp.is_active,

                COALESCE(
                    SUM(
                        CASE
                            WHEN ft.transaction_type = 'DEPOSIT'
                            THEN ft.amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_deposited,

                COALESCE(
                    SUM(
                        CASE
                            WHEN ft.transaction_type = 'WITHDRAWAL'
                            THEN ft.amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_withdrawn,

                COALESCE(
                    SUM(
                        CASE
                            WHEN ft.transaction_type = 'DEPOSIT'
                            THEN ft.amount

                            WHEN ft.transaction_type = 'WITHDRAWAL'
                            THEN -ft.amount

                            ELSE 0
                        END
                    ),
                    0
                ) AS balance

            FROM fund_parties fp

            LEFT JOIN fund_transactions ft
                ON ft.party_id = fp.id

            GROUP BY
                fp.id,
                fp.party_name,
                fp.phone,
                fp.email,
                fp.is_active

            HAVING balance > 0

            ORDER BY
                balance DESC,
                fp.party_name ASC
        ");


    $partyBalances =
        $partyBalanceStmt->fetchAll(
            PDO::FETCH_ASSOC
        );


    $totalPayable = 0;


    foreach (
        $partyBalances
        as &$party
    ) {

        $party['party_id'] =
            (int) $party['party_id'];


        $party['is_active'] =
            (int) $party['is_active'];


        $party['total_deposited'] =
            round(
                (float) (
                    $party['total_deposited']
                    ?? 0
                ),
                2
            );


        $party['total_withdrawn'] =
            round(
                (float) (
                    $party['total_withdrawn']
                    ?? 0
                ),
                2
            );


        $party['balance'] =
            round(
                (float) (
                    $party['balance']
                    ?? 0
                ),
                2
            );


        $totalPayable +=
            $party['balance'];
    }


    unset($party);


    $totalPayable =
        round(
            $totalPayable,
            2
        );


    /*
    |--------------------------------------------------------------------------
    | CURRENT BALANCE
    |--------------------------------------------------------------------------
    |
    | This should normally equal total payable.
    |
    */

    $currentBalance =
        round(
            $totalDeposited
                -
                $totalWithdrawn,
            2
        );


    /*
    |--------------------------------------------------------------------------
    | RECENT TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    $recentStmt =
        $pdo->query("
            SELECT

                ft.id,
                ft.transaction_type,
                ft.transaction_date,
                ft.voucher_number,
                ft.amount,
                ft.payment_method,
                ft.reference_number,
                ft.remarks,

                fp.id AS party_id,
                fp.party_name

            FROM fund_transactions ft

            INNER JOIN fund_parties fp
                ON fp.id = ft.party_id

            ORDER BY
                ft.transaction_date DESC,
                ft.id DESC

            LIMIT 10
        ");


    $recentTransactions =
        $recentStmt->fetchAll(
            PDO::FETCH_ASSOC
        );


    foreach (
        $recentTransactions
        as &$transaction
    ) {

        $transaction['id'] =
            (int) $transaction['id'];


        $transaction['party_id'] =
            (int) $transaction['party_id'];


        $transaction['amount'] =
            round(
                (float) $transaction['amount'],
                2
            );
    }


    unset($transaction);


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' => true,

        'data' => [

            'summary' => [

                'total_deposited' =>
                $totalDeposited,

                'total_withdrawn' =>
                $totalWithdrawn,

                /*
                 * The actual amount currently
                 * belonging to parties.
                 */

                'total_payable' =>
                $totalPayable,

                /*
                 * Keep current balance too.
                 */

                'current_balance' =>
                $currentBalance,

                'transaction_count' =>
                (int) (
                    $summary['transaction_count']
                    ?? 0
                ),

                'active_parties' =>
                (int) (
                    $summary['active_parties']
                    ?? 0
                ),

                'parties_with_balance' =>
                count(
                    $partyBalances
                )

            ],


            /*
             * Used by Total Payable popup.
             */

            'party_balances' =>
            $partyBalances,


            'recent_transactions' =>
            $recentTransactions

        ]

    ]);
} catch (Throwable $e) {

    error_log(
        'Fund dashboard error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>
        'Unable to load dashboard.'

    ]);
}
