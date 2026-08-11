
<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
// =========================================================
// CORS - MUST BE FIRST
// =========================================================

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
}

// Handle browser preflight request BEFORE anything else
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}


// =========================================================
// JSON
// =========================================================



// =========================================================
// Dependencies
// =========================================================




// =========================================================
// Authentication
// =========================================================



// =========================================================
// Method
// =========================================================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


// =========================================================
// Current User
// =========================================================

$companyId = getCurrentCompanyId();
$userId = getCurrentUserId();


// =========================================================
// Request Data
// =========================================================

$data = json_decode(
    file_get_contents('php://input'),
    true
);

$capital = (float) ($data['capital'] ?? 0);
$bank = (float) ($data['bank'] ?? 0);
$cash = (float) ($data['cash'] ?? 0);


// =========================================================
// Validation
// =========================================================

if ($capital <= 0) {

    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' =>
            'Capital amount must be greater than zero.'
    ]);

    exit;
}

if ($bank < 0 || $cash < 0) {

    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' =>
            'Bank and Cash cannot be negative.'
    ]);

    exit;
}

$totalAssets = $bank + $cash;

if (abs($capital - $totalAssets) > 0.001) {

    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' =>
            'Capital must equal the total opening Bank and Cash balances.'
    ]);

    exit;
}


// =========================================================
// Database Transaction
// =========================================================

try {

    $pdo->beginTransaction();


    // -----------------------------------------------------
    // Prevent duplicate opening
    // -----------------------------------------------------

    $check = $pdo->prepare("
        SELECT id
        FROM vouchers
        WHERE company_id = :company_id
        AND voucher_type = 'CAPITAL'
        LIMIT 1
    ");

    $check->execute([
        ':company_id' => $companyId
    ]);

    if ($check->fetch()) {

        $pdo->rollBack();

        http_response_code(409);

        echo json_encode([
            'success' => false,
            'message' =>
                'Opening balance has already been posted for this company.'
        ]);

        exit;
    }


    // -----------------------------------------------------
    // Get accounts
    // -----------------------------------------------------

    $accountStmt = $pdo->prepare("
        SELECT
            id,
            account_name
        FROM accounts
        WHERE company_id = :company_id
        AND account_name IN (
            'Cash',
            'Bank',
            'Capital'
        )
    ");

    $accountStmt->execute([
        ':company_id' => $companyId
    ]);

    $accounts = $accountStmt->fetchAll();

    $accountMap = [];

    foreach ($accounts as $account) {

        $accountMap[
            $account['account_name']
        ] = (int) $account['id'];
    }


    // -----------------------------------------------------
    // Check accounts
    // -----------------------------------------------------

    if (
        !isset($accountMap['Cash']) ||
        !isset($accountMap['Bank']) ||
        !isset($accountMap['Capital'])
    ) {

        throw new Exception(
            'Cash, Bank or Capital account is missing.'
        );
    }


    // -----------------------------------------------------
    // Create voucher
    // -----------------------------------------------------

    $voucherStmt = $pdo->prepare("
        INSERT INTO vouchers (
            company_id,
            voucher_type,
            voucher_date,
            reference_number,
            party_id,
            amount,
            narration,
            created_by
        )
        VALUES (
            :company_id,
            'CAPITAL',
            :voucher_date,
            NULL,
            NULL,
            :amount,
            :narration,
            :created_by
        )
    ");

    $voucherStmt->execute([
        ':company_id' => $companyId,
        ':voucher_date' => date('Y-m-d'),
        ':amount' => $capital,
        ':narration' =>
            'Opening capital and opening cash/bank balances.',
        ':created_by' => $userId
    ]);

    $voucherId =
        (int) $pdo->lastInsertId();


    // -----------------------------------------------------
    // Ledger entries
    // -----------------------------------------------------

    $ledgerStmt = $pdo->prepare("
        INSERT INTO ledger_entries (
            company_id,
            voucher_id,
            account_id,
            party_id,
            debit,
            credit
        )
        VALUES (
            :company_id,
            :voucher_id,
            :account_id,
            NULL,
            :debit,
            :credit
        )
    ");


    // Bank
    if ($bank > 0) {

        $ledgerStmt->execute([
            ':company_id' => $companyId,
            ':voucher_id' => $voucherId,
            ':account_id' => $accountMap['Bank'],
            ':debit' => $bank,
            ':credit' => 0
        ]);
    }


    // Cash
    if ($cash > 0) {

        $ledgerStmt->execute([
            ':company_id' => $companyId,
            ':voucher_id' => $voucherId,
            ':account_id' => $accountMap['Cash'],
            ':debit' => $cash,
            ':credit' => 0
        ]);
    }


    // Capital
    $ledgerStmt->execute([
        ':company_id' => $companyId,
        ':voucher_id' => $voucherId,
        ':account_id' => $accountMap['Capital'],
        ':debit' => 0,
        ':credit' => $capital
    ]);


    // -----------------------------------------------------
    // Commit
    // -----------------------------------------------------

    $pdo->commit();


    echo json_encode([
        'success' => true,
        'message' =>
            'Opening balance posted successfully.',
        'data' => [
            'voucher_id' => $voucherId,
            'capital' => $capital,
            'bank' => $bank,
            'cash' => $cash
        ]
    ]);

} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'Opening balance error: '
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'Unable to post opening balance.'
    ]);
}