<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

try {

    $companyId = getCurrentCompanyId();
    $userId = getCurrentUserId();

    if (!$companyId) {

        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Company not found.'
        ]);

        exit;
    }

    $method = $_SERVER['REQUEST_METHOD'];


    /*
     * ====================================================
     * GET
     * ====================================================
     *
     * customer_services.php?customer_id=5
     */

    if ($method === 'GET') {

        $customerId =
            isset($_GET['customer_id'])
                ? (int) $_GET['customer_id']
                : 0;


        if ($customerId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Customer ID is required.'
            ]);

            exit;
        }


        /*
         * Verify customer belongs to this company
         * and is actually a customer.
         */

        $customerStmt = $pdo->prepare("
            SELECT id
            FROM parties
            WHERE id = ?
              AND company_id = ?
              AND party_type = 'customer'
            LIMIT 1
        ");

        $customerStmt->execute([
            $customerId,
            $companyId
        ]);


        if (!$customerStmt->fetch()) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Customer not found.'
            ]);

            exit;
        }


        /*
         * Get customer's active services.
         */

        $stmt = $pdo->prepare("
            SELECT
                id,
                customer_id,
                service_name,
                default_amount,
                is_active,
                created_at,
                updated_at
            FROM customer_services
            WHERE company_id = ?
              AND customer_id = ?
              AND is_active = 1
            ORDER BY service_name ASC
        ");

        $stmt->execute([
            $companyId,
            $customerId
        ]);


        $services = $stmt->fetchAll(
            PDO::FETCH_ASSOC
        );


        echo json_encode([
            'success' => true,
            'services' => $services
        ]);

        exit;
    }


    /*
     * ====================================================
     * POST
     * ====================================================
     *
     * Creates a service for a customer.
     */

    if ($method === 'POST') {

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );


        $customerId =
            isset($input['customer_id'])
                ? (int) $input['customer_id']
                : 0;


        $serviceName =
            trim(
                $input['service_name'] ?? ''
            );


        $defaultAmount =
            isset($input['default_amount'])
                ? (float) $input['default_amount']
                : 0;


        if ($customerId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Customer ID is required.'
            ]);

            exit;
        }


        if ($serviceName === '') {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Service name is required.'
            ]);

            exit;
        }


        if ($defaultAmount < 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Default amount cannot be negative.'
            ]);

            exit;
        }


        /*
         * Verify customer.
         */

        $customerStmt = $pdo->prepare("
            SELECT id
            FROM parties
            WHERE id = ?
              AND company_id = ?
              AND party_type = 'customer'
            LIMIT 1
        ");

        $customerStmt->execute([
            $customerId,
            $companyId
        ]);


        if (!$customerStmt->fetch()) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Customer not found.'
            ]);

            exit;
        }


        /*
         * Check whether this service already exists
         * for this customer.
         */

        $existingStmt = $pdo->prepare("
            SELECT
                id,
                customer_id,
                service_name,
                default_amount,
                is_active,
                created_at,
                updated_at
            FROM customer_services
            WHERE company_id = ?
              AND customer_id = ?
              AND LOWER(service_name) = LOWER(?)
            LIMIT 1
        ");

        $existingStmt->execute([
            $companyId,
            $customerId,
            $serviceName
        ]);


        $existing = $existingStmt->fetch(
            PDO::FETCH_ASSOC
        );


        if ($existing) {

            /*
             * Restore an archived service.
             */

            if ((int) $existing['is_active'] === 0) {

                $updateStmt = $pdo->prepare("
                    UPDATE customer_services
                    SET
                        service_name = ?,
                        default_amount = ?,
                        is_active = 1
                    WHERE id = ?
                      AND company_id = ?
                ");

                $updateStmt->execute([
                    $serviceName,
                    $defaultAmount,
                    $existing['id'],
                    $companyId
                ]);


                $existing['service_name'] =
                    $serviceName;

                $existing['default_amount'] =
                    $defaultAmount;

                $existing['is_active'] = 1;


                echo json_encode([
                    'success' => true,
                    'message' => 'Service restored.',
                    'service' => $existing
                ]);

                exit;
            }


            /*
             * Already exists.
             */

            echo json_encode([
                'success' => true,
                'message' => 'Service already exists.',
                'service' => $existing
            ]);

            exit;
        }


        /*
         * Create service.
         */

        $stmt = $pdo->prepare("
            INSERT INTO customer_services (
                company_id,
                customer_id,
                service_name,
                default_amount,
                is_active
            )
            VALUES (?, ?, ?, ?, 1)
        ");


        $stmt->execute([
            $companyId,
            $customerId,
            $serviceName,
            $defaultAmount
        ]);


        $serviceId =
            (int) $pdo->lastInsertId();


        /*
         * Return newly created service.
         */

        $serviceStmt = $pdo->prepare("
            SELECT
                id,
                customer_id,
                service_name,
                default_amount,
                is_active,
                created_at,
                updated_at
            FROM customer_services
            WHERE id = ?
              AND company_id = ?
            LIMIT 1
        ");


        $serviceStmt->execute([
            $serviceId,
            $companyId
        ]);


        $service = $serviceStmt->fetch(
            PDO::FETCH_ASSOC
        );


        echo json_encode([
            'success' => true,
            'message' => 'Service created successfully.',
            'service' => $service
        ]);

        exit;
    }


    /*
     * ====================================================
     * PUT
     * ====================================================
     */

    if ($method === 'PUT') {

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );


        $serviceId =
            isset($input['id'])
                ? (int) $input['id']
                : 0;


        $serviceName =
            trim(
                $input['service_name'] ?? ''
            );


        $defaultAmount =
            isset($input['default_amount'])
                ? (float) $input['default_amount']
                : 0;


        $isActive =
            isset($input['is_active'])
                ? (int) $input['is_active']
                : 1;


        if ($serviceId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Service ID is required.'
            ]);

            exit;
        }


        if ($serviceName === '') {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Service name is required.'
            ]);

            exit;
        }


        /*
         * Make sure service belongs to this company.
         */

        $checkStmt = $pdo->prepare("
            SELECT
                id,
                customer_id
            FROM customer_services
            WHERE id = ?
              AND company_id = ?
            LIMIT 1
        ");

        $checkStmt->execute([
            $serviceId,
            $companyId
        ]);


        $existing = $checkStmt->fetch(
            PDO::FETCH_ASSOC
        );


        if (!$existing) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Service not found.'
            ]);

            exit;
        }


        /*
         * Prevent duplicate service names
         * for the same customer.
         */

        $duplicateStmt = $pdo->prepare("
            SELECT id
            FROM customer_services
            WHERE company_id = ?
              AND customer_id = ?
              AND LOWER(service_name) = LOWER(?)
              AND id != ?
            LIMIT 1
        ");

        $duplicateStmt->execute([
            $companyId,
            $existing['customer_id'],
            $serviceName,
            $serviceId
        ]);


        if ($duplicateStmt->fetch()) {

            http_response_code(409);

            echo json_encode([
                'success' => false,
                'message' =>
                    'Another service with this name already exists for this customer.'
            ]);

            exit;
        }


        $stmt = $pdo->prepare("
            UPDATE customer_services
            SET
                service_name = ?,
                default_amount = ?,
                is_active = ?
            WHERE id = ?
              AND company_id = ?
        ");


        $stmt->execute([
            $serviceName,
            $defaultAmount,
            $isActive ? 1 : 0,
            $serviceId,
            $companyId
        ]);


        echo json_encode([
            'success' => true,
            'message' => 'Service updated successfully.'
        ]);

        exit;
    }


    /*
     * ====================================================
     * DELETE
     * ====================================================
     *
     * Soft delete.
     */

    if ($method === 'DELETE') {

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );


        $serviceId =
            isset($input['id'])
                ? (int) $input['id']
                : 0;


        if ($serviceId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Service ID is required.'
            ]);

            exit;
        }


        $stmt = $pdo->prepare("
            UPDATE customer_services
            SET is_active = 0
            WHERE id = ?
              AND company_id = ?
        ");


        $stmt->execute([
            $serviceId,
            $companyId
        ]);


        if ($stmt->rowCount() === 0) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Service not found.'
            ]);

            exit;
        }


        echo json_encode([
            'success' => true,
            'message' => 'Service archived successfully.'
        ]);

        exit;
    }


    /*
     * ====================================================
     * METHOD NOT ALLOWED
     * ====================================================
     */

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}