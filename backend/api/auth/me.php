<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../config/database.php';


/*
|--------------------------------------------------------------------------
| FUNDS SESSION
|--------------------------------------------------------------------------
*/

if (
    (
        $_SESSION['portal']
        ?? ''
    ) === 'funds'
    &&
    isset(
        $_SESSION['fund_user_id']
    )
) {

    $fundUserId =
        (int)
        $_SESSION['fund_user_id'];


    $stmt =
        $pdo->prepare("
            SELECT
                id,
                username,
                full_name,
                role,
                is_active

            FROM fund_users

            WHERE id = :id

            LIMIT 1
        ");


    $stmt->execute([
        ':id' =>
        $fundUserId
    ]);


    $fundUser =
        $stmt->fetch(
            PDO::FETCH_ASSOC
        );


    if (
        !$fundUser ||
        (int) $fundUser['is_active']
        !== 1
    ) {

        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' =>
            'Funds session is no longer valid.'
        ]);

        exit;
    }


    echo json_encode([

        'success' => true,

        'data' => [

            'portal' =>
            'funds',

            'user' => [

                'id' =>
                (int) $fundUser['id'],

                'username' =>
                $fundUser['username'],

                'full_name' =>
                $fundUser['full_name'],

                'role' =>
                $fundUser['role'],

                'portal' =>
                'funds'

            ],

            'companies' =>
            [],

            'active_company_id' =>
            null,

            'active_company' =>
            null

        ]

    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| ACCOUNTING SESSION
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION['user_id'])) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' =>
        'Authentication required.'
    ]);

    exit;
}


$userModel =
    new User($pdo);


$userId =
    (int)
    $_SESSION['user_id'];


$activeCompanyId =
    (int) (
        $_SESSION['company_id']
        ?? 0
    );


$companies =
    $userModel->getUserCompanies(
        $userId
    );


$activeCompany =
    null;


foreach (
    $companies
    as $company
) {

    if (
        (int) $company['company_id']
        === $activeCompanyId
    ) {

        $activeCompany =
            $company;

        break;
    }
}


echo json_encode([

    'success' => true,

    'data' => [

        'portal' =>
        'accounting',

        'user' => [

            'id' =>
            $_SESSION['user_id'],

            'username' =>
            $_SESSION['username'],

            'full_name' =>
            $_SESSION['full_name'],

            'role' =>
            $activeCompany['role']
                ?? $_SESSION['role'],

            'portal' =>
            'accounting'

        ],

        'companies' =>
        $companies,

        'active_company_id' =>
        $activeCompanyId,

        'active_company' =>
        $activeCompany

    ]

]);
