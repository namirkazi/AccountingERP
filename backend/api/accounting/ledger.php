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

        $where[] = 'v.voucher_type IN (' . implode(',', $placeholders) . ')';
    }

    if (count($partyIds) > 0) {
        $placeholders = [];

        foreach ($partyIds as $index => $partyId) {
            $key = ':party_' . $index;
            $placeholders[] = $key;
            $params[$key] = $partyId;
        }

        $where[] = 'v.party_id IN (' . implode(',', $placeholders) . ')';
    }

    if (count($accountIds) > 0) {
        $placeholders = [];

        foreach ($accountIds as $index => $accountId) {
            $key = ':account_' . $index;
            $placeholders[] = $key;
            $params[$key] = $accountId;
        }

        $where[] = '
            EXISTS (
                SELECT 1
                FROM ledger_entries filter_le
                WHERE filter_le.voucher_id = v.id
                  AND filter_le.company_id = v.company_id
                  AND filter_le.account_id IN (' . implode(',', $placeholders) . ')
            )
        ';
    }

    if ($dateFrom !== '') {
        $where[] = 'v.voucher_date >= :date_from';
        $params[':date_from'] = $dateFrom;
    }

    if ($dateTo !== '') {
        $where[] = 'v.voucher_date <= :date_to';
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

        $where[] = '(' . implode(' OR ', $searchConditions) . ')';
    }

    $whereSql = implode(' AND ', $where);

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

            COALESCE(
                MAX(
                    CASE
                        WHEN v.voucher_type = 'SALE'
                             AND le.credit > 0
                             AND LOWER(COALESCE(a.account_subtype, '')) IN ('sales', 'revenue')
                        THEN a.account_name

                        WHEN v.voucher_type = 'EXPENSE'
                             AND le.debit > 0
                             AND LOWER(COALESCE(a.account_type, '')) = 'expense'
                        THEN a.account_name

                        WHEN v.voucher_type = 'PAYMENT'
                             AND le.credit > 0
                             AND LOWER(COALESCE(a.account_subtype, '')) IN ('cash', 'bank')
                        THEN a.account_name

                        WHEN v.voucher_type = 'RECEIPT'
                             AND le.debit > 0
                             AND LOWER(COALESCE(a.account_subtype, '')) IN ('cash', 'bank')
                        THEN a.account_name

                        ELSE NULL
                    END
                ),
                MAX(a.account_name)
            ) AS account_name,

            COALESCE(
                MAX(
                    CASE
                        WHEN v.voucher_type = 'SALE'
                             AND le.credit > 0
                             AND LOWER(COALESCE(a.account_subtype, '')) IN ('sales', 'revenue')
                        THEN a.account_subtype

                        WHEN v.voucher_type = 'EXPENSE'
                             AND le.debit > 0
                             AND LOWER(COALESCE(a.account_type, '')) = 'expense'
                        THEN a.account_subtype

                        WHEN v.voucher_type IN ('PAYMENT', 'RECEIPT')
                             AND LOWER(COALESCE(a.account_subtype, '')) IN ('cash', 'bank')
                        THEN a.account_subtype

                        ELSE NULL
                    END
                ),
                MAX(a.account_subtype)
            ) AS account_subtype,

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

    $totalDebit = 0;
    $totalCredit = 0;

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

        // Keep both names for existing frontend consumers.
        $entry['voucher_number'] = $entry['reference_number'];
        $entry['referenceNumber'] = $entry['reference_number'];
        $entry['billReference'] = $entry['bill_reference'];

        $totalDebit += $entry['debit'];
        $totalCredit += $entry['credit'];
    }
    unset($entry);

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
                'debit' => round($totalDebit, 2),
                'credit' => round($totalCredit, 2)
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
