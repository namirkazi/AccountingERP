<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}

try {

    $companyId = getCurrentCompanyId();

    $data = json_decode(
        file_get_contents('php://input'),
        true
    );

    $name = trim(
        $data['account_name'] ?? ''
    );

    if ($name === '') {
        throw new Exception(
            'Expense name is required.'
        );
    }


    /*
     * Check whether it already exists
     * for THIS company.
     */

    $check = $pdo->prepare("
        SELECT
            id,
            account_name,
            account_type,
            account_subtype
        FROM accounts
        WHERE company_id = :company_id
        AND account_type = 'expense'
        AND LOWER(account_name) = LOWER(:account_name)
        LIMIT 1
    ");

    $check->execute([
        ':company_id' => $companyId,
        ':account_name' => $name
    ]);

    $existing = $check->fetch();

    if ($existing) {

        echo json_encode([
            'success' => true,
            'message' =>
                'Expense already exists.',

            'data' => [
                'account' => [
                    'id' =>
                        (int) $existing['id'],

                    'account_name' =>
                        $existing['account_name'],

                    'account_type' =>
                        $existing['account_type'],

                    'account_subtype' =>
                        $existing['account_subtype']
                ],

                'existing' => true
            ]
        ]);

        exit;
    }


    /*
     * Create the account dynamically.
     */

    $stmt = $pdo->prepare("
        INSERT INTO accounts (
            company_id,
            account_name,
            account_type,
            account_subtype,
            is_system_account
        )
        VALUES (
            :company_id,
            :account_name,
            'expense',
            'general',
            0
        )
    ");

    $stmt->execute([
        ':company_id' => $companyId,
        ':account_name' => $name
    ]);

    $id =
        (int) $pdo->lastInsertId();


    echo json_encode([
        'success' => true,

        'message' =>
            'Expense created successfully.',

        'data' => [
            'account' => [
                'id' => $id,
                'account_name' => $name,
                'account_type' => 'expense',
                'account_subtype' => 'general'
            ],

            'existing' => false
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Create expense account error: '
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}