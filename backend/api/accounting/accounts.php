<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/Account.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}

try {

    $accountModel = new Account($pdo);

    $accounts = $accountModel->getAll(
        getCurrentCompanyId()
    );

    echo json_encode([
        'success' => true,
        'data' => [
            'accounts' => $accounts
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Accounts API error: ' . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load accounts.'
    ]);
}