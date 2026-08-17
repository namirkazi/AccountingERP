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


    /*
     * =========================================================
     * INPUT
     * =========================================================
     */

    $search =
        trim(
            $_GET['search'] ?? ''
        );


    $dateFrom =
        trim(
            $_GET['date_from'] ?? ''
        );


    $dateTo =
        trim(
            $_GET['date_to'] ?? ''
        );


    /*
     * Accept both:
     *
     * account_ids[]=1
     *
     * and comma-separated values.
     */

    $accountIds =
        $_GET['account_ids']
        ?? [];


    $voucherTypes =
        $_GET['voucher_types']
        ?? [];


    $partyIds =
        $_GET['party_ids']
        ?? [];


    if (!is_array($accountIds)) {

        $accountIds =
            array_filter(
                explode(
                    ',',
                    $accountIds
                )
            );
    }


    if (!is_array($voucherTypes)) {

        $voucherTypes =
            array_filter(
                explode(
                    ',',
                    $voucherTypes
                )
            );
    }


    if (!is_array($partyIds)) {

        $partyIds =
            array_filter(
                explode(
                    ',',
                    $partyIds
                )
            );
    }


    /*
     * Normalize numeric IDs.
     */

    $accountIds =
        array_values(
            array_filter(
                array_map(
                    'intval',
                    $accountIds
                ),
                fn($id) => $id > 0
            )
        );


    $partyIds =
        array_values(
            array_filter(
                array_map(
                    'intval',
                    $partyIds
                ),
                fn($id) => $id > 0
            )
        );


    /*
     * Normalize voucher types.
     */

    $voucherTypes =
        array_values(
            array_filter(
                array_map(
                    function ($type) {
                        return strtoupper(
                            trim(
                                (string) $type
                            )
                        );
                    },
                    $voucherTypes
                )
            )
        );


    /*
     * =========================================================
     * BASE QUERY
     * =========================================================
     *
     * ledger_entries
     *      ↓
     * accounts
     *      ↓
     * vouchers
     *      ↓
     * parties
     *
     */

    $where = [
        'le.company_id = :company_id'
    ];


    $params = [
        ':company_id' => $companyId
    ];


    /*
     * =========================================================
     * ACCOUNT FILTER
     * =========================================================
     */

    if (count($accountIds) > 0) {

        $placeholders = [];

        foreach (
            $accountIds
            as $index => $accountId
        ) {

            $key =
                ':account_' . $index;

            $placeholders[] =
                $key;

            $params[$key] =
                $accountId;
        }


        $where[] =
            'le.account_id IN (' .
            implode(
                ',',
                $placeholders
            ) .
            ')';
    }


    /*
     * =========================================================
     * VOUCHER TYPE FILTER
     * =========================================================
     */

    if (count($voucherTypes) > 0) {

        $placeholders = [];

        foreach (
            $voucherTypes
            as $index => $type
        ) {

            $key =
                ':voucher_type_' . $index;

            $placeholders[] =
                $key;

            $params[$key] =
                $type;
        }


        $where[] =
            'v.voucher_type IN (' .
            implode(
                ',',
                $placeholders
            ) .
            ')';
    }


    /*
     * =========================================================
     * PARTY FILTER
     * =========================================================
     */

    if (count($partyIds) > 0) {

        $placeholders = [];

        foreach (
            $partyIds
            as $index => $partyId
        ) {

            $key =
                ':party_' . $index;

            $placeholders[] =
                $key;

            $params[$key] =
                $partyId;
        }


        $where[] =
            'le.party_id IN (' .
            implode(
                ',',
                $placeholders
            ) .
            ')';
    }


    /*
     * =========================================================
     * DATE FILTER
     * =========================================================
     */

    if ($dateFrom !== '') {

        $where[] =
            'v.voucher_date >= :date_from';

        $params[':date_from'] =
            $dateFrom;
    }


    if ($dateTo !== '') {

        $where[] =
            'v.voucher_date <= :date_to';

        $params[':date_to'] =
            $dateTo;
    }


    /*
     * =========================================================
     * GLOBAL SEARCH
     * =========================================================
     *
     * Search:
     *
     * - voucher number / reference
     * - voucher type
     * - narration
     * - account name
     * - account type
     * - account subtype
     * - party name
     * - party type
     * - phone
     * - email
     * - debit
     * - credit
     * - voucher amount
     *
     */

    if ($search !== '') {

        $searchConditions = [];


        $searchFields = [

            'v.reference_number',

            'v.voucher_type',

            'v.narration',

            'a.account_name',

            'a.account_type',

            'a.account_subtype',

            'p.party_name',

            'p.party_type',

            'p.phone',

            'p.email'

        ];


        foreach (
            $searchFields
            as $index => $field
        ) {

            $key =
                ':search_' . $index;

            $searchConditions[] =
                $field . ' LIKE ' . $key;

            $params[$key] =
                '%' . $search . '%';
        }


        /*
         * Amount search.
         *
         * This lets:
         *
         * 20000
         * 20,000
         * 20000.00
         *
         * find amount entries.
         */

        $numericSearch =
            str_replace(
                ',',
                '',
                $search
            );


        if (
            is_numeric(
                $numericSearch
            )
        ) {

            $amount =
                (float)
                $numericSearch;


            $params[':search_amount'] =
                $amount;


            $searchConditions[] =
                'le.debit = :search_amount';


            $searchConditions[] =
                'le.credit = :search_amount';


            $searchConditions[] =
                'v.amount = :search_amount';
        }


        $where[] =
            '(' .
            implode(
                ' OR ',
                $searchConditions
            ) .
            ')';
    }


    /*
     * =========================================================
     * MAIN QUERY
     * =========================================================
     */

    $whereSql =
        implode(
            ' AND ',
            $where
        );


    $sql = "

        SELECT

            le.id,

            le.company_id,

            le.voucher_id,

            le.account_id,

            le.party_id,

            le.debit,

            le.credit,


            v.voucher_type,

            v.voucher_date,

            v.reference_number,

            v.amount AS voucher_amount,

            v.vat_input,

            v.narration,

            v.source_voucher_id,


            a.account_name,

            a.account_type,

            a.account_subtype,


            p.party_name,

            p.party_type,

            p.phone AS party_phone,

            p.email AS party_email


        FROM ledger_entries le


        INNER JOIN vouchers v
            ON v.id = le.voucher_id
            AND v.company_id = le.company_id


        INNER JOIN accounts a
            ON a.id = le.account_id
            AND a.company_id = le.company_id


        LEFT JOIN parties p
            ON p.id = le.party_id
            AND p.company_id = le.company_id


        WHERE {$whereSql}


        ORDER BY

            v.voucher_date DESC,

            le.voucher_id DESC,

            le.id ASC

    ";


    $stmt =
        $pdo->prepare(
            $sql
        );


    $stmt->execute(
        $params
    );


    $entries =
        $stmt->fetchAll();


    /*
     * =========================================================
     * FORMAT ENTRIES
     * =========================================================
     */

    foreach (
        $entries
        as &$entry
    ) {

        $entry['id'] =
            (int)
            $entry['id'];


        $entry['voucher_id'] =
            (int)
            $entry['voucher_id'];


        $entry['account_id'] =
            (int)
            $entry['account_id'];


        $entry['party_id'] =
            $entry['party_id'] !== null
                ? (int)
                    $entry['party_id']
                : null;


        $entry['debit'] =
            (float)
            $entry['debit'];


        $entry['credit'] =
            (float)
            $entry['credit'];


        $entry['voucher_amount'] =
            (float)
            $entry['voucher_amount'];


        $entry['vat_input'] =
            (float)
            $entry['vat_input'];


        /*
         * The ERP calls reference_number
         * the actual bill/voucher number.
         */

        $entry['voucher_number'] =
            $entry['reference_number'];
    }


    unset($entry);


    /*
     * =========================================================
     * TOTALS
     * =========================================================
     */

    $totalDebit = 0;

    $totalCredit = 0;


    foreach (
        $entries
        as $entry
    ) {

        $totalDebit +=
            (float)
            $entry['debit'];


        $totalCredit +=
            (float)
            $entry['credit'];
    }


    /*
     * =========================================================
     * FILTER OPTIONS
     * =========================================================
     *
     * Return these from the same endpoint so the frontend
     * doesn't need separate requests just to populate filters.
     *
     */


    /*
     * ACCOUNTS
     */

    $accountStmt =
        $pdo->prepare("

            SELECT

                id,

                account_name,

                account_type,

                account_subtype

            FROM accounts

            WHERE company_id =
                :company_id

            ORDER BY
                account_name ASC

        ");


    $accountStmt->execute([
        ':company_id' =>
            $companyId
    ]);


    $accounts =
        $accountStmt->fetchAll();


    foreach (
        $accounts
        as &$account
    ) {

        $account['id'] =
            (int)
            $account['id'];
    }


    unset($account);


    /*
     * PARTIES
     */

    $partyStmt =
        $pdo->prepare("

            SELECT

                id,

                party_name,

                party_type

            FROM parties

            WHERE company_id =
                :company_id

            ORDER BY
                party_name ASC

        ");


    $partyStmt->execute([
        ':company_id' =>
            $companyId
    ]);


    $parties =
        $partyStmt->fetchAll();


    foreach (
        $parties
        as &$party
    ) {

        $party['id'] =
            (int)
            $party['id'];
    }


    unset($party);


    /*
     * =========================================================
     * RESPONSE
     * =========================================================
     */

    echo json_encode([

        'success' => true,

        'data' => [

            'entries' =>
                $entries,

            'totals' => [

                'debit' =>
                    round(
                        $totalDebit,
                        2
                    ),

                'credit' =>
                    round(
                        $totalCredit,
                        2
                    )

            ],

            'filters' => [

                'accounts' =>
                    $accounts,

                'parties' =>
                    $parties

            ]

        ]

    ]);


} catch (Throwable $e) {

    error_log(
        'Ledger API error: ' .
        $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>
            $e->getMessage()

    ]);
}