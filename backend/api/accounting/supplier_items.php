<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

try {

    $companyId = getCurrentCompanyId();
    $userId = getCurrentUserId();

    // rest of the code...


    if (!$companyId) {

        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Company not found.'
        ]);

        exit;
    }


    /*
     * ----------------------------------------------------
     * REQUEST
     * ----------------------------------------------------
     */

    $method =
        $_SERVER['REQUEST_METHOD'];


    /*
     * ====================================================
     * GET
     * ====================================================
     *
     * GET:
     * supplier_items.php?supplier_id=5
     *
     * Returns all active items belonging to
     * that supplier.
     */

    if ($method === 'GET') {

        $supplierId =
            isset($_GET['supplier_id'])
                ? (int) $_GET['supplier_id']
                : 0;


        if ($supplierId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Supplier ID is required.'
            ]);

            exit;
        }


        /*
         * Make absolutely sure the supplier belongs
         * to the current company and is actually
         * a supplier.
         */

        $supplierStmt =
            $pdo->prepare("
                SELECT id
                FROM parties
                WHERE id = ?
                  AND company_id = ?
                  AND party_type = 'supplier'
                LIMIT 1
            ");


        $supplierStmt->execute([
            $supplierId,
            $companyId
        ]);


        if (!$supplierStmt->fetch()) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Supplier not found.'
            ]);

            exit;
        }


        /*
         * Get supplier items.
         */

        $stmt =
            $pdo->prepare("
                SELECT
                    id,
                    supplier_id,
                    item_name,
                    unit,
                    default_rate,
                    is_active,
                    created_at,
                    updated_at
                FROM supplier_items
                WHERE company_id = ?
                  AND supplier_id = ?
                  AND is_active = 1
                ORDER BY item_name ASC
            ");


        $stmt->execute([
            $companyId,
            $supplierId
        ]);


        $items =
            $stmt->fetchAll(
                PDO::FETCH_ASSOC
            );


        echo json_encode([
            'success' => true,
            'items' => $items
        ]);

        exit;
    }


    /*
     * ====================================================
     * POST
     * ====================================================
     *
     * Creates a new item for a supplier.
     */

    if ($method === 'POST') {

        $input =
            json_decode(
                file_get_contents('php://input'),
                true
            );


        $supplierId =
            isset($input['supplier_id'])
                ? (int) $input['supplier_id']
                : 0;


        $itemName =
            trim(
                $input['item_name'] ?? ''
            );


        $unit =
            trim(
                $input['unit'] ?? ''
            );


        $defaultRate =
            isset($input['default_rate'])
                ? (float) $input['default_rate']
                : 0;


        if ($supplierId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Supplier ID is required.'
            ]);

            exit;
        }


        if ($itemName === '') {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Item name is required.'
            ]);

            exit;
        }


        if ($defaultRate < 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Default rate cannot be negative.'
            ]);

            exit;
        }


        /*
         * Verify supplier.
         */

        $supplierStmt =
            $pdo->prepare("
                SELECT id
                FROM parties
                WHERE id = ?
                  AND company_id = ?
                  AND party_type = 'supplier'
                LIMIT 1
            ");


        $supplierStmt->execute([
            $supplierId,
            $companyId
        ]);


        if (!$supplierStmt->fetch()) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Supplier not found.'
            ]);

            exit;
        }


        /*
         * Prevent duplicate item names for
         * the same supplier.
         */

        $existingStmt =
            $pdo->prepare("
                SELECT
                    id,
                    item_name,
                    unit,
                    default_rate,
                    is_active
                FROM supplier_items
                WHERE company_id = ?
                  AND supplier_id = ?
                  AND LOWER(item_name) = LOWER(?)
                LIMIT 1
            ");


        $existingStmt->execute([
            $companyId,
            $supplierId,
            $itemName
        ]);


        $existing =
            $existingStmt->fetch(
                PDO::FETCH_ASSOC
            );


        if ($existing) {

            /*
             * If the item exists but was archived,
             * reactivate it instead of creating
             * another duplicate.
             */

            if ((int) $existing['is_active'] === 0) {

                $updateStmt =
                    $pdo->prepare("
                        UPDATE supplier_items
                        SET
                            item_name = ?,
                            unit = ?,
                            default_rate = ?,
                            is_active = 1
                        WHERE id = ?
                          AND company_id = ?
                    ");


                $updateStmt->execute([
                    $itemName,
                    $unit !== ''
                        ? $unit
                        : null,
                    $defaultRate,
                    $existing['id'],
                    $companyId
                ]);


                $existing['unit'] =
                    $unit !== ''
                        ? $unit
                        : null;

                $existing['default_rate'] =
                    $defaultRate;

                $existing['is_active'] = 1;


                echo json_encode([
                    'success' => true,
                    'message' => 'Item restored.',
                    'item' => $existing
                ]);

                exit;
            }


            http_response_code(409);

            echo json_encode([
                'success' => false,
                'message' => 'This item already exists for this supplier.',
                'item' => $existing
            ]);

            exit;
        }


        /*
         * Create item.
         */

        $stmt =
            $pdo->prepare("
                INSERT INTO supplier_items (
                    company_id,
                    supplier_id,
                    item_name,
                    unit,
                    default_rate,
                    is_active
                )
                VALUES (?, ?, ?, ?, ?, 1)
            ");


        $stmt->execute([
            $companyId,
            $supplierId,
            $itemName,
            $unit !== ''
                ? $unit
                : null,
            $defaultRate
        ]);


        $itemId =
            (int) $pdo->lastInsertId();


        /*
         * Return the newly created item.
         */

        $itemStmt =
            $pdo->prepare("
                SELECT
                    id,
                    supplier_id,
                    item_name,
                    unit,
                    default_rate,
                    is_active,
                    created_at,
                    updated_at
                FROM supplier_items
                WHERE id = ?
                  AND company_id = ?
                LIMIT 1
            ");


        $itemStmt->execute([
            $itemId,
            $companyId
        ]);


        $item =
            $itemStmt->fetch(
                PDO::FETCH_ASSOC
            );


        echo json_encode([
            'success' => true,
            'message' => 'Item created successfully.',
            'item' => $item
        ]);

        exit;
    }


    /*
     * ====================================================
     * PUT
     * ====================================================
     *
     * Updates an existing supplier item.
     */

    if ($method === 'PUT') {

        $input =
            json_decode(
                file_get_contents('php://input'),
                true
            );


        $itemId =
            isset($input['id'])
                ? (int) $input['id']
                : 0;


        $itemName =
            trim(
                $input['item_name'] ?? ''
            );


        $unit =
            trim(
                $input['unit'] ?? ''
            );


        $defaultRate =
            isset($input['default_rate'])
                ? (float) $input['default_rate']
                : 0;


        $isActive =
            isset($input['is_active'])
                ? (int) $input['is_active']
                : 1;


        if ($itemId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Item ID is required.'
            ]);

            exit;
        }


        if ($itemName === '') {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Item name is required.'
            ]);

            exit;
        }


        /*
         * Make sure this item belongs to the
         * current company.
         */

        $checkStmt =
            $pdo->prepare("
                SELECT
                    id,
                    supplier_id
                FROM supplier_items
                WHERE id = ?
                  AND company_id = ?
                LIMIT 1
            ");


        $checkStmt->execute([
            $itemId,
            $companyId
        ]);


        $existing =
            $checkStmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$existing) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Item not found.'
            ]);

            exit;
        }


        /*
         * Prevent duplicate names under the
         * same supplier.
         */

        $duplicateStmt =
            $pdo->prepare("
                SELECT id
                FROM supplier_items
                WHERE company_id = ?
                  AND supplier_id = ?
                  AND LOWER(item_name) = LOWER(?)
                  AND id != ?
                LIMIT 1
            ");


        $duplicateStmt->execute([
            $companyId,
            $existing['supplier_id'],
            $itemName,
            $itemId
        ]);


        if ($duplicateStmt->fetch()) {

            http_response_code(409);

            echo json_encode([
                'success' => false,
                'message' => 'Another item with this name already exists for this supplier.'
            ]);

            exit;
        }


        $stmt =
            $pdo->prepare("
                UPDATE supplier_items
                SET
                    item_name = ?,
                    unit = ?,
                    default_rate = ?,
                    is_active = ?
                WHERE id = ?
                  AND company_id = ?
            ");


        $stmt->execute([
            $itemName,
            $unit !== ''
                ? $unit
                : null,
            $defaultRate,
            $isActive ? 1 : 0,
            $itemId,
            $companyId
        ]);


        echo json_encode([
            'success' => true,
            'message' => 'Item updated successfully.'
        ]);

        exit;
    }


    /*
     * ====================================================
     * DELETE
     * ====================================================
     *
     * We soft-delete the item.
     *
     * This is safer because old vouchers may still
     * reference this item.
     */

    if ($method === 'DELETE') {

        $input =
            json_decode(
                file_get_contents('php://input'),
                true
            );


        $itemId =
            isset($input['id'])
                ? (int) $input['id']
                : 0;


        if ($itemId <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Item ID is required.'
            ]);

            exit;
        }


        $stmt =
            $pdo->prepare("
                UPDATE supplier_items
                SET is_active = 0
                WHERE id = ?
                  AND company_id = ?
            ");


        $stmt->execute([
            $itemId,
            $companyId
        ]);


        if ($stmt->rowCount() === 0) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Item not found.'
            ]);

            exit;
        }


        echo json_encode([
            'success' => true,
            'message' => 'Item archived successfully.'
        ]);

        exit;
    }


    /*
     * ----------------------------------------------------
     * METHOD NOT ALLOWED
     * ----------------------------------------------------
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