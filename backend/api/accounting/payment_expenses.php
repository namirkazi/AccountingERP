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

            va.id AS attachment_id,
            va.original_name AS attachment_name,
            va.mime_type AS attachment_mime_type,
            va.file_size AS attachment_file_size,

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


        LEFT JOIN voucher_attachments va
            ON va.id = (

                SELECT va_latest.id

                FROM voucher_attachments va_latest

                WHERE va_latest.voucher_id = e.id

                ORDER BY va_latest.id DESC

                LIMIT 1
            )


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
| SOURCE EXPENSE ITEMS
|--------------------------------------------------------------------------
|
| Payment vouchers need the original Expense line items so they can
| display what each supplier bill was for.
|
*/

    $expenseItemsStmt =
        $pdo->prepare("
        SELECT
            id,
            voucher_id,
            supplier_item_id,
            description,
            unit,
            quantity,
            rate,
            amount

        FROM voucher_items

        WHERE voucher_id = :voucher_id

        ORDER BY id ASC
    ");

    /*
|--------------------------------------------------------------------------
| ATTACHMENT ENDPOINT BASE URL
|--------------------------------------------------------------------------
*/

    $forwardedProto =
        $_SERVER['HTTP_X_FORWARDED_PROTO']
        ?? '';


    if ($forwardedProto !== '') {

        $scheme =
            trim(
                explode(
                    ',',
                    $forwardedProto
                )[0]
            );
    } else {

        $scheme =
            (
                !empty($_SERVER['HTTPS']) &&
                $_SERVER['HTTPS'] !== 'off'
            )
            ? 'https'
            : 'http';
    }


    $forwardedHost =
        $_SERVER['HTTP_X_FORWARDED_HOST']
        ?? '';


    if ($forwardedHost !== '') {

        $host =
            trim(
                explode(
                    ',',
                    $forwardedHost
                )[0]
            );
    } else {

        $host =
            $_SERVER['HTTP_HOST']
            ?? '';
    }


    $scriptDirectory =
        rtrim(
            str_replace(
                '\\',
                '/',
                dirname(
                    $_SERVER['SCRIPT_NAME']
                        ?? '/api/accounting/payment_expenses.php'
                )
            ),
            '/'
        );


    $attachmentEndpoint =
        $host !== ''
        ? (
            $scheme
            . '://'
            . $host
            . $scriptDirectory
            . '/voucher_attachment.php'
        )
        : '';
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

        /*
|--------------------------------------------------------------------------
| ITEMS FROM ORIGINAL EXPENSE
|--------------------------------------------------------------------------
*/

        $expenseItemsStmt->execute([
            ':voucher_id' =>
            (int) $expense['id']
        ]);


        $expenseItems =
            $expenseItemsStmt->fetchAll(
                PDO::FETCH_ASSOC
            );


        foreach (
            $expenseItems
            as &$expenseItem
        ) {

            $expenseItem['id'] =
                (int) $expenseItem['id'];

            $expenseItem['voucher_id'] =
                (int) $expenseItem['voucher_id'];

            $expenseItem['supplier_item_id'] =
                $expenseItem['supplier_item_id'] !== null
                ? (int) $expenseItem['supplier_item_id']
                : null;

            $expenseItem['quantity'] =
                (float) $expenseItem['quantity'];

            $expenseItem['rate'] =
                (float) $expenseItem['rate'];

            $expenseItem['amount'] =
                (float) $expenseItem['amount'];
        }


        unset($expenseItem);


        /*
 * Full items are useful if we need them later.
 */

        $expense['items'] =
            $expenseItems;


        /*
 * Ready-made text for the Payment Voucher.
 */

        $expense['items_summary'] =
            implode(
                ', ',
                array_values(
                    array_filter(
                        array_map(
                            fn($item) =>
                            trim(
                                (string) (
                                    $item['description']
                                    ?? ''
                                )
                            ),
                            $expenseItems
                        )
                    )
                )
            );
        $attachmentId =
            (int) (
                $expense['attachment_id']
                ?? 0
            );


        if (
            $attachmentId > 0 &&
            $attachmentEndpoint !== ''
        ) {

            $expense['attachment'] = [

                'id' =>
                $attachmentId,

                'name' =>
                $expense['attachment_name']
                    ?? 'Supplier Bill',

                'mime_type' =>
                $expense['attachment_mime_type']
                    ?? '',

                'file_size' =>
                (int) (
                    $expense['attachment_file_size']
                    ?? 0
                ),

                'url' =>
                $attachmentEndpoint
                    . '?id='
                    . rawurlencode(
                        (string) $attachmentId
                    )

            ];
        } else {

            $expense['attachment'] =
                null;
        }


        /*
 * Internal query fields are no longer needed
 * by the frontend.
 */

        unset(
            $expense['attachment_id'],
            $expense['attachment_name'],
            $expense['attachment_mime_type'],
            $expense['attachment_file_size']
        );

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
