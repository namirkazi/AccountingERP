<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../config/database.php';

$userModel = new User($pdo);

if (!isset($_SESSION['user_id'])) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated.'
    ]);

    exit;
}

$userId = (int) $_SESSION['user_id'];

$activeCompanyId =
    (int) ($_SESSION['company_id'] ?? 0);

$companies =
    $userModel->getUserCompanies($userId);

$activeCompany = null;

foreach ($companies as $company) {

    if (
        (int) $company['company_id']
        === $activeCompanyId
    ) {
        $activeCompany = $company;
        break;
    }
}

echo json_encode([
    'success' => true,

    'data' => [

        'user' => [
            'id' =>
            $_SESSION['user_id'],

            'username' =>
            $_SESSION['username'],

            'full_name' =>
            $_SESSION['full_name'],

            'role' =>
            $activeCompany['role']
                ?? $_SESSION['role']
        ],

        'companies' =>
        $companies,

        'active_company_id' =>
        $activeCompanyId,

        'active_company' =>
        $activeCompany
    ]
]);
