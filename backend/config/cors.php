<?php

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
|
| FRONTEND_URL should contain the deployed frontend URL on Railway.
|
| Example:
|
| FRONTEND_URL=https://your-frontend.up.railway.app
|
| Local development URLs remain enabled.
|
|--------------------------------------------------------------------------
*/

$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',

    'http://localhost:5174',
    'http://127.0.0.1:5174',

    'http://localhost:5175',
    'http://127.0.0.1:5175',

    'https://accounting-frontend-production-b94e.up.railway.app/',
    'https://accounting-backend-production-8ca9.up.railway.app/',
];

$frontendUrl = trim(
    getenv('FRONTEND_URL') ?: ''
);

if ($frontendUrl !== '') {
    $allowedOrigins[] = rtrim(
        $frontendUrl,
        '/'
    );
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {

    header(
        "Access-Control-Allow-Origin: {$origin}"
    );

    header(
        "Access-Control-Allow-Credentials: true"
    );

    header(
        "Access-Control-Allow-Headers: Content-Type, Authorization"
    );

    header(
        "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
    );
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(204);

    exit;
}
