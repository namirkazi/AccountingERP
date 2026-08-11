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
            'Expense head name is required.'
        );
    }

    /*
     * Check if this company already has
     * an expense account with this name.
     */

    $check = $pdo->prepare("
        SELECT
            id,
            account_name
        FROM accounts
        WHERE company_id = :company_id
        AND account_name = :account_name
        AND account_type = 'expense'
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
            'message' => 'Expense head already exists.',
            'data' => [
                'account' => [
                    'id' => (int) $existing['id'],
                    'account_name' =>
                        $existing['account_name'],
                    'account_type' => 'expense',
                    'account_subtype' => 'general'
                ],
                'existing' => true
            ]
        ]);

        exit;
    }


    /*
     * Create dynamically for the current company.
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

    $accountId =
        (int) $pdo->lastInsertId();


    echo json_encode([
        'success' => true,
        'message' =>
            'Expense head created successfully.',

        'data' => [
            'account' => [
                'id' => $accountId,
                'account_name' => $name,
                'account_type' => 'expense',
                'account_subtype' => 'general'
            ],
            'existing' => false
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Create expense head error: '
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}