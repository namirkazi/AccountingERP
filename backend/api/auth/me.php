<?php

require_once __DIR__ . '/../../config/config.php';

if (!isset($_SESSION['user_id'])) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated.'
    ]);

    exit;
}

echo json_encode([
    'success' => true,
    'data' => [
        'user' => [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'full_name' => $_SESSION['full_name'],
            'role' => $_SESSION['role'],
            'company_id' => $_SESSION['company_id'],
            'company_name' => $_SESSION['company_name'],
            'company_code' => $_SESSION['company_code'],
            'logo' => $_SESSION['logo']
        ]
    ]
]);