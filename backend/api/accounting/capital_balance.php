<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';


/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

$origin =
    $_SERVER['HTTP_ORIGIN'] ?? '';

$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
];

if (
    in_array(
        $origin,
        $allowedOrigins,
        true
    )
) {

    header(
        "Access-Control-Allow-Origin: $origin"
    );

    header(
        "Access-Control-Allow-Credentials: true"
    );

    header(
        "Access-Control-Allow-Headers: Content-Type"
    );

    header(
        "Access-Control-Allow-Methods: GET, OPTIONS"
    );
}


/*
|--------------------------------------------------------------------------
| OPTIONS
|--------------------------------------------------------------------------
*/

if (
    $_SERVER['REQUEST_METHOD'] ===
    'OPTIONS'
) {

    http_response_code(204);

    exit;
}


/*
|--------------------------------------------------------------------------
| Method
|--------------------------------------------------------------------------
*/

if (
    $_SERVER['REQUEST_METHOD'] !==
    'GET'
) {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Company
|--------------------------------------------------------------------------
*/

$companyId =
    getCurrentCompanyId();


/*
|--------------------------------------------------------------------------
| Available Capital
|--------------------------------------------------------------------------
|
| Investor capital is the amount contributed by investors.
|
| A genuine investor WITHDRAWAL reduces investor capital.
|
| A CAPITAL voucher is different:
|
| It moves capital from the unallocated capital pool
| into Cash and/or Bank.
|
| Therefore:
|
| Available Capital =
|
| Investor Contributions
| - Investor Withdrawals
| - Capital Transferred
|
|--------------------------------------------------------------------------
*/

try {


    /*
    |--------------------------------------------------------------------------
    | INVESTOR CAPITAL
    |--------------------------------------------------------------------------
    */

    $investorStmt = $pdo->prepare("
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN transaction_type = 'CONTRIBUTION'
                        THEN amount

                        WHEN transaction_type = 'WITHDRAWAL'
                        THEN -amount

                        ELSE 0
                    END
                ),
                0
            )

        FROM investor_capital_transactions

        WHERE company_id = :company_id
    ");

    $investorStmt->execute([
        ':company_id' =>
        $companyId
    ]);

    $investorCapital =
        (float) $investorStmt->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | FIRST INVESTOR CONTRIBUTION
    |--------------------------------------------------------------------------
    |
    | This lets us ignore the original opening CAPITAL voucher.
    |
    */

    $firstContributionStmt = $pdo->prepare("
        SELECT
            MIN(transaction_date)

        FROM investor_capital_transactions

        WHERE company_id = :company_id

        AND transaction_type = 'CONTRIBUTION'
    ");

    $firstContributionStmt->execute([
        ':company_id' =>
        $companyId
    ]);

    $firstContributionDate =
        $firstContributionStmt->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | CAPITAL ALREADY TRANSFERRED
    |--------------------------------------------------------------------------
    |
    | Only CAPITAL vouchers from the investor-capital period
    | are deducted.
    |
    | The opening CAPITAL voucher before the first investor
    | contribution is therefore excluded.
    |
    */

    $transferStmt = $pdo->prepare("
    SELECT
        COALESCE(
            SUM(amount),
            0
        )

    FROM vouchers

    WHERE company_id = ?

    AND voucher_type = 'CAPITAL'

    AND (
        ? IS NULL
        OR voucher_date >= ?
    )
");

    $transferStmt->execute([
        $companyId,
        $firstContributionDate,
        $firstContributionDate
    ]);
    $capitalTransferred =
        (float) $transferStmt->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | AVAILABLE CAPITAL
    |--------------------------------------------------------------------------
    */

    $availableCapital =
        $investorCapital -
        $capitalTransferred;


    if (
        $availableCapital < 0
    ) {

        $availableCapital = 0;
    }


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' => true,

        'data' => [

            'total_investor_capital' =>
            round(
                $investorCapital,
                2
            ),

            'capital_transferred' =>
            round(
                $capitalTransferred,
                2
            ),

            'available_capital' =>
            round(
                $availableCapital,
                2
            )

        ]

    ]);
} catch (Throwable $e) {

    error_log(
        'Capital balance API error: '
            . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
