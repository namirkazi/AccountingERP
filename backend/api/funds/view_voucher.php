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

    $transactionId =
        (int) (
            $_GET['id']
            ?? 0
        );


    if ($transactionId <= 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid transaction.'
        ]);

        exit;
    }


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
                ft.created_at,

                fp.party_name,
                fp.phone,
                fp.email,
                fp.address,

                fu.full_name AS prepared_by

            FROM fund_transactions ft

            INNER JOIN fund_parties fp
                ON fp.id = ft.party_id

            INNER JOIN fund_users fu
                ON fu.id = ft.created_by

            WHERE ft.id = :transaction_id

            LIMIT 1
        ");


    $stmt->execute([
        ':transaction_id' =>
        $transactionId
    ]);


    $transaction =
        $stmt->fetch(
            PDO::FETCH_ASSOC
        );


    if (!$transaction) {

        http_response_code(404);

        echo json_encode([
            'success' => false,
            'message' => 'Transaction not found.'
        ]);

        exit;
    }


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
    | PARTY BALANCE AFTER THIS TRANSACTION
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
                            ELSE -amount
                        END
                    ),
                    0
                )

            FROM fund_transactions

            WHERE party_id = :party_id

            AND (
                transaction_date < :transaction_date

                OR (
                    transaction_date = :same_date
                    AND id <= :transaction_id
                )
            )
        ");


    $balanceStmt->execute([

        ':party_id' =>
        $transaction['party_id'],

        ':transaction_date' =>
        $transaction['transaction_date'],

        ':same_date' =>
        $transaction['transaction_date'],

        ':transaction_id' =>
        $transactionId

    ]);


    $balanceAfter =
        round(
            (float)
            $balanceStmt->fetchColumn(),
            2
        );


    echo json_encode([

        'success' => true,

        'data' => [

            'transaction' =>
            $transaction,

            'balance_after' =>
            $balanceAfter

        ]

    ]);
} catch (Throwable $e) {

    error_log(
        'View fund voucher error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([
        'success' => false,
        'message' => 'Unable to load voucher.'
    ]);
}
