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

    $search = trim($_GET['search'] ?? '');
    $dateFrom = trim($_GET['date_from'] ?? '');
    $dateTo = trim($_GET['date_to'] ?? '');

    $accountIds = $_GET['account_ids'] ?? [];
    $voucherTypes = $_GET['voucher_types'] ?? [];
    $partyIds = $_GET['party_ids'] ?? [];

    if (!is_array($accountIds)) {
        $accountIds = array_filter(explode(',', $accountIds));
    }

    if (!is_array($voucherTypes)) {
        $voucherTypes = array_filter(explode(',', $voucherTypes));
    }

    if (!is_array($partyIds)) {
        $partyIds = array_filter(explode(',', $partyIds));
    }

    $accountIds = array_values(array_filter(
        array_map('intval', $accountIds),
        fn($id) => $id > 0
    ));

    $partyIds = array_values(array_filter(
        array_map('intval', $partyIds),
        fn($id) => $id > 0
    ));

    $voucherTypes = array_values(array_filter(
        array_map(
            fn($type) => strtoupper(trim((string) $type)),
            $voucherTypes
        )
    ));

    /*
     * IMPORTANT:
     *
     * The ledger UI is voucher-based.
     *
     * ledger_entries is still the source of double-entry accounting,
     * but it is aggregated to ONE row per voucher here. This prevents
     * one Expense/Sale/Payment/Receipt from appearing once per ledger line.
     */

    $where = [
        'v.company_id = :company_id'
    ];

    /*
     * The Ledger table is a voucher register, so expense bills remain
     * visible there. Expense bills are not included in the debit/credit
     * summary because the actual double-entry settlement happens through
     * the later PAYMENT voucher.
     */
    $totalsWhere = [
        'v.company_id = :company_id'
    ];

    $params = [
        ':company_id' => $companyId
    ];

    if (count($voucherTypes) > 0) {
        $placeholders = [];

        foreach ($voucherTypes as $index => $type) {
            $key = ':voucher_type_' . $index;
            $placeholders[] = $key;
            $params[$key] = $type;
        }

        $voucherTypeFilter =
            'v.voucher_type IN (' . implode(',', $placeholders) . ')';

        $where[] = $voucherTypeFilter;
        $totalsWhere[] = $voucherTypeFilter;
    }

    if (count($partyIds) > 0) {
        $placeholders = [];

        foreach ($partyIds as $index => $partyId) {
            $key = ':party_' . $index;
            $placeholders[] = $key;
            $params[$key] = $partyId;
        }

        $partyFilter =
            'v.party_id IN (' . implode(',', $placeholders) . ')';

        $where[] = $partyFilter;
        $totalsWhere[] = $partyFilter;
    }

    if (count($accountIds) > 0) {
        $placeholders = [];

        foreach ($accountIds as $index => $accountId) {
            $key = ':account_' . $index;
            $placeholders[] = $key;
            $params[$key] = $accountId;
        }

        $accountFilter = '
            EXISTS (
                SELECT 1
                FROM ledger_entries totals_filter_le
                WHERE totals_filter_le.voucher_id = v.id
                  AND totals_filter_le.company_id = v.company_id
                  AND totals_filter_le.account_id IN (' . implode(',', $placeholders) . ')
            )
        ';

        $where[] = '
            EXISTS (
                SELECT 1
                FROM ledger_entries filter_le
                WHERE filter_le.voucher_id = v.id
                  AND filter_le.company_id = v.company_id
                  AND filter_le.account_id IN (' . implode(',', $placeholders) . ')
            )
        ';

        $totalsWhere[] = $accountFilter;
    }

    if ($dateFrom !== '') {
        $where[] = 'v.voucher_date >= :date_from';
        $totalsWhere[] = 'v.voucher_date >= :date_from';
        $params[':date_from'] = $dateFrom;
    }

    if ($dateTo !== '') {
        $where[] = 'v.voucher_date <= :date_to';
        $totalsWhere[] = 'v.voucher_date <= :date_to';
        $params[':date_to'] = $dateTo;
    }

    if ($search !== '') {
        $searchFields = [
            'v.reference_number',
            'v.bill_reference',
            'v.voucher_type',
            'v.narration',
            'p.party_name',
            'p.party_type',
            'p.phone',
            'p.email'
        ];

        $searchConditions = [];

        foreach ($searchFields as $index => $field) {
            $key = ':search_' . $index;
            $searchConditions[] = $field . ' LIKE ' . $key;
            $params[$key] = '%' . $search . '%';
        }

        /* Account names are searched through EXISTS so they do not create rows. */
        $params[':search_account_name'] = '%' . $search . '%';
        $params[':search_account_type'] = '%' . $search . '%';
        $params[':search_account_subtype'] = '%' . $search . '%';
        $params[':search_item_description'] = '%' . $search . '%';
        $searchConditions[] = '
            EXISTS (
                SELECT 1
                FROM ledger_entries search_le
                INNER JOIN accounts search_a
                    ON search_a.id = search_le.account_id
                   AND search_a.company_id = search_le.company_id
                WHERE search_le.voucher_id = v.id
                  AND search_le.company_id = v.company_id
                  AND (
                      search_a.account_name LIKE :search_account_name
                      OR search_a.account_type LIKE :search_account_type
                      OR search_a.account_subtype LIKE :search_account_subtype
                  )
            )
        ';

        $searchConditions[] = '
            EXISTS (
                SELECT 1
                FROM voucher_items search_vi
                WHERE search_vi.voucher_id = v.id
                  AND search_vi.description LIKE :search_item_description
            )
        ';

        $numericSearch = str_replace(',', '', $search);

        if (is_numeric($numericSearch)) {
            $params[':search_amount'] = (float) $numericSearch;
            $searchConditions[] = 'v.amount = :search_amount';
        }

        $searchSql =
            '(' . implode(' OR ', $searchConditions) . ')';

        $where[] = $searchSql;
        $totalsWhere[] = $searchSql;
    }

    $whereSql = implode(' AND ', $where);
    $totalsWhereSql = implode(' AND ', $totalsWhere);

    $sql = "
        SELECT
            v.id AS voucher_id,
            v.company_id,
            v.voucher_type,
            v.voucher_date,
            v.reference_number,
            v.bill_reference,
            v.amount AS voucher_amount,
            v.vat_input,
            v.vat_output,
            v.narration,
            v.source_voucher_id,
            v.party_id,

            CASE
    WHEN v.voucher_type IN ('EXPENSE', 'SALE') THEN
        (
            SELECT GROUP_CONCAT(
                vi.description
                ORDER BY vi.id ASC
                SEPARATOR ', '
            )
            FROM voucher_items vi
            WHERE vi.voucher_id = v.id
        )

    WHEN v.voucher_type IN ('PAYMENT', 'RECEIPT') THEN
        p.party_name

    ELSE
        v.narration
