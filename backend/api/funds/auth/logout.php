<?php

require_once __DIR__ . '/../../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../services/FundAuthService.php';


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


$authService =
    new FundAuthService($pdo);


$authService->logout();


echo json_encode([

    'success' => true,

    'message' =>
    'Logged out successfully.'

]);
