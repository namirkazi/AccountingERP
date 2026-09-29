<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/BankAccount.php';


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

    $includeInactive =
        isset($_GET['include_inactive'])
        && $_GET['include_inactive'] === '1';


    $bankAccountModel =
        new BankAccount($pdo);


    $accounts =
        $bankAccountModel->getAll(
            $companyId,
            $includeInactive
        );
    $cashStmt = $pdo->prepare("
    SELECT id
    FROM accounts
    WHERE company_id = :company_id
      AND account_subtype = 'cash'
    LIMIT 1
");

    $cashStmt->execute([
        ':company_id' => $companyId
    ]);

    $cashAccountId = $cashStmt->fetchColumn();

    echo json_encode([
        'success' => true,

        'data' => [
            'bank_accounts' => $accounts,
            'cash_account_id' => $cashAccountId
        ]
    ]);
} catch (Throwable $e) {

    error_log(
        'Bank account list error: '
            . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load bank accounts.'
    ]);
}
