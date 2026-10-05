<?php

require_once __DIR__ . '/../../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../services/FundAuthService.php';


/*
|--------------------------------------------------------------------------
| METHOD
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| REQUEST BODY
|--------------------------------------------------------------------------
*/

$data =
    json_decode(
        file_get_contents('php://input'),
        true
    );


$username =
    trim(
        (string) (
            $data['username']
            ?? ''
        )
    );


$password =
    (string) (
        $data['password']
        ?? ''
    );


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

if (
    $username === '' ||
    $password === ''
) {

    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' =>
        'Username and password are required.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

try {

    $authService =
        new FundAuthService($pdo);


    $user =
        $authService->login(
            $username,
            $password
        );


    echo json_encode([

        'success' => true,

        'message' =>
        'Login successful.',

        'data' => [

            'user' =>
            $user

        ]

    ]);
} catch (Throwable $e) {

    http_response_code(401);


    echo json_encode([

        'success' => false,

        'message' =>
        $e->getMessage()

    ]);
}
