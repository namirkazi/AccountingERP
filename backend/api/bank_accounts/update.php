<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/BankAccount.php';


if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {

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


    if ($id <= 0) {

        throw new Exception(
            'Bank account ID is required.'
        );
    }


    $bankName =
        trim($data['bank_name'] ?? '');

    $accountName =
        trim($data['account_name'] ?? '');

    $accountNumber =
        trim($data['account_number'] ?? '');

    $iban =
        trim($data['iban'] ?? '');

    $currency =
        strtoupper(
            trim($data['currency'] ?? 'AED')
        );


    if ($bankName === '') {

        throw new Exception(
            'Bank name is required.'
        );
    }


    if ($accountName === '') {

        throw new Exception(
            'Account name is required.'
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


    if (
        $bankAccountModel->nameExists(
            $companyId,
            $accountName,
            $id
        )
    ) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' =>
                'Another bank account already uses this account name.'
        ]);

        exit;
    }


    $pdo->beginTransaction();


    /*
    |--------------------------------------------------------------------------
    | UPDATE BANK ACCOUNT
    |--------------------------------------------------------------------------
    */

    $stmt =
        $pdo->prepare("
            UPDATE bank_accounts

            SET
                bank_name = :bank_name,
                account_name = :account_name,
                account_number = :account_number,
                iban = :iban,
                currency = :currency

            WHERE id = :id
            AND company_id = :company_id
        ");


    $stmt->execute([

        ':bank_name' =>
            $bankName,

        ':account_name' =>
            $accountName,

        ':account_number' =>
            $accountNumber !== ''
                ? $accountNumber
                : null,

        ':iban' =>
            $iban !== ''
                ? $iban
                : null,

        ':currency' =>
            $currency,

        ':id' =>
            $id,

        ':company_id' =>
            $companyId
    ]);


    /*
    |--------------------------------------------------------------------------
    | KEEP LEDGER ACCOUNT NAME IN SYNC
    |--------------------------------------------------------------------------
    */

    $ledgerAccountName =
        $bankName
        . ' - '
        . $accountName;


    $ledgerStmt =
        $pdo->prepare("
            UPDATE accounts

            SET
                account_name = :account_name

            WHERE id = :account_id
            AND company_id = :company_id
            AND account_subtype = 'bank'
            AND is_system_account = 0
        ");


    $ledgerStmt->execute([

        ':account_name' =>
            $ledgerAccountName,

        ':account_id' =>
            $existing['accounting_account_id'],

        ':company_id' =>
            $companyId
    ]);


    $pdo->commit();


    $updated =
        $bankAccountModel->findById(
            $companyId,
            $id
        );


    echo json_encode([
        'success' => true,

        'message' =>
            'Bank account updated successfully.',

        'data' => [
            'bank_account' =>
                $updated
        ]
    ]);


} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }


    error_log(
        'Bank account update error: '
        . $e->getMessage()
    );


    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}