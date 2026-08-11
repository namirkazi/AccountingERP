<?php

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/Customer.php';

$customerModel = new Customer($pdo);

$method = $_SERVER['REQUEST_METHOD'];

$companyId = getCurrentCompanyId();

try {

    switch ($method) {

        case 'GET':

            $search = trim(
                $_GET['search'] ?? ''
            );

            $customers =
                $customerModel->getAll(
                    $companyId,
                    $search
                );

            echo json_encode([
                'success' => true,
                'data' => [
                    'customers' => $customers
                ]
            ]);

            break;


        case 'POST':

            $data = json_decode(
                file_get_contents('php://input'),
                true
            );

            $name = trim(
                $data['customer_name'] ?? ''
            );

            if ($name === '') {

                http_response_code(422);

                echo json_encode([
                    'success' => false,
                    'message' =>
                        'Customer name is required.'
                ]);

                exit;
            }

            $customerId =
                $customerModel->create(
                    $companyId,
                    [
                        'customer_name' => $name,
                        'phone' =>
                            trim($data['phone'] ?? ''),
                        'email' =>
                            trim($data['email'] ?? ''),
                        'address' =>
                            trim($data['address'] ?? ''),
                        'tax_number' =>
                            trim($data['tax_number'] ?? ''),
                        'opening_balance' =>
                            (float) (
                                $data['opening_balance']
                                ?? 0
                            ),
                        'opening_balance_type' =>
                            $data['opening_balance_type']
                            ?? 'none'
                    ]
                );

            $customer =
                $customerModel->findById(
                    $companyId,
                    $customerId
                );

            echo json_encode([
                'success' => true,
                'message' =>
                    'Customer created successfully.',
                'data' => [
                    'customer' => $customer
                ]
            ]);

            break;


        case 'PUT':

            $id = (int) (
                $_GET['id'] ?? 0
            );

            if ($id <= 0) {

                http_response_code(400);

                echo json_encode([
                    'success' => false,
                    'message' =>
                        'Invalid customer ID.'
                ]);

                exit;
            }

            $data = json_decode(
                file_get_contents('php://input'),
                true
            );

            $name = trim(
                $data['customer_name'] ?? ''
            );

            if ($name === '') {

                http_response_code(422);

                echo json_encode([
                    'success' => false,
                    'message' =>
                        'Customer name is required.'
                ]);

                exit;
            }

            $updated =
                $customerModel->update(
                    $companyId,
                    $id,
                    [
                        'customer_name' => $name,
                        'phone' =>
                            trim($data['phone'] ?? ''),
                        'email' =>
                            trim($data['email'] ?? ''),
                        'address' =>
                            trim($data['address'] ?? ''),
                        'tax_number' =>
                            trim($data['tax_number'] ?? ''),
                        'opening_balance' =>
                            (float) (
                                $data['opening_balance']
                                ?? 0
                            ),
                        'opening_balance_type' =>
                            $data['opening_balance_type']
                            ?? 'none'
                    ]
                );

            if (!$updated) {

                http_response_code(404);

                echo json_encode([
                    'success' => false,
                    'message' =>
                        'Customer not found.'
                ]);

                exit;
            }

            $customer =
                $customerModel->findById(
                    $companyId,
                    $id
                );

            echo json_encode([
                'success' => true,
                'message' =>
                    'Customer updated successfully.',
                'data' => [
                    'customer' => $customer
                ]
            ]);

            break;


        case 'DELETE':

            $id = (int) (
                $_GET['id'] ?? 0
            );

            if ($id <= 0) {

                http_response_code(400);

                echo json_encode([
                    'success' => false,
                    'message' =>
                        'Invalid customer ID.'
                ]);

                exit;
            }

            $deleted =
                $customerModel->delete(
                    $companyId,
                    $id
                );

            if (!$deleted) {

                http_response_code(404);

                echo json_encode([
                    'success' => false,
                    'message' =>
                        'Customer not found.'
                ]);

                exit;
            }

            echo json_encode([
                'success' => true,
                'message' =>
                    'Customer deleted successfully.'
            ]);

            break;


        default:

            http_response_code(405);

            echo json_encode([
                'success' => false,
                'message' =>
                    'Method not allowed.'
            ]);
    }

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'A database error occurred.'
    ]);
}