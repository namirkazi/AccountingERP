<?php

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Authentication required.'
    ]);

    exit;
}

function getCurrentUserId(): int
{
    return (int) $_SESSION['user_id'];
}

function getCurrentCompanyId(): int
{
    return (int) $_SESSION['company_id'];
}

function getCurrentUserRole(): string
{
    return $_SESSION['role'] ?? 'user';
}