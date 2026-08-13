<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

try {

    $companyId = getCurrentCompanyId();

    if (!$companyId) {
        throw new Exception(
            'Company could not be determined.'
        );
    }


    $stmt = $pdo->prepare("
        SELECT
            id,
            name,
            logo,
            address,
            city,
            country,
            phone,
            email,
            website,
            trn,
            primary_color,
            secondary_color,
            accent_color
        FROM companies
        WHERE id = :company_id
        LIMIT 1
    ");


    $stmt->execute([
        ':company_id' => $companyId
    ]);


    $company = $stmt->fetch();


    if (!$company) {

        throw new Exception(
            'Company profile not found.'
        );

    }


    echo json_encode([
        'success' => true,

        'company' => [
            'id' =>
                (int) $company['id'],

            'name' =>
                $company['name'],

            'logo' =>
                $company['logo'],

            'address' =>
                $company['address'],

            'city' =>
                $company['city'],

            'country' =>
                $company['country'],

            'phone' =>
                $company['phone'],

            'email' =>
                $company['email'],

            'website' =>
                $company['website'],

            'trn' =>
                $company['trn'],

            'theme' => [

                'primary' =>
                    $company['primary_color'],

                'secondary' =>
                    $company['secondary_color'],

                'accent' =>
                    $company['accent_color']

            ]
        ]
    ]);


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);

}