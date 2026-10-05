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


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


try {

    $data =
        json_decode(
            file_get_contents('php://input'),
            true
        );


    $type =
        strtoupper(
            trim(
                (string) (
                    $data['type']
                    ?? ''
                )
            )
        );


    $date =
        trim(
            (string) (
                $data['date']
                ?? ''
            )
        );


    $partyId =
        (int) (
            $data['party_id']
            ?? 0
        );


    $amount =
        round(
            (float) (
                $data['amount']
                ?? 0
            ),
            2
        );


    $paymentMethod =
        strtoupper(
            trim(
                (string) (
                    $data['payment_method']
                    ?? ''
                )
            )
        );


    $referenceNumber =
        trim(
            (string) (
                $data['reference_number']
                ?? ''
            )
        );


    $remarks =
        trim(
            (string) (
                $data['remarks']
                ?? ''
            )
        );


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
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


    if ($date === '') {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Date is required.'
        ]);

        exit;
    }


    $dateObject =
        DateTime::createFromFormat(
            'Y-m-d',
            $date
        );


    if (
        !$dateObject ||
        $dateObject->format('Y-m-d') !== $date
    ) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid date.'
        ]);

        exit;
    }


    if ($partyId <= 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Party is required.'
        ]);

        exit;
    }


    if ($amount <= 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Amount must be greater than zero.'
        ]);

        exit;
    }


    $allowedMethods = [
        'UPI',
        'BANK_TRANSFER',
        'CASH',
        'OTHER'
    ];


    if (
        !in_array(
            $paymentMethod,
            $allowedMethods,
            true
        )
    ) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid transaction method.'
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
    | DATABASE TRANSACTION
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();


    /*
    |--------------------------------------------------------------------------
    | LOCK PARTY
    |--------------------------------------------------------------------------
    |
    | Deposits / withdrawals for the same party should be processed
    | sequentially so two withdrawals cannot both use the same balance.
    |
    */

    $lockPartyStmt =
        $pdo->prepare("
            SELECT id

            FROM fund_parties

            WHERE id = :party_id

            FOR UPDATE
        ");


    $lockPartyStmt->execute([
        ':party_id' =>
        $partyId
    ]);


    /*
    |--------------------------------------------------------------------------
    | CURRENT BALANCE
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


    $balanceRow =
        $balanceStmt->fetch(
            PDO::FETCH_ASSOC
        );


    $totalDeposited =
        round(
            (float) (
                $balanceRow['total_deposited']
                ?? 0
            ),
            2
        );


    $totalWithdrawn =
        round(
            (float) (
                $balanceRow['total_withdrawn']
                ?? 0
            ),
            2
        );


    $balanceBefore =
        round(
            $totalDeposited
                -
                $totalWithdrawn,
            2
        );



    /*
    |--------------------------------------------------------------------------
    | VOUCHER NUMBER
    |--------------------------------------------------------------------------
    |
    | Voucher sequences are locked by transaction type + year.
    |
    | This prevents two transactions for different parties from receiving
    | the same voucher number at the same time.
    |
    */

    $year =
        (int) date(
            'Y',
            strtotime($date)
        );


    $voucherPrefix =
        $type
        . '/'
        . $year
        . '/';


    /*
    |--------------------------------------------------------------------------
    | ENSURE SEQUENCE ROW EXISTS
    |--------------------------------------------------------------------------
    */

    $sequenceInsertStmt =
        $pdo->prepare("
            INSERT IGNORE INTO fund_voucher_sequences (
                transaction_type,
                voucher_year,
                last_sequence
            )

            VALUES (
                :transaction_type,
                :voucher_year,
                0
            )
        ");


    $sequenceInsertStmt->execute([

        ':transaction_type' =>
        $type,

        ':voucher_year' =>
        $year

    ]);


    /*
    |--------------------------------------------------------------------------
    | LOCK SEQUENCE
    |--------------------------------------------------------------------------
    */

    $sequenceSelectStmt =
        $pdo->prepare("
            SELECT
                last_sequence

            FROM fund_voucher_sequences

            WHERE transaction_type = :transaction_type
            AND voucher_year = :voucher_year

            FOR UPDATE
        ");


    $sequenceSelectStmt->execute([

        ':transaction_type' =>
        $type,

        ':voucher_year' =>
        $year

    ]);


    $lastSequence =
        (int) $sequenceSelectStmt->fetchColumn();


    $nextSequence =
        $lastSequence + 1;


    /*
    |--------------------------------------------------------------------------
    | UPDATE SEQUENCE
    |--------------------------------------------------------------------------
    */

    $sequenceUpdateStmt =
        $pdo->prepare("
            UPDATE fund_voucher_sequences

            SET last_sequence = :last_sequence

            WHERE transaction_type = :transaction_type
            AND voucher_year = :voucher_year
        ");


    $sequenceUpdateStmt->execute([

        ':last_sequence' =>
        $nextSequence,

        ':transaction_type' =>
        $type,

        ':voucher_year' =>
        $year

    ]);


    /*
    |--------------------------------------------------------------------------
    | BUILD VOUCHER NUMBER
    |--------------------------------------------------------------------------
    */

    $voucherNumber =
        $voucherPrefix
        . str_pad(
            (string) $nextSequence,
            5,
            '0',
            STR_PAD_LEFT
        );

    /*
    |--------------------------------------------------------------------------
    | INSERT TRANSACTION
    |--------------------------------------------------------------------------
    */

    $insertStmt =
        $pdo->prepare("
            INSERT INTO fund_transactions (
                transaction_type,
                transaction_date,
                voucher_number,
                party_id,
                amount,
                payment_method,
                reference_number,
                remarks,
                created_by
            )

            VALUES (
                :transaction_type,
                :transaction_date,
                :voucher_number,
                :party_id,
                :amount,
                :payment_method,
                :reference_number,
                :remarks,
                :created_by
            )
        ");


    $insertStmt->execute([

        ':transaction_type' =>
        $type,

        ':transaction_date' =>
        $date,

        ':voucher_number' =>
        $voucherNumber,

        ':party_id' =>
        $partyId,

        ':amount' =>
        $amount,

        ':payment_method' =>
        $paymentMethod,

        ':reference_number' =>
        $referenceNumber !== ''
            ? $referenceNumber
            : null,

        ':remarks' =>
        $remarks !== ''
            ? $remarks
            : null,

        ':created_by' =>
        getCurrentFundUserId()

    ]);


    $transactionId =
        (int)
        $pdo->lastInsertId();


    $balanceAfter =
        $type === 'DEPOSIT'
        ? round(
            $balanceBefore + $amount,
            2
        )
        : round(
            $balanceBefore - $amount,
            2
        );


    $pdo->commit();


    echo json_encode([

        'success' => true,

        'message' =>
        $type === 'DEPOSIT'
            ? 'Deposit created successfully.'
            : 'Withdrawal created successfully.',

        'data' => [

            'transaction_id' =>
            $transactionId,

            'transaction_type' =>
            $type,

            'voucher_number' =>
            $voucherNumber,

            'transaction_date' =>
            $date,

            'party' => [

                'id' =>
                (int) $party['id'],

                'party_name' =>
                $party['party_name'],

                'phone' =>
                $party['phone'] ?? '',

                'email' =>
                $party['email'] ?? '',

                'address' =>
                $party['address'] ?? ''

            ],

            'amount' =>
            $amount,

            'payment_method' =>
            $paymentMethod,

            'reference_number' =>
            $referenceNumber,

            'remarks' =>
            $remarks,

            'balance_before' =>
            $balanceBefore,

            'balance_after' =>
            $balanceAfter

        ]

    ]);
} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }


    error_log(
        'Create fund transaction error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>
        'Unable to create transaction.'

    ]);
}
