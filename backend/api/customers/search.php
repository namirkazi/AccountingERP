<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/Party.php';

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

    $search = trim(
        $_GET['q'] ?? ''
    );

    if ($search === '') {

        echo json_encode([
            'success' => true,
            'data' => [
                'parties' => []
            ]
        ]);

        exit;
    }

    $partyModel = new Party($pdo);

    $parties = $partyModel->search(
        $companyId,
        $search
    );

    echo json_encode([
        'success' => true,
        'data' => [
            'parties' => $parties
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Party search error: ' .
        $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to search customers.'
    ]);
}