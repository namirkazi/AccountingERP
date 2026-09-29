<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/BankAccount.php';


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

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


    if (!is_array($data)) {

        throw new Exception(
            'Invalid request data.'
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


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

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


    if ($currency === '') {

        throw new Exception(
            'Currency is required.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | MODEL
    |--------------------------------------------------------------------------
    */

    $bankAccountModel =
        new BankAccount($pdo);


    if (
        $bankAccountModel->nameExists(
            $companyId,
            $accountName
        )
    ) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' =>
                'A bank account with this name already exists.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | DATABASE TRANSACTION
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();


    /*
    |--------------------------------------------------------------------------
    | CREATE LEDGER ACCOUNT
    |--------------------------------------------------------------------------
    */

    $ledgerAccountName =
        $bankName
        . ' - '
        . $accountName;


    $ledgerStmt =
        $pdo->prepare("
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
                'asset',
                'bank',
                0
            )
        ");


    $ledgerStmt->execute([
        ':company_id' =>
            $companyId,

        ':account_name' =>
            $ledgerAccountName
    ]);


    $accountingAccountId =
        (int) $pdo->lastInsertId();


    /*
    |--------------------------------------------------------------------------
    | CREATE BANK ACCOUNT
    |--------------------------------------------------------------------------
    */

    $bankStmt =
        $pdo->prepare("
            INSERT INTO bank_accounts (
                company_id,
                bank_name,
                account_name,
                account_number,
                iban,
                currency,
                accounting_account_id,
                is_active
            )
            VALUES (
                :company_id,
                :bank_name,
                :account_name,
                :account_number,
                :iban,
                :currency,
                :accounting_account_id,
                1
            )
        ");


    $bankStmt->execute([

        ':company_id' =>
            $companyId,

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

        ':accounting_account_id' =>
            $accountingAccountId
    ]);


    $bankAccountId =
        (int) $pdo->lastInsertId();


    /*
    |--------------------------------------------------------------------------
    | COMMIT
    |--------------------------------------------------------------------------
    */

    $pdo->commit();


    /*
    |--------------------------------------------------------------------------
    | RETURN CREATED ACCOUNT
    |--------------------------------------------------------------------------
    */

    $created =
        $bankAccountModel->findById(
            $companyId,
            $bankAccountId
        );


    echo json_encode([
        'success' => true,

        'message' =>
            'Bank account created successfully.',

        'data' => [
            'bank_account' =>
                $created
        ]
    ]);


} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }


    error_log(
        'Bank account creation error: '
        . $e->getMessage()
    );


    http_response_code(
        $e instanceof PDOException
            ? 500
            : 422
    );


    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}