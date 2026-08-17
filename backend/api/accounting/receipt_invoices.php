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
                'invoices' => []
            ]
        ]);

        exit;
    }


    /*
     * =====================================================
     * FIND OUTSTANDING SALES INVOICES
     *
     * Sales:
     *     Dr Accounts Receivable
     *     Cr Sales
     *
     * Receipts against that sale:
     *     Dr Cash / Bank
     *     Cr Accounts Receivable
     *
     * source_voucher_id links the Receipt back to the Sale.
     * =====================================================
     */

    $stmt = $pdo->prepare("
        SELECT
            s.id,
            s.voucher_date,
            s.reference_number AS invoice_number,
            s.party_id,
            s.amount,
            s.narration,

            p.party_name,

            COALESCE(
                (
                    SELECT SUM(r.amount)
                    FROM vouchers r
                    WHERE r.company_id = s.company_id
                    AND r.voucher_type = 'RECEIPT'
                    AND r.source_voucher_id = s.id
                ),
                0
            ) AS received_amount

        FROM vouchers s

        INNER JOIN parties p
            ON p.id = s.party_id
            AND p.company_id = s.company_id

        WHERE s.company_id = :company_id

        AND s.voucher_type = 'SALE'

        AND p.party_name LIKE :search_party

        AND s.amount > COALESCE(
            (
                SELECT SUM(r.amount)
                FROM vouchers r
                WHERE r.company_id = s.company_id
                AND r.voucher_type = 'RECEIPT'
                AND r.source_voucher_id = s.id
            ),
            0
        )

        ORDER BY
            s.voucher_date DESC,
            s.id DESC

        LIMIT 30
    ");

    $searchValue = '%' . $search . '%';

    $stmt->execute([
        ':company_id' => $companyId,
        ':search_party' => $searchValue
    ]);

    $invoices = $stmt->fetchAll();


    foreach ($invoices as &$invoice) {

        $invoice['amount'] =
            (float) $invoice['amount'];

        $invoice['received_amount'] =
            (float) $invoice['received_amount'];

        $invoice['outstanding_amount'] =
            $invoice['amount']
            - $invoice['received_amount'];


        if (
            $invoice['outstanding_amount'] <= 0.0001
        ) {

            $invoice['outstanding_amount'] = 0;

            $invoice['status'] = 'RECEIVED';

        } elseif (
            $invoice['received_amount'] > 0
        ) {

            $invoice['status'] = 'PARTIALLY_RECEIVED';

        } else {

            $invoice['status'] = 'PENDING';

        }
    }

    unset($invoice);


    echo json_encode([
        'success' => true,

        'data' => [
            'invoices' => $invoices
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Receipt invoice search error: '
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}