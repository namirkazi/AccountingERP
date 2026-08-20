<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';
require_once __DIR__ . '/../../models/Party.php';

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
        $data['name'] ?? ''
    );

    $phone = trim(
        $data['phone'] ?? ''
    );

    $email = trim(
        $data['email'] ?? ''
    );

    $address = trim(
        $data['address'] ?? ''
    );

    if ($name === '') {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Customer name is required.'
        ]);

        exit;
    }

    $partyModel = new Party($pdo);

    $partyId = $partyModel->create(
        $companyId,
        $name,
        'customer',
        $phone !== '' ? $phone : null,
        $email !== '' ? $email : null
    );

    /*
     * Save the address after creating the customer.
     *
     * The current Party::create() method does not accept
     * an address parameter, so update the newly-created
     * party directly here.
     */
    if ($address !== '') {

        $addressStmt = $pdo->prepare("
            UPDATE parties
            SET address = :address
            WHERE id = :id
            AND company_id = :company_id
            LIMIT 1
        ");

        $addressStmt->execute([
            ':address' => $address,
            ':id' => $partyId,
            ':company_id' => $companyId
        ]);
    }

    $party = $partyModel->find(
        $companyId,
        $partyId
    );

    echo json_encode([
        'success' => true,
        'message' => 'Customer added successfully.',
        'data' => [
            'party' => $party
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Customer creation error: ' .
            $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to create customer.'
    ]);
}