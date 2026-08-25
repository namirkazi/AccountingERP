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
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
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
        "Access-Control-Allow-Methods: GET, POST, OPTIONS"
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Current User / Company
|--------------------------------------------------------------------------
*/

$companyId = getCurrentCompanyId();
$userId = getCurrentUserId();


/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

$data = json_decode(
    file_get_contents('php://input'),
    true
);

$investorId = (int) (
    $data['investor_id'] ?? 0
);

$amount = (float) (
    $data['amount'] ?? 0
);


/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

if ($investorId <= 0) {

    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' => 'Please select an investor.'
    ]);

    exit;
}


if ($amount <= 0) {

    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' =>
        'Capital amount must be greater than zero.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Database Transaction
|--------------------------------------------------------------------------
*/

try {

    $pdo->beginTransaction();


    /*
    |--------------------------------------------------------------------------
    | Verify Investor
    |--------------------------------------------------------------------------
    */

    $investorStmt = $pdo->prepare("
        SELECT
            id,
            investor_name,
            status
        FROM investors
        WHERE id = :investor_id
        AND company_id = :company_id
        LIMIT 1
    ");

    $investorStmt->execute([
        ':investor_id' => $investorId,
        ':company_id' => $companyId
    ]);

    $investor =
        $investorStmt->fetch(PDO::FETCH_ASSOC);


    if (!$investor) {

        throw new Exception(
            'Selected investor does not exist.'
        );
    }


    if ($investor['status'] !== 'active') {

        throw new Exception(
            'Selected investor is inactive.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Insert Capital Contribution
    |--------------------------------------------------------------------------
    */

    $insertStmt = $pdo->prepare("
        INSERT INTO investor_capital_transactions (
            company_id,
            investor_id,
            transaction_type,
            amount,
            transaction_date,
            narration,
            voucher_id,
            created_by
        )
        VALUES (
            :company_id,
            :investor_id,
            'CONTRIBUTION',
            :amount,
            :transaction_date,
            :narration,
            NULL,
            :created_by
        )
    ");


    $insertStmt->execute([

        ':company_id' =>
        $companyId,

        ':investor_id' =>
        $investorId,

        ':amount' =>
        number_format(
            $amount,
            2,
            '.',
            ''
        ),

        ':transaction_date' =>
        date('Y-m-d'),

        ':narration' =>
        'Capital contribution from '
            . $investor['investor_name'],

        ':created_by' =>
        $userId

    ]);


    $transactionId =
        (int) $pdo->lastInsertId();


    /*
    |--------------------------------------------------------------------------
    | Commit
    |--------------------------------------------------------------------------
    */

    $pdo->commit();


    echo json_encode([

        'success' => true,

        'message' =>
        'Capital added successfully.',

        'data' => [

            'transaction_id' =>
            $transactionId,

            'investor_id' =>
            $investorId,

            'investor_name' =>
            $investor['investor_name'],

            'amount' =>
            $amount,

            'transaction_type' =>
            'CONTRIBUTION',

            'transaction_date' =>
            date('Y-m-d')

        ]

    ]);
} catch (Throwable $e) {

    if ($pdo->inTransaction()) {

        $pdo->rollBack();
    }


    error_log(
        'Capital contribution error: '
            . $e->getMessage()
    );


    http_response_code(500);

    echo json_encode([

        'success' => false,

        'message' =>
        $e->getMessage()

    ]);
}
