<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

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

    $stmt = $pdo->prepare("
        SELECT
            id,
            account_name,
            account_type,
            account_subtype
        FROM accounts
        WHERE company_id = :company_id
        AND account_type = 'expense'
        ORDER BY account_name ASC
    ");

    $stmt->execute([
        ':company_id' => $companyId
    ]);

    echo json_encode([
        'success' => true,
        'data' => [
            'accounts' =>
                $stmt->fetchAll()
        ]
    ]);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}