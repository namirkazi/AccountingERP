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

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

if (in_array($origin, $allowedOrigins, true)) {

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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(204);

    exit;
}


/*
|--------------------------------------------------------------------------
| Method
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {

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
| Contributions increase capital.
| Withdrawals decrease capital.
|
*/

try {

    $stmt = $pdo->prepare("
        SELECT

            COALESCE(
                SUM(
                    CASE
                        WHEN transaction_type = 'CONTRIBUTION'
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ) AS total_contributions,

            COALESCE(
                SUM(
                    CASE
                        WHEN transaction_type = 'WITHDRAWAL'
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ) AS total_withdrawals

        FROM investor_capital_transactions

        WHERE company_id = :company_id
    ");


    $stmt->execute([
        ':company_id' => $companyId
    ]);


    $row =
        $stmt->fetch(PDO::FETCH_ASSOC);


    $contributions =
        (float) (
            $row['total_contributions'] ?? 0
        );


    $withdrawals =
        (float) (
            $row['total_withdrawals'] ?? 0
        );


    $availableCapital =
        $contributions - $withdrawals;


    /*
    |--------------------------------------------------------------------------
    | Safety
    |--------------------------------------------------------------------------
    */

    if ($availableCapital < 0) {

        $availableCapital = 0;

    }


    echo json_encode([

        'success' => true,

        'data' => [

            'total_contributions' =>
                round(
                    $contributions,
                    2
                ),

            'total_withdrawals' =>
                round(
                    $withdrawals,
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

        'message' =>
            'Unable to load available capital.'

    ]);

}