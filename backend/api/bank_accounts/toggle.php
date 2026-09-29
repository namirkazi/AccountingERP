<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/BankAccount.php';


if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


try {

    $companyId =
        getCurrentCompanyId();


    $data =
        json_decode(
            file_get_contents('php://input'),
            true
        );


    $id =
        (int) ($data['id'] ?? 0);


    $isActive =
        isset($data['is_active'])
            ? (int) (bool) $data['is_active']
            : null;


    if ($id <= 0) {

        throw new Exception(
            'Bank account ID is required.'
        );
    }


    if ($isActive === null) {

        throw new Exception(
            'is_active is required.'
        );
    }


    $bankAccountModel =
        new BankAccount($pdo);


    $existing =
        $bankAccountModel->findById(
            $companyId,
            $id
        );


    if (!$existing) {

        http_response_code(404);

        echo json_encode([
            'success' => false,
            'message' => 'Bank account not found.'
        ]);

        exit;
    }


    $stmt =
        $pdo->prepare("
            UPDATE bank_accounts

            SET is_active = :is_active

            WHERE id = :id
            AND company_id = :company_id
        ");


    $stmt->execute([

        ':is_active' =>
            $isActive,

        ':id' =>
            $id,

        ':company_id' =>
            $companyId
    ]);


    $updated =
        $bankAccountModel->findById(
            $companyId,
            $id
        );


    echo json_encode([
        'success' => true,

        'message' =>
            $isActive
                ? 'Bank account enabled successfully.'
                : 'Bank account disabled successfully.',

        'data' => [
            'bank_account' =>
                $updated
        ]
    ]);


} catch (Throwable $e) {

    error_log(
        'Bank account toggle error: '
        . $e->getMessage()
    );


    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}