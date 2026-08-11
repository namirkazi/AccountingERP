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

    $companyId =
        getCurrentCompanyId();


    $data =
        json_decode(
            file_get_contents('php://input'),
            true
        );


    $name =
        trim(
            $data['name'] ?? ''
        );


    $phone =
        trim(
            $data['phone'] ?? ''
        );


    $email =
        trim(
            $data['email'] ?? ''
        );


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($name === '') {

        throw new Exception(
            'Supplier name is required.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE
    |--------------------------------------------------------------------------
    */

    $check =
        $pdo->prepare("
            SELECT
                id,
                party_name,
                party_type,
                phone,
                email
            FROM parties
            WHERE company_id = :company_id
            AND party_type = 'supplier'
            AND LOWER(party_name) = LOWER(:party_name)
            LIMIT 1
        ");


    $check->execute([
        ':company_id' => $companyId,
        ':party_name' => $name
    ]);


    $existing =
        $check->fetch();


    if ($existing) {

        echo json_encode([
            'success' => true,
            'message' => 'Supplier already exists.',
            'data' => [
                'party' => $existing,
                'existing' => true
            ]
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE SUPPLIER
    |--------------------------------------------------------------------------
    */

    $stmt =
        $pdo->prepare("
            INSERT INTO parties (
                company_id,
                party_name,
                party_type,
                phone,
                email
            )
            VALUES (
                :company_id,
                :party_name,
                'supplier',
                :phone,
                :email
            )
        ");


    $stmt->execute([
        ':company_id' => $companyId,
        ':party_name' => $name,
        ':phone' =>
            $phone !== ''
                ? $phone
                : null,
        ':email' =>
            $email !== ''
                ? $email
                : null
    ]);


    $id =
        (int) $pdo->lastInsertId();


    /*
    |--------------------------------------------------------------------------
    | RETURN CREATED SUPPLIER
    |--------------------------------------------------------------------------
    */

    $partyStmt =
        $pdo->prepare("
            SELECT
                id,
                party_name,
                party_type,
                phone,
                email
            FROM parties
            WHERE id = :id
            AND company_id = :company_id
            LIMIT 1
        ");


    $partyStmt->execute([
        ':id' => $id,
        ':company_id' => $companyId
    ]);


    $party =
        $partyStmt->fetch();


    echo json_encode([
        'success' => true,
        'message' =>
            'Supplier created successfully.',
        'data' => [
            'party' => $party,
            'existing' => false
        ]
    ]);


} catch (Throwable $e) {

    error_log(
        'Supplier creation error: '
        . $e->getMessage()
    );


    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}