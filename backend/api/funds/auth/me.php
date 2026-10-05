<?php

require_once __DIR__ . '/../../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/middleware/fund_auth.php';


echo json_encode([

    'success' => true,

    'data' => [

        'user' => [

            'id' =>
            getCurrentFundUserId(),

            'username' =>
            $_SESSION['fund_username']
                ?? '',

            'full_name' =>
            $_SESSION['fund_full_name']
                ?? '',

            'role' =>
            getCurrentFundUserRole()

        ]

    ]

]);
