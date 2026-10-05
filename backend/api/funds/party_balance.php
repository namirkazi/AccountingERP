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

    $partyId =
        (int) (
            $_GET['party_id']
            ?? 0
        );


    if ($partyId <= 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid party.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFY PARTY
    |--------------------------------------------------------------------------
    */

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


    $party =
        $partyStmt->fetch(
            PDO::FETCH_ASSOC
        );


    if (!$party) {

        http_response_code(404);

        echo json_encode([
            'success' => false,
            'message' => 'Party not found.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | CALCULATE BALANCE
    |--------------------------------------------------------------------------
    */

    $balanceStmt =
        $pdo->prepare("
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
                ) AS total_withdrawn


            FROM fund_transactions

            WHERE party_id = :party_id
        ");


    $balanceStmt->execute([
        ':party_id' =>
        $partyId
    ]);


    $balance =
        $balanceStmt->fetch(
            PDO::FETCH_ASSOC
        );


    $totalDeposited =
        round(
            (float) (
                $balance['total_deposited']
                ?? 0
            ),
            2
        );


    $totalWithdrawn =
        round(
            (float) (
                $balance['total_withdrawn']
                ?? 0
            ),
            2
        );


    $currentBalance =
        round(
            $totalDeposited
                -
                $totalWithdrawn,
            2
        );


    $party['id'] =
        (int) $party['id'];


    echo json_encode([

        'success' => true,

        'data' => [

            'party' =>
            $party,

            'total_deposited' =>
            $totalDeposited,

            'total_withdrawn' =>
            $totalWithdrawn,

            'current_balance' =>
            $currentBalance

        ]

    ]);
} catch (Throwable $e) {

    error_log(
        'Fund party balance error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>
        'Unable to calculate party balance.'

    ]);
}