END AS particulars,

p.party_name,
p.party_type,
p.phone AS party_phone,
p.email AS party_email,

COALESCE(SUM(le.debit), 0) AS debit,
COALESCE(SUM(le.credit), 0) AS credit

        FROM vouchers v

        INNER JOIN ledger_entries le
            ON le.voucher_id = v.id
            AND le.company_id = v.company_id

        LEFT JOIN accounts a
            ON a.id = le.account_id
            AND a.company_id = le.company_id

        LEFT JOIN parties p
            ON p.id = v.party_id
            AND p.company_id = v.company_id

        WHERE {$whereSql}

        GROUP BY
            v.id,
            v.company_id,
            v.voucher_type,
            v.voucher_date,
            v.reference_number,
            v.bill_reference,
            v.amount,
            v.vat_input,
            v.vat_output,
            v.narration,
            v.source_voucher_id,
            v.party_id,
            p.party_name,
            p.party_type,
            p.phone,
            p.email

        ORDER BY
            v.voucher_date DESC,
            v.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $entries = $stmt->fetchAll();
    /*
|--------------------------------------------------------------------------
| VOUCHER ATTACHMENT ENDPOINT
|--------------------------------------------------------------------------
|
| Used by Ledger rows to open the original uploaded
| supplier bill / reference document.
|
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
                        ?? '/api/accounting/ledger.php'
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
| PAYMENT -> SUPPLIER REFERENCE BILLS
|--------------------------------------------------------------------------
|
| A Payment does not own the supplier bill attachment.
|
| Instead:
|
| PAYMENT
|   -> payment_allocations
|   -> EXPENSE
|   -> voucher_attachments
|
| Legacy single-bill Payments use source_voucher_id.
|
*/


    $paymentVoucherIds = [];


    foreach ($entries as $rawEntry) {

        if (
            strtoupper(
                (string) (
                    $rawEntry['voucher_type']
                    ?? ''
                )
            ) !== 'PAYMENT'
        ) {
            continue;
        }


        $paymentVoucherId =
            (int) (
                $rawEntry['voucher_id']
                ?? 0
            );


        if ($paymentVoucherId > 0) {

            $paymentVoucherIds[] =
                $paymentVoucherId;
        }
    }


    $paymentVoucherIds =
        array_values(
            array_unique(
                $paymentVoucherIds
            )
        );


    $paymentReferenceBills = [];


    /*
|--------------------------------------------------------------------------
| NEW ALLOCATION-BASED PAYMENTS
|--------------------------------------------------------------------------
*/

    $paymentsWithAllocations = [];


    if (count($paymentVoucherIds) > 0) {

        $paymentPlaceholders =
            implode(
                ',',
                array_fill(
                    0,
                    count($paymentVoucherIds),
                    '?'
                )
            );


        $paymentReferenceStmt =
            $pdo->prepare("
            SELECT
                pa.payment_voucher_id,

                e.id AS expense_id,

                e.reference_number,

                e.bill_reference,

                va.id AS attachment_id,

                va.original_name AS attachment_name,

                va.mime_type AS attachment_mime_type,

                va.file_size AS attachment_file_size


            FROM payment_allocations pa


            INNER JOIN vouchers e
                ON e.id = pa.expense_voucher_id

                AND e.company_id = pa.company_id

                AND e.voucher_type = 'EXPENSE'


            LEFT JOIN voucher_attachments va
                ON va.id = (

                    SELECT va_latest.id

                    FROM voucher_attachments va_latest

                    WHERE va_latest.voucher_id = e.id

                    ORDER BY va_latest.id DESC

                    LIMIT 1
                )


            WHERE pa.company_id = ?

            AND pa.payment_voucher_id IN (
                {$paymentPlaceholders}
            )


            ORDER BY
                pa.payment_voucher_id ASC,
                pa.id ASC
        ");


        $paymentReferenceStmt->execute(
            array_merge(
                [$companyId],
                $paymentVoucherIds
            )
        );


        $allocationReferenceRows =
            $paymentReferenceStmt->fetchAll(
                PDO::FETCH_ASSOC
            );


        foreach (
            $allocationReferenceRows
            as $referenceRow
        ) {

            $paymentVoucherId =
                (int) (
                    $referenceRow['payment_voucher_id']
                    ?? 0
                );


            if ($paymentVoucherId <= 0) {
                continue;
            }


            /*
         * Important:
         *
         * Mark the Payment as allocation-based even if
         * this particular Expense has no attachment.
         *
         * That prevents source_voucher_id from being
         * counted as a second reference.
         */

            $paymentsWithAllocations[$paymentVoucherId] = true;


            $attachmentId =
                (int) (
                    $referenceRow['attachment_id']
                    ?? 0
                );


            /*
         * No supplier document was uploaded for
         * this Expense.
         */

            if (
                $attachmentId <= 0 ||
                $attachmentEndpoint === ''
            ) {
                continue;
            }


            if (
                !isset(
                    $paymentReferenceBills[$paymentVoucherId]
                )
            ) {

                $paymentReferenceBills[$paymentVoucherId] = [];
            }


            $paymentReferenceBills[$paymentVoucherId][] = [

                'expense_id' =>
                (int) (
                    $referenceRow['expense_id']
                    ?? 0
                ),

                'reference_number' =>
                $referenceRow['reference_number']
                    ?? '',

                /*
             * Supplier's own invoice / bill reference.
             *
             * This is the label we want to display.
             */
                'bill_reference' =>
                $referenceRow['bill_reference']
                    ?? '',

                'attachment' => [

                    'id' =>
                    $attachmentId,

                    'name' =>
                    $referenceRow['attachment_name']
                        ?? 'Supplier Bill',

                    'mime_type' =>
                    $referenceRow['attachment_mime_type']
                        ?? '',

                    'file_size' =>
                    (int) (
                        $referenceRow['attachment_file_size']
                        ?? 0
                    ),

                    'url' =>
                    $attachmentEndpoint
                        . '?id='
                        . rawurlencode(
                            (string)
                            $attachmentId
                        )

                ]

            ];
        }


        /*
    |--------------------------------------------------------------------------
    | LEGACY SINGLE-BILL PAYMENTS
    |--------------------------------------------------------------------------
    |
    | Older Payments may not have payment_allocations.
    |
    | Those use:
    |
    | payment.source_voucher_id -> Expense
    |
    */


        $legacyPaymentIds =
            array_values(
                array_filter(
                    $paymentVoucherIds,
                    fn($paymentVoucherId) =>
                    !isset(
                        $paymentsWithAllocations[$paymentVoucherId]
                    )
                )
            );


        if (
            count($legacyPaymentIds) > 0
        ) {

            $legacyPlaceholders =
                implode(
                    ',',
                    array_fill(
                        0,
                        count(
                            $legacyPaymentIds
                        ),
                        '?'
                    )
                );


            $legacyReferenceStmt =
                $pdo->prepare("
                SELECT
                    pay.id AS payment_voucher_id,

                    e.id AS expense_id,

                    e.reference_number,

                    e.bill_reference,

                    va.id AS attachment_id,

                    va.original_name AS attachment_name,

                    va.mime_type AS attachment_mime_type,

                    va.file_size AS attachment_file_size


                FROM vouchers pay


                INNER JOIN vouchers e
                    ON e.id = pay.source_voucher_id

                    AND e.company_id = pay.company_id

                    AND e.voucher_type = 'EXPENSE'


                LEFT JOIN voucher_attachments va
                    ON va.id = (

                        SELECT va_latest.id

                        FROM voucher_attachments va_latest

                        WHERE va_latest.voucher_id = e.id

                        ORDER BY va_latest.id DESC

                        LIMIT 1
                    )


                WHERE pay.company_id = ?

                AND pay.voucher_type = 'PAYMENT'

                AND pay.id IN (
                    {$legacyPlaceholders}
                )
            ");


            $legacyReferenceStmt->execute(
                array_merge(
                    [$companyId],
                    $legacyPaymentIds
                )
            );


            $legacyReferenceRows =
                $legacyReferenceStmt->fetchAll(
                    PDO::FETCH_ASSOC
                );


            foreach (
                $legacyReferenceRows
                as $referenceRow
            ) {

                $paymentVoucherId =
                    (int) (
                        $referenceRow['payment_voucher_id']
                        ?? 0
                    );


                $attachmentId =
                    (int) (
                        $referenceRow['attachment_id']
                        ?? 0
                    );


                if (
                    $paymentVoucherId <= 0 ||
                    $attachmentId <= 0 ||
                    $attachmentEndpoint === ''
                ) {
                    continue;
                }


                if (
                    !isset(
                        $paymentReferenceBills[$paymentVoucherId]
                    )
                ) {

                    $paymentReferenceBills[$paymentVoucherId] = [];
                }


                $paymentReferenceBills[$paymentVoucherId][] = [

                    'expense_id' =>
                    (int) (
                        $referenceRow['expense_id']
                        ?? 0
                    ),

                    'reference_number' =>
                    $referenceRow['reference_number']
                        ?? '',

                    'bill_reference' =>
                    $referenceRow['bill_reference']
                        ?? '',

                    'attachment' => [

                        'id' =>
                        $attachmentId,

                        'name' =>
                        $referenceRow['attachment_name']
                            ?? 'Supplier Bill',

                        'mime_type' =>
                        $referenceRow['attachment_mime_type']
                            ?? '',

                        'file_size' =>
                        (int) (
                            $referenceRow['attachment_file_size']
                            ?? 0
                        ),

                        'url' =>
                        $attachmentEndpoint
                            . '?id='
                            . rawurlencode(
                                (string)
                                $attachmentId
                            )

                    ]

                ];
            }
        }
    }
    foreach ($entries as &$entry) {
        $entry['id'] = (int) $entry['voucher_id'];
        $entry['voucher_id'] = (int) $entry['voucher_id'];
        $entry['party_id'] = $entry['party_id'] !== null
            ? (int) $entry['party_id']
            : null;
        $entry['voucher_amount'] = (float) $entry['voucher_amount'];
        $entry['debit'] = (float) $entry['debit'];
        $entry['credit'] = (float) $entry['credit'];
        $entry['vat_input'] = (float) $entry['vat_input'];
        $entry['vat_output'] = (float) $entry['vat_output'];
        /*
|--------------------------------------------------------------------------
| PAYMENT REFERENCE BILLS
|--------------------------------------------------------------------------
*/

        $entry['reference_bills'] = [];


        if (
            strtoupper(
                (string) (
                    $entry['voucher_type']
                    ?? ''
                )
            ) === 'PAYMENT'
        ) {

            $paymentVoucherId =
                (int) $entry['voucher_id'];


            $entry['reference_bills'] =
                $paymentReferenceBills[$paymentVoucherId]
                ?? [];
        }
        // Keep both names for existing frontend consumers.
        $entry['voucher_number'] = $entry['reference_number'];
        $entry['referenceNumber'] = $entry['reference_number'];
        $entry['billReference'] = $entry['bill_reference'];
        $entry['particulars'] =
            trim(
                (string) (
                    $entry['particulars'] ?? ''
                )
            );

        if ($entry['particulars'] === '') {
            $entry['particulars'] =
                $entry['narration'] ??
                '—';
        }
    }
    unset($entry);

    /*
     * =========================================================
     * BUSINESS ACTIVITY TOTALS
     * =========================================================
     *
     * The Ledger table contains every voucher, including RECEIPT
     * and PAYMENT settlement vouchers.
     *
     * Summary totals count originating business activity only:
     * SALE -> Sales
     * EXPENSE -> Expenses
     * CAPITAL -> Capital movement
     *
     * RECEIPT and PAYMENT settle existing balances and therefore
     * are not counted again as new sales or expenses.
     */
    $totalsSql = "
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN v.voucher_type = 'SALE'
                        THEN v.amount
                        ELSE 0
                    END
                ),
                0
            ) AS sales,

            COALESCE(
                SUM(
                    CASE
                        WHEN v.voucher_type = 'EXPENSE'
                        THEN v.amount
                        ELSE 0
                    END
                ),
                0
            ) AS expenses,
            COALESCE(
    SUM(
        CASE
            WHEN v.voucher_type = 'PAYMENT'
            THEN v.amount
            ELSE 0
        END
    ),
    0
) AS payments,
 COALESCE(
    SUM(
        CASE
            WHEN v.voucher_type = 'RECEIPT'
            THEN v.amount
            ELSE 0
        END
    ),
    0
) AS receipts,
            COALESCE(
                SUM(
                    CASE
                        WHEN v.voucher_type = 'CAPITAL'
                        THEN v.amount
                        ELSE 0
                    END
                ),
                0
            ) AS capital

        FROM vouchers v

        LEFT JOIN parties p
            ON p.id = v.party_id
            AND p.company_id = v.company_id

        WHERE {$totalsWhereSql}
    ";

    $totalsStmt = $pdo->prepare($totalsSql);
    $totalsStmt->execute($params);
    $totals = $totalsStmt->fetch();

    $totalSales = round(
        (float) ($totals['sales'] ?? 0),
        2
    );

    $totalExpenses = round(
        (float) ($totals['expenses'] ?? 0),
        2
    );
    $totalPayments = round(
        (float) ($totals['payments'] ?? 0),
        2
    );
    $totalReceipts = round(
        (float) ($totals['receipts'] ?? 0),
        2
    );

    $totalCapital = round(
        (float) ($totals['capital'] ?? 0),
        2
    );

    $totalPayable = max(
        0,
        round(
            $totalExpenses - $totalPayments,
            2
        )
    );


    $totalReceivable = max(
        0,
        round(
            $totalSales - $totalReceipts,
            2
        )
    );
    /* Filter options */
    $accountStmt = $pdo->prepare("
        SELECT id, account_name, account_type, account_subtype
        FROM accounts
        WHERE company_id = :company_id
        ORDER BY account_name ASC
    ");
    $accountStmt->execute([':company_id' => $companyId]);
    $accounts = $accountStmt->fetchAll();

    foreach ($accounts as &$account) {
        $account['id'] = (int) $account['id'];
    }
    unset($account);

    $partyStmt = $pdo->prepare("
        SELECT id, party_name, party_type
        FROM parties
        WHERE company_id = :company_id
        ORDER BY party_name ASC
    ");
    $partyStmt->execute([':company_id' => $companyId]);
    $parties = $partyStmt->fetchAll();

    foreach ($parties as &$party) {
        $party['id'] = (int) $party['id'];
    }
    unset($party);

    echo json_encode([
        'success' => true,
        'data' => [
            'entries' => $entries,
            'totals' => [

                'sales' =>
                $totalSales,

                'expenses' =>
                $totalExpenses,

                'payments' =>
                $totalPayments,

                'payable' =>
                $totalPayable,

                'receipts' =>
                $totalReceipts,

                'receivable' =>
                $totalReceivable,

                'capital' =>
                $totalCapital

            ],
            'filters' => [
                'accounts' => $accounts,
                'parties' => $parties
            ]
        ]
    ]);
} catch (Throwable $e) {
    error_log('Ledger API error: ' . $e->getMessage());
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
