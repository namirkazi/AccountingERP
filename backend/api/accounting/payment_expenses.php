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
    |--------------------------------------------------------------------------
    | FIND OUTSTANDING EXPENSE VOUCHERS
    |--------------------------------------------------------------------------
    |
    | Payments can exist in two forms:
    |
    | 1. Legacy payments
    |    vouchers.source_voucher_id = expense.id
    |
    | 2. Allocation-based payments
    |    payment_allocations.expense_voucher_id = expense.id
    |
    | A payment that has allocation rows must NOT also be counted through
    | source_voucher_id, otherwise a new single-bill payment would be counted
    | twice.
    |
    */

    $stmt = $pdo->prepare("
        SELECT

            e.id,
            e.voucher_date,
            e.reference_number,
            e.bill_reference,
            e.party_id,
            e.amount,
            e.narration,

            p.party_name,

            (
                /*
                |----------------------------------------------------------
                | Legacy payments
                |----------------------------------------------------------
                |
                | Only count source_voucher_id payments that do NOT have
                | rows in payment_allocations.
                |
                */

                COALESCE(
                    (
                        SELECT SUM(pay.amount)

                        FROM vouchers pay

                        WHERE pay.company_id = e.company_id

                        AND pay.voucher_type = 'PAYMENT'

                        AND pay.source_voucher_id = e.id

                        AND NOT EXISTS (
                            SELECT 1

                            FROM payment_allocations pa_check

                            WHERE pa_check.company_id = e.company_id

                            AND pa_check.payment_voucher_id = pay.id
                        )
                    ),
                    0
                )

                +

                /*
                |----------------------------------------------------------
                | New allocation-based payments
                |----------------------------------------------------------
                */

                COALESCE(
                    (
                        SELECT SUM(pa.amount)

                        FROM payment_allocations pa

                        WHERE pa.company_id = e.company_id

                        AND pa.expense_voucher_id = e.id
                    ),
                    0
                )

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


        /*
        |--------------------------------------------------------------------------
        | ONLY RETURN VOUCHERS WITH MONEY STILL OUTSTANDING
        |--------------------------------------------------------------------------
        */

        AND e.amount > (

            /*
            | Legacy payments without allocation rows
            */

            COALESCE(
                (
                    SELECT SUM(pay2.amount)

                    FROM vouchers pay2

                    WHERE pay2.company_id = e.company_id

                    AND pay2.voucher_type = 'PAYMENT'

                    AND pay2.source_voucher_id = e.id

                    AND NOT EXISTS (
                        SELECT 1

                        FROM payment_allocations pa_check2

                        WHERE pa_check2.company_id = e.company_id

                        AND pa_check2.payment_voucher_id = pay2.id
                    )
                ),
                0
            )

            +

            /*
            | Allocation-based payments
            */

            COALESCE(
                (
                    SELECT SUM(pa2.amount)

                    FROM payment_allocations pa2

                    WHERE pa2.company_id = e.company_id

                    AND pa2.expense_voucher_id = e.id
                ),
                0
            )

        )


        ORDER BY

            e.voucher_date DESC,

            e.id DESC


        LIMIT 30
    ");


    $searchValue =
        '%' . $search . '%';


    $stmt->execute([

        ':company_id' =>
        $companyId,

        ':search_narration' =>
        $searchValue,

        ':search_reference' =>
        $searchValue,

        ':search_bill_reference' =>
        $searchValue,

        ':search_party' =>
        $searchValue,

        ':search_id' =>
        $searchValue

    ]);


    $expenses =
        $stmt->fetchAll();


    /*
    |--------------------------------------------------------------------------
    | FORMAT RESPONSE
    |--------------------------------------------------------------------------
    */

    foreach ($expenses as &$expense) {

        $expense['id'] =
            (int) $expense['id'];

        $expense['party_id'] =
            (int) $expense['party_id'];

        $expense['amount'] =
            (float) $expense['amount'];

        $expense['paid_amount'] =
            (float) $expense['paid_amount'];

        $expense['outstanding_amount'] =
            round(
                $expense['amount']
                    -
                    $expense['paid_amount'],
                2
            );


        if (
            $expense['outstanding_amount']
            <= 0.0001
        ) {

            $expense['outstanding_amount'] =
                0;

            $expense['status'] =
                'PAID';
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


    unset($expense);


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' =>
        true,

        'data' => [

            'expenses' =>
            $expenses

        ]

    ]);
} catch (Throwable $e) {

    error_log(
        'Payment expense search error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' =>
        false,

        'message' =>
        $e->getMessage()

    ]);
}
