<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';


if ($_SERVER['REQUEST_METHOD'] !== 'GET') {

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


    $search =
        trim(
            $_GET['q'] ?? ''
        );


    if ($search === '') {

        echo json_encode([
            'success' => true,
            'data' => [
                'parties' => []
            ]
        ]);

        exit;
    }


    $stmt = $pdo->prepare("
        SELECT
            id,
            party_name,
            party_type,
            phone,
            email,
            address
        FROM parties
        WHERE company_id = :company_id
        AND party_type = 'supplier'
        AND party_name LIKE :search
        ORDER BY party_name ASC
        LIMIT 20
    ");


    $searchValue =
        '%' . $search . '%';


    $stmt->execute([
        ':company_id' => $companyId,
        ':search' => $searchValue
    ]);


    $parties =
        $stmt->fetchAll();


    echo json_encode([
        'success' => true,
        'data' => [
            'parties' => $parties
        ]
    ]);


} catch (Throwable $e) {

    error_log(
        'Supplier search error: '
        . $e->getMessage()
    );


    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to search suppliers.'
    ]);
}