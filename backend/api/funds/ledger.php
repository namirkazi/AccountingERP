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


function isValidFundLedgerDate(string $date): bool
{
    if ($date === '') {
        return true;
    }

    $dateObject =
        DateTime::createFromFormat(
            'Y-m-d',
            $date
        );

    return
        $dateObject &&
        $dateObject->format('Y-m-d') === $date;
}


try {

    /*
    |--------------------------------------------------------------------------
    | FILTERS
    |--------------------------------------------------------------------------
    */

    $search =
        trim(
            (string) (
                $_GET['search']
                ?? ''
            )
        );


    $type =
        strtoupper(
            trim(
                (string) (
                    $_GET['type']
                    ?? ''
                )
            )
        );


    $partyId =
        (int) (
            $_GET['party_id']
            ?? 0
        );


    $dateFrom =
        trim(
            (string) (
                $_GET['date_from']
                ?? ''
            )
        );


    $dateTo =
        trim(
            (string) (
                $_GET['date_to']
                ?? ''
            )
        );


    /*
    |--------------------------------------------------------------------------
    | VALIDATE TYPE
    |--------------------------------------------------------------------------
    */

    if (
        $type !== '' &&
        $type !== 'DEPOSIT' &&
        $type !== 'WITHDRAWAL'
    ) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid transaction type.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE DATES
    |--------------------------------------------------------------------------
    */

    if (!isValidFundLedgerDate($dateFrom)) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid From date.'
        ]);

        exit;
    }


    if (!isValidFundLedgerDate($dateTo)) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid To date.'
        ]);

        exit;
    }


    if (
        $dateFrom !== '' &&
        $dateTo !== '' &&
        $dateFrom > $dateTo
    ) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' =>
            'From date cannot be after To date.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFY SELECTED PARTY
    |--------------------------------------------------------------------------
    */

    $selectedParty = null;


    if ($partyId > 0) {

        $partyStmt =
            $pdo->prepare("
                SELECT
                    id,
                    party_name,
                    phone,
                    email,
                    address

                FROM fund_parties

                WHERE id = :party_id
                AND is_active = 1

                LIMIT 1
            ");


        $partyStmt->execute([
            ':party_id' =>
            $partyId
        ]);


        $selectedParty =
            $partyStmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$selectedParty) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Party not found.'
            ]);

            exit;
        }


        $selectedParty['id'] =
            (int) $selectedParty['id'];
    }


    /*
    |--------------------------------------------------------------------------
    | OPENING BALANCE
    |--------------------------------------------------------------------------
    |
    | Opening balance includes every transaction BEFORE date_from.
    |
    | Important:
    | We intentionally do NOT apply transaction type or search filters here.
    |
    */

    $openingBalance = 0;


    if ($dateFrom !== '') {

        $openingWhere = [
            'transaction_date < :opening_date'
        ];


        $openingParams = [
            ':opening_date' =>
            $dateFrom
        ];


        if ($partyId > 0) {

            $openingWhere[] =
                'party_id = :opening_party_id';


            $openingParams[':opening_party_id'] = $partyId;
        }


        $openingWhereSql =
            implode(
                ' AND ',
                $openingWhere
            );


        $openingStmt =
            $pdo->prepare("
                SELECT

                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type = 'DEPOSIT'
                                    THEN amount

                                WHEN transaction_type = 'WITHDRAWAL'
                                    THEN -amount

                                ELSE 0
                            END
                        ),
                        0
                    )

                FROM fund_transactions

                WHERE {$openingWhereSql}
            ");


        $openingStmt->execute(
            $openingParams
        );


        $openingBalance =
            round(
                (float) $openingStmt->fetchColumn(),
                2
            );
    }


    /*
    |--------------------------------------------------------------------------
    | LEDGER SCOPE
    |--------------------------------------------------------------------------
    |
    | Party and date filters define the actual ledger balance scope.
    |
    | Search and transaction type are display filters only.
    |
    */

    $scopeWhere = [
        '1 = 1'
    ];


    $scopeParams = [];


    if ($partyId > 0) {

        $scopeWhere[] =
            'ft.party_id = :scope_party_id';


        $scopeParams[':scope_party_id'] = $partyId;
    }


    if ($dateFrom !== '') {

        $scopeWhere[] =
            'ft.transaction_date >= :scope_date_from';


        $scopeParams[':scope_date_from'] = $dateFrom;
    }


    if ($dateTo !== '') {

        $scopeWhere[] =
            'ft.transaction_date <= :scope_date_to';


        $scopeParams[':scope_date_to'] = $dateTo;
    }


    $scopeWhereSql =
        implode(
            ' AND ',
            $scopeWhere
        );


    /*
    |--------------------------------------------------------------------------
    | LOAD TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    $stmt =
        $pdo->prepare("
            SELECT

                ft.id,
                ft.transaction_type,
                ft.transaction_date,
                ft.voucher_number,
                ft.party_id,
                ft.amount,
                ft.payment_method,
                ft.reference_number,
                ft.remarks,
                ft.created_by,
                ft.created_at,

                fp.party_name,
                fp.phone,
                fp.email,

                fu.full_name AS created_by_name

            FROM fund_transactions ft

            INNER JOIN fund_parties fp
                ON fp.id = ft.party_id

            INNER JOIN fund_users fu
                ON fu.id = ft.created_by

            WHERE {$scopeWhereSql}

            ORDER BY
                ft.transaction_date ASC,
                ft.id ASC
        ");


    $stmt->execute(
        $scopeParams
    );


    $scopeTransactions =
        $stmt->fetchAll(
            PDO::FETCH_ASSOC
        );


    /*
    |--------------------------------------------------------------------------
    | RUNNING BALANCE
    |--------------------------------------------------------------------------
    */

    $runningBalance =
        $openingBalance;


    $totalDeposited = 0;

    $totalWithdrawn = 0;

    $displayTransactions = [];


    foreach (
        $scopeTransactions
        as $transaction
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


        /*
        |--------------------------------------------------------------------------
        | APPLY TRANSACTION TO REAL RUNNING BALANCE
        |--------------------------------------------------------------------------
        */

        if (
            $transaction['transaction_type']
            === 'DEPOSIT'
        ) {

            $runningBalance +=
                $transaction['amount'];


            $totalDeposited +=
                $transaction['amount'];


            $transaction['deposit'] =
                $transaction['amount'];


            $transaction['withdrawal'] =
                0;
        } else {

            $runningBalance -=
                $transaction['amount'];


            $totalWithdrawn +=
                $transaction['amount'];


            $transaction['deposit'] =
                0;


            $transaction['withdrawal'] =
                $transaction['amount'];
        }


        $transaction['running_balance'] =
            round(
                $runningBalance,
                2
            );


        /*
        |--------------------------------------------------------------------------
        | DISPLAY TYPE FILTER
        |--------------------------------------------------------------------------
        */

        if (
            $type !== '' &&
            $transaction['transaction_type']
            !== $type
        ) {

            continue;
        }


        /*
        |--------------------------------------------------------------------------
        | DISPLAY SEARCH FILTER
        |--------------------------------------------------------------------------
        */

        if ($search !== '') {

            $methodLabel =
                str_replace(
                    '_',
                    ' ',
                    $transaction['payment_method']
                );


            $haystack =
                implode(
                    ' ',
                    [
                        $transaction['voucher_number'] ?? '',

                        $transaction['reference_number'] ?? '',

                        $transaction['remarks'] ?? '',

                        $transaction['party_name'] ?? '',

                        $transaction['payment_method'] ?? '',

                        $methodLabel,

                        $transaction['created_by_name'] ?? ''
                    ]
                );


            if (
                stripos(
                    $haystack,
                    $search
                ) === false
            ) {

                continue;
            }
        }


        $displayTransactions[] =
            $transaction;
    }


    /*
    |--------------------------------------------------------------------------
    | CLOSING BALANCE
    |--------------------------------------------------------------------------
    */

    $closingBalance =
        round(
            $openingBalance
                +
                $totalDeposited
                -
                $totalWithdrawn,
            2
        );


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' => true,

        'data' => [

            /*
             * Show newest transaction first.
             *
             * running_balance was calculated chronologically
             * before reversing.
             */

            'transactions' =>
            array_reverse(
                $displayTransactions
            ),


            'selected_party' =>
            $selectedParty,


            'summary' => [

                'opening_balance' =>
                round(
                    $openingBalance,
                    2
                ),

                'total_deposited' =>
                round(
                    $totalDeposited,
                    2
                ),

                'total_withdrawn' =>
                round(
                    $totalWithdrawn,
                    2
                ),

                'closing_balance' =>
                $closingBalance,

                'transaction_count' =>
                count(
                    $displayTransactions
                ),

                'period_transaction_count' =>
                count(
                    $scopeTransactions
                )

            ]

        ]

    ]);
} catch (Throwable $e) {

    error_log(
        'Fund ledger error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>
        'Unable to load ledger.'

    ]);
}
