<?php

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';

header('Content-Type: application/json');


try {

    $companyId =
        getCurrentCompanyId();


    /*
     * =========================================================
     * GET - SEARCH INVESTORS
     * =========================================================
     */

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        $search =
            trim(
                $_GET['search'] ?? ''
            );


        $sql = "
            SELECT
                id,
                investor_name,
                phone,
                email,
                status

            FROM investors

            WHERE company_id =
                :company_id

            AND status = 'active'
        ";


        $params = [
            ':company_id' =>
            $companyId
        ];


        if ($search !== '') {
            $sql .= "
        AND (
            investor_name LIKE :search_name
            OR phone LIKE :search_phone
            OR email LIKE :search_email
        )
    ";

            $params[':search_name'] =
                '%' . $search . '%';

            $params[':search_phone'] =
                '%' . $search . '%';

            $params[':search_email'] =
                '%' . $search . '%';
        }


        $sql .= "
            ORDER BY investor_name ASC
            LIMIT 25
        ";


        $stmt =
            $pdo->prepare($sql);


        $stmt->execute(
            $params
        );


        $investors =
            $stmt->fetchAll();


        foreach (
            $investors
            as &$investor
        ) {

            $investor['id'] =
                (int)
                $investor['id'];

            /*
             * PartySelector expects party_name.
             */

            $investor['party_name'] =
                $investor['investor_name'];

            $investor['party_type'] =
                'investor';
        }


        unset($investor);


        echo json_encode([
            'success' => true,

            'data' => [
                'parties' =>
                $investors
            ]
        ]);

        exit;
    }


    /*
     * =========================================================
     * POST - CREATE INVESTOR
     * =========================================================
     */

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        $input =
            json_decode(
                file_get_contents(
                    'php://input'
                ),
                true
            );


        if (!is_array($input)) {

            throw new Exception(
                'Invalid request.'
            );
        }


        $name =
            trim(
                $input['name'] ?? ''
            );


        $phone =
            trim(
                $input['phone'] ?? ''
            );


        $email =
            trim(
                $input['email'] ?? ''
            );


        if ($name === '') {

            throw new Exception(
                'Investor name is required.'
            );
        }


        $stmt =
            $pdo->prepare("
                INSERT INTO investors (
                    company_id,
                    investor_name,
                    phone,
                    email,
                    status
                )
                VALUES (
                    :company_id,
                    :investor_name,
                    :phone,
                    :email,
                    'active'
                )
            ");


        $stmt->execute([

            ':company_id' =>
            $companyId,

            ':investor_name' =>
            $name,

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
            (int)
            $pdo->lastInsertId();


        $investorStmt =
            $pdo->prepare("
                SELECT
                    id,
                    investor_name,
                    phone,
                    email,
                    status

                FROM investors

                WHERE id =
                    :id

                AND company_id =
                    :company_id

                LIMIT 1
            ");


        $investorStmt->execute([

            ':id' =>
            $id,

            ':company_id' =>
            $companyId

        ]);


        $investor =
            $investorStmt->fetch();


        if (!$investor) {

            throw new Exception(
                'Investor was created but could not be loaded.'
            );
        }


        $investor['id'] =
            (int)
            $investor['id'];

        $investor['party_name'] =
            $investor['investor_name'];

        $investor['party_type'] =
            'investor';


        echo json_encode([

            'success' => true,

            'message' =>
            'Investor created successfully.',

            'data' => [
                'party' =>
                $investor
            ]

        ]);

        exit;
    }


    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' =>
        'Method not allowed.'
    ]);
} catch (Throwable $e) {

    error_log(
        'Investor API error: ' .
            $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([
        'success' => false,
        'message' =>
        $e->getMessage()
    ]);
}
