<?php

// ---------------------------------------------------------
// CORS
// ---------------------------------------------------------

$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {

    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
}


// ---------------------------------------------------------
// Handle browser preflight request
// ---------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(204);

    exit;
}


// ---------------------------------------------------------
// JSON
// ---------------------------------------------------------

header('Content-Type: application/json');


// ---------------------------------------------------------
// Session
// ---------------------------------------------------------

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();