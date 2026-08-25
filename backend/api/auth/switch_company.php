<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/User.php';


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


if (!isset($_SESSION['user_id'])) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated.'
    ]);

    exit;
}


try {

    $data = json_decode(
        file_get_contents('php://input'),
        true
    );


    $companyId = (int) (
        $data['company_id'] ?? 0
    );


    if ($companyId <= 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid company.'
        ]);

        exit;
    }


    $userId = (int) $_SESSION['user_id'];


    /*
     * IMPORTANT:
     *
     * The user must actually have access
     * to the requested company.
     */

    $stmt = $pdo->prepare("
        SELECT
            uc.company_id,
            uc.role,
            c.company_name,
            c.company_code,
            c.logo,
            c.primary_color,
            c.secondary_color,
            c.accent_color
        FROM user_companies uc

        INNER JOIN companies c
            ON c.id = uc.company_id

        WHERE uc.user_id = :user_id
        AND uc.company_id = :company_id
        AND uc.is_active = 1

        LIMIT 1
    ");


    $stmt->execute([
        ':user_id' =>
        $userId,

        ':company_id' =>
        $companyId
    ]);


    $company =
        $stmt->fetch();


    if (!$company) {

        http_response_code(403);

        echo json_encode([
            'success' => false,
            'message' =>
            'You do not have access to this company.'
        ]);

        exit;
    }


    /*
     * Change the active company.
     */

    $_SESSION['company_id'] =
        (int) $company['company_id'];

    $_SESSION['company_name'] =
        $company['company_name'];

    $_SESSION['company_code'] =
        $company['company_code'];

    $_SESSION['logo'] =
        $company['logo'];

    $_SESSION['company_role'] =
        $company['role'];


    /*
     * Keep the legacy role in sync as well.
     */

    $_SESSION['role'] =
        $company['role'];


    echo json_encode([
        'success' => true,

        'message' =>
        'Company switched successfully.',

        'data' => [
            'company_id' =>
            (int) $company['company_id'],

            'company_name' =>
            $company['company_name'],

            'company_code' =>
            $company['company_code'],

            'role' =>
            $company['role'],

            'logo' =>
            $company['logo'],

            'primary_color' =>
            $company['primary_color'],

            'secondary_color' =>
            $company['secondary_color'],

            'accent_color' =>
            $company['accent_color']
        ]
    ]);
} catch (Throwable $e) {

    error_log(
        'Company switch error: ' .
            $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
        'Unable to switch company.'
    ]);
}
