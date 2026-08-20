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

    $companyId = getCurrentCompanyId();

    $search = trim(
        $_GET['search'] ?? ''
    );

    if ($search === '') {

        echo json_encode([
            'success' => true,
            'data' => [
                'expenses' => []
            ]
        ]);

        exit;
    }


    /*
     * Find EXPENSE vouchers.
     *
     * Search supports:
     * - expense narration
     * - reference number
     * - party name
     * - voucher ID
     */

    $stmt = $pdo->prepare("
        SELECT
            e.id,
            e.voucher_date,
            e.reference_number,
            e.party_id,
            e.amount,
            e.narration,

            p.party_name,

            COALESCE(
                (
                    SELECT SUM(pay.amount)
                    FROM vouchers pay
                    WHERE pay.company_id = e.company_id
                    AND pay.voucher_type = 'PAYMENT'
                    AND pay.source_voucher_id = e.id
                ),
                0
            ) AS paid_amount

        FROM vouchers e

        LEFT JOIN parties p
            ON p.id = e.party_id
            AND p.company_id = e.company_id

        WHERE e.company_id = :company_id

AND e.voucher_type = 'EXPENSE'

AND (
    e.narration LIKE :search_narration
    OR e.reference_number LIKE :search_reference
    OR e.bill_reference LIKE :search_bill_reference
    OR p.party_name LIKE :search_party
    OR CAST(e.id AS CHAR) LIKE :search_id
)

AND e.amount > COALESCE(
    (
        SELECT SUM(pay.amount)
        FROM vouchers pay
        WHERE pay.company_id = e.company_id
        AND pay.voucher_type = 'PAYMENT'
        AND pay.source_voucher_id = e.id
    ),
    0
)

        ORDER BY
            e.voucher_date DESC,
            e.id DESC

        LIMIT 30
    ");

    $searchValue = '%' . $search . '%';

    $stmt->execute([
        ':company_id' => $companyId,
        ':search_narration' => $searchValue,
        ':search_reference' => $searchValue,
        ':search_bill_reference' => $searchValue,
        ':search_party' => $searchValue,
        ':search_id' => $searchValue
    ]);

    $expenses = $stmt->fetchAll();


    foreach ($expenses as &$expense) {

        $expense['amount'] =
            (float) $expense['amount'];

        $expense['paid_amount'] =
            (float) $expense['paid_amount'];

        $expense['outstanding_amount'] =
            $expense['amount']
            - $expense['paid_amount'];


        if (
            $expense['outstanding_amount'] <= 0.0001
        ) {

            $expense['outstanding_amount'] = 0;

            $expense['status'] = 'PAID';
        } elseif (
            $expense['paid_amount'] > 0
        ) {

            $expense['status'] =
                'PARTIALLY_PAID';
        } else {

            $expense['status'] =
                'PENDING';
        }
    }


    echo json_encode([
        'success' => true,

        'data' => [
            'expenses' => $expenses
        ]
    ]);
} catch (Throwable $e) {

    error_log(
        'Payment expense search error: '
            . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
