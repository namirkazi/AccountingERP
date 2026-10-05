<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/fund_auth.php';


requireFundRole([
    'admin',
    'operator'
]);


/*
|--------------------------------------------------------------------------
| GET PARTIES
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    try {

        $search =
            trim(
                (string) (
                    $_GET['search']
                    ?? ''
                )
            );


        $sql = "
            SELECT
                id,
                party_name,
                phone,
                email,
                address,
                is_active,
                created_at

            FROM fund_parties

            WHERE is_active = 1
        ";


        $params = [];


        if ($search !== '') {

            $sql .= "
                AND (
                    party_name LIKE :party_name
                    OR phone LIKE :phone
                    OR email LIKE :email
                )
            ";


            $searchValue =
                '%' . $search . '%';


            $params = [

                ':party_name' =>
                $searchValue,

                ':phone' =>
                $searchValue,

                ':email' =>
                $searchValue

            ];
        }


        $sql .= "
            ORDER BY
                party_name ASC

            LIMIT 50
        ";


        $stmt =
            $pdo->prepare($sql);


        $stmt->execute(
            $params
        );


        $parties =
            $stmt->fetchAll(
                PDO::FETCH_ASSOC
            );


        foreach ($parties as &$party) {

            $party['id'] =
                (int) $party['id'];

            $party['is_active'] =
                (int) $party['is_active'];
        }


        unset($party);


        echo json_encode([

            'success' => true,

            'data' => [

                'parties' =>
                $parties

            ]

        ]);

        exit;
    } catch (Throwable $e) {

        error_log(
            'Fund parties error: '
                . $e->getMessage()
        );


        http_response_code(500);


        echo json_encode([

            'success' => false,

            'message' =>
            'Unable to load parties.'

        ]);

        exit;
    }
}


/*
|--------------------------------------------------------------------------
| CREATE PARTY
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    try {

        $data =
            json_decode(
                file_get_contents(
                    'php://input'
                ),
                true
            );


        $partyName =
            trim(
                (string) (
                    $data['party_name']
                    ?? ''
                )
            );


        $phone =
            trim(
                (string) (
                    $data['phone']
                    ?? ''
                )
            );


        $email =
            trim(
                (string) (
                    $data['email']
                    ?? ''
                )
            );


        $address =
            trim(
                (string) (
                    $data['address']
                    ?? ''
                )
            );


        if ($partyName === '') {

            http_response_code(422);


            echo json_encode([

                'success' => false,

                'message' =>
                'Party name is required.'

            ]);

            exit;
        }


        $stmt =
            $pdo->prepare("
                INSERT INTO fund_parties (
                    party_name,
                    phone,
                    email,
                    address,
                    is_active
                )

                VALUES (
                    :party_name,
                    :phone,
                    :email,
                    :address,
                    1
                )
            ");


        $stmt->execute([

            ':party_name' =>
            $partyName,

            ':phone' =>
            $phone !== ''
                ? $phone
                : null,

            ':email' =>
            $email !== ''
                ? $email
                : null,

            ':address' =>
            $address !== ''
                ? $address
                : null

        ]);


        $partyId =
            (int) $pdo->lastInsertId();


        echo json_encode([

            'success' => true,

            'message' =>
            'Party created successfully.',

            'data' => [

                'party' => [

                    'id' =>
                    $partyId,

                    'party_name' =>
                    $partyName,

                    'phone' =>
                    $phone,

                    'email' =>
                    $email,

                    'address' =>
                    $address

                ]

            ]

        ]);

        exit;
    } catch (Throwable $e) {

        error_log(
            'Create fund party error: '
                . $e->getMessage()
        );


        http_response_code(500);


        echo json_encode([

            'success' => false,

            'message' =>
            'Unable to create party.'

        ]);

        exit;
    }
}


http_response_code(405);


echo json_encode([
    'success' => false,
    'message' => 'Method not allowed.'
]);
