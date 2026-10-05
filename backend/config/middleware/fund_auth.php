<?php

require_once __DIR__ . '/../config.php';


if (session_status() === PHP_SESSION_NONE) {
    session_start();
}


/*
|--------------------------------------------------------------------------
| FUNDS AUTHENTICATION
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION['fund_user_id'])) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Funds authentication required.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| CURRENT FUNDS USER ID
|--------------------------------------------------------------------------
*/

function getCurrentFundUserId(): int
{
    return (int) (
        $_SESSION['fund_user_id']
        ?? 0
    );
}


/*
|--------------------------------------------------------------------------
| CURRENT FUNDS USER ROLE
|--------------------------------------------------------------------------
*/

function getCurrentFundUserRole(): string
{
    return strtolower(
        trim(
            (string) (
                $_SESSION['fund_role']
                ?? 'operator'
            )
        )
    );
}


/*
|--------------------------------------------------------------------------
| FUNDS ROLE GUARD
|--------------------------------------------------------------------------
*/

function requireFundRole(array $allowedRoles): void
{
    $currentRole =
        getCurrentFundUserRole();


    $allowedRoles =
        array_map(
            fn($role) =>
            strtolower(
                trim(
                    (string) $role
                )
            ),
            $allowedRoles
        );


    if (
        in_array(
            $currentRole,
            $allowedRoles,
            true
        )
    ) {
        return;
    }


    http_response_code(403);

    echo json_encode([
        'success' => false,
        'message' => 'You do not have permission to perform this action.'
    ]);

    exit;
}
