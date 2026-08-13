<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


try {

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    $companyId = getCurrentCompanyId();
    $userId = getCurrentUserId();


    // =====================================================
    // READ REQUEST
    // =====================================================

    $data = json_decode(
        file_get_contents('php://input'),
        true
    );


    if (!is_array($data)) {

        throw new Exception(
            'Invalid JSON request.'
        );
    }


    $type = strtolower(
        trim($data['type'] ?? '')
    );


    $date = trim(
        $data['date'] ?? ''
    );


    $partyId = (int) (
        $data['party_id'] ?? 0
    );


    /*
     * IMPORTANT:
     *
     * For Expense:
     *     amount = FINAL BILL TOTAL INCLUDING VAT
     *
     * For Sale / Payment / Receipt:
     *     amount = transaction amount
     */

    $amount = (float) (
        $data['amount'] ?? 0
    );


    $vatInput = (float) (
        $data['vat_input'] ?? 0
    );


    $referenceNumber = trim(
        $data['reference_number'] ?? ''
    );


    /*
     * account_id is ONLY used by:
     *
     *     Payment
     *     Receipt
     *
     * Expense and Sale intentionally send NULL.
     */

    $accountId = (int) (
        $data['account_id'] ?? 0
    );


    $narration = trim(
        $data['narration'] ?? ''
    );


    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    $allowedTypes = [
        'sale',
        'receipt',
        'payment',
        'expense'
    ];


    if (!in_array(
        $type,
        $allowedTypes,
        true
    )) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid transaction type.'
        ]);

        exit;
    }


    if ($date === '') {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Transaction date is required.'
        ]);

        exit;
    }


    if ($amount <= 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Amount must be greater than zero.'
        ]);

        exit;
    }


    if ($vatInput < 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'VAT cannot be negative.'
        ]);

        exit;
    }


    /*
     * Because Expense amount is the final total,
     * VAT cannot be greater than the total.
     */

    if (
        $type === 'expense' &&
        $vatInput > $amount
    ) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'VAT cannot be greater than the expense total.'
        ]);

        exit;
    }


    // =====================================================
    // START DATABASE TRANSACTION
    // =====================================================

    $pdo->beginTransaction();


    // =====================================================
    // GET COMPANY ACCOUNTS
    // =====================================================

    $accountStmt = $pdo->prepare("
        SELECT
            id,
            account_name,
            account_type,
            account_subtype
        FROM accounts
        WHERE company_id = :company_id
    ");


    $accountStmt->execute([
        ':company_id' => $companyId
    ]);


    $accounts = $accountStmt->fetchAll();


    /*
     * Build a map using account_subtype.
     *
     * Example:
     *
     * receivable => 10
     * payable    => 11
     * sales      => 12
     * vat_input  => 13
     */

    $accountMap = [];


    foreach ($accounts as $account) {

        $subtype = trim(
            (string) (
                $account['account_subtype']
                ?? ''
            )
        );


        if ($subtype === '') {
            continue;
        }


        /*
         * Do not overwrite an already mapped subtype.
         *
         * This prevents a later duplicate subtype from
         * unexpectedly replacing the first account.
         */

        if (!isset(
            $accountMap[$subtype]
        )) {

            $accountMap[$subtype] =
                (int) $account['id'];
        }
    }


    // =====================================================
    // REQUIRED SYSTEM ACCOUNTS
    // =====================================================

    $requiredAccounts = [];


    switch ($type) {

        case 'sale':

            /*
             * Sale:
             *
             * Dr Accounts Receivable
             * Cr Sales
             */

            $requiredAccounts = [
                'receivable',
                'sales'
            ];

            break;


        case 'receipt':

            /*
             * Receipt:
             *
             * Dr Cash / Bank
             * Cr Accounts Receivable
             */

            $requiredAccounts = [
                'receivable'
            ];

            break;


        case 'payment':

            /*
             * Payment:
             *
             * Dr Accounts Payable
             * Cr Cash / Bank
             */

            $requiredAccounts = [
                'payable'
            ];

            break;


        case 'expense':

            /*
             * Expense:
             *
             * Dr Expense
             * Dr Input VAT (if applicable)
             * Cr Accounts Payable
             */

            $requiredAccounts = [
                'payable'
            ];

            if ($vatInput > 0) {

                $requiredAccounts[] =
                    'vat_input';
            }

            break;
    }


    foreach (
        $requiredAccounts
        as $required
    ) {

        if (!isset(
            $accountMap[$required]
        )) {

            throw new Exception(
                ucfirst($required)
                    . ' account is missing.'
            );
        }
    }


    // =====================================================
    // PARTY VALIDATION
    // =====================================================

    /*
     * All current transaction types require a party.
     *
     * Expense / Payment -> Supplier
     * Sale / Receipt    -> Customer
     */

    if (
        $type === 'sale' ||
        $type === 'receipt' ||
        $type === 'payment' ||
        $type === 'expense'
    ) {

        if ($partyId <= 0) {

            throw new Exception(
                'Please select a party.'
            );
        }


        $partyStmt = $pdo->prepare("
            SELECT
                id,
                party_name,
                party_type
            FROM parties
            WHERE id = :party_id
            AND company_id = :company_id
            LIMIT 1
        ");


        $partyStmt->execute([
            ':party_id' =>
            $partyId,

            ':company_id' =>
            $companyId
        ]);


        $party = $partyStmt->fetch();


        if (!$party) {

            throw new Exception(
                'Selected party was not found.'
            );
        }


        /*
         * Supplier:
         *
         * Expense
         * Payment
         *
         * Customer:
         *
         * Sale
         * Receipt
         */

        $expectedPartyType =
            (
                $type === 'expense' ||
                $type === 'payment'
            )
            ? 'supplier'
            : 'customer';


        if (
            $party['party_type']
            !== $expectedPartyType
        ) {

            throw new Exception(
                'Please select a '
                    . $expectedPartyType
                    . '.'
            );
        }
    }


    // =====================================================
    // CASH / BANK ACCOUNT VALIDATION
    // =====================================================

    /*
     * ONLY Payment and Receipt require account_id.
     *
     * Expense:
     *     account_id is NOT required.
     *
     * Sale:
     *     account_id is NOT required.
     *
     * Payment:
     *     account_id = bank/cash being paid FROM.
     *
     * Receipt:
     *     account_id = bank/cash being received INTO.
     */

    if (
        $type === 'payment' ||
        $type === 'receipt'
    ) {

        if ($accountId <= 0) {

            throw new Exception(
                'Please select Cash or Bank.'
            );
        }


        $accountExists = false;


        foreach (
            $accounts
            as $account
        ) {

            if (
                (int) $account['id']
                === $accountId
            ) {

                $accountExists = true;

                break;
            }
        }


        if (!$accountExists) {

            throw new Exception(
                'Selected Cash/Bank account is invalid.'
            );
        }
    }


    // =====================================================
    // EXPENSE ACCOUNT
    // =====================================================

    /*
     * Expense does NOT receive an account from the frontend.
     *
     * Instead, automatically use an existing account whose
     * account_type is "expense".
     *
     * This keeps Expense Voucher entry simple while still
     * producing a balanced accounting entry.
     *
     * If the company has several expense accounts, the
     * first one by ID is used for now.
     *
     * Later, when expense categories/accounting rules are
     * introduced, this can be replaced with item-level
     * expense classification.
     */

    $expenseAccountId = 0;


    if ($type === 'expense') {

        $expenseAccountStmt = $pdo->prepare("
            SELECT
                id,
                account_name,
                account_type,
                account_subtype
            FROM accounts
            WHERE company_id = :company_id
            AND LOWER(account_type) = 'expense'
            ORDER BY id ASC
            LIMIT 1
        ");


        $expenseAccountStmt->execute([
            ':company_id' =>
            $companyId
        ]);


        $expenseAccount =
            $expenseAccountStmt->fetch();


        if (!$expenseAccount) {

            throw new Exception(
                'No expense account is configured for this company.'
            );
        }


        $expenseAccountId =
            (int) $expenseAccount['id'];
    }


    // =====================================================
    // CREATE VOUCHER
    // =====================================================

    $voucherTypes = [

        'sale' =>
        'SALE',

        'receipt' =>
        'RECEIPT',

        'payment' =>
        'PAYMENT',

        'expense' =>
        'EXPENSE'

    ];


    $voucherStmt = $pdo->prepare("
        INSERT INTO vouchers (
            company_id,
            voucher_type,
            voucher_date,
            reference_number,
            party_id,
            amount,
            vat_input,
            narration,
            created_by
        )
        VALUES (
            :company_id,
            :voucher_type,
            :voucher_date,
            :reference_number,
            :party_id,
            :amount,
            :vat_input,
            :narration,
            :created_by
        )
    ");


    $voucherStmt->execute([

        ':company_id' =>
        $companyId,


        ':voucher_type' =>
        $voucherTypes[$type],


        ':voucher_date' =>
        $date,


        ':reference_number' =>
        $referenceNumber !== ''
            ? $referenceNumber
            : null,


        ':party_id' =>
        $partyId > 0
            ? $partyId
            : null,


        ':amount' =>
        $amount,


        ':vat_input' =>
        $vatInput,


        ':narration' =>
        $narration !== ''
            ? $narration
            : ucfirst($type)
            . ' transaction',


        ':created_by' =>
        $userId

    ]);


    $voucherId =
        (int) $pdo->lastInsertId();


    if ($voucherId <= 0) {

        throw new Exception(
            'Failed to create voucher.'
        );
    }


    // =====================================================
    // LEDGER INSERT STATEMENT
    // =====================================================

    $ledgerStmt = $pdo->prepare("
        INSERT INTO ledger_entries (
            company_id,
            voucher_id,
            account_id,
            party_id,
            debit,
            credit
        )
        VALUES (
            :company_id,
            :voucher_id,
            :account_id,
            :party_id,
            :debit,
            :credit
        )
    ");


    // =====================================================
    // LEDGER HELPER
    // =====================================================

    $addEntry = function (
        int $account,
        ?int $party,
        float $debit,
        float $credit
    ) use (
        $ledgerStmt,
        $companyId,
        $voucherId
    ) {

        if ($account <= 0) {

            throw new Exception(
                'Invalid ledger account.'
            );
        }


        if (
            $debit < 0 ||
            $credit < 0
        ) {

            throw new Exception(
                'Ledger amounts cannot be negative.'
            );
        }


        /*
         * A single ledger line should not contain both
         * debit and credit.
         */

        if (
            $debit > 0 &&
            $credit > 0
        ) {

            throw new Exception(
                'Ledger entry cannot contain both debit and credit.'
            );
        }


        $ledgerStmt->execute([

            ':company_id' =>
            $companyId,


            ':voucher_id' =>
            $voucherId,


            ':account_id' =>
            $account,


            ':party_id' =>
            $party,


            ':debit' =>
            round(
                $debit,
                2
            ),


            ':credit' =>
            round(
                $credit,
                2
            )

        ]);
    };


    // =====================================================
    // SALE
    //
    // Dr Accounts Receivable
    // Cr Sales
    //
    // Example:
    //
    // Customer buys AED 1,000
    //
    // Dr Receivable     1,000
    // Cr Sales          1,000
    // =====================================================

    if ($type === 'sale') {

        $addEntry(

            $accountMap['receivable'],

            $partyId,

            $amount,

            0

        );


        $addEntry(

            $accountMap['sales'],

            null,

            0,

            $amount

        );
    }


    // =====================================================
    // RECEIPT
    //
    // Dr Cash / Bank
    // Cr Accounts Receivable
    //
    // account_id = selected Cash / Bank account
    // =====================================================

    if ($type === 'receipt') {

        $addEntry(

            $accountId,

            null,

            $amount,

            0

        );


        $addEntry(

            $accountMap['receivable'],

            $partyId,

            0,

            $amount

        );
    }


    // =====================================================
    // PAYMENT
    //
    // Dr Accounts Payable
    // Cr Cash / Bank
    //
    // account_id = selected Cash / Bank account
    // =====================================================

    if ($type === 'payment') {

        $addEntry(

            $accountMap['payable'],

            $partyId,

            $amount,

            0

        );


        $addEntry(

            $accountId,

            null,

            0,

            $amount

        );
    }


    // =====================================================
    // EXPENSE
    //
    // Dr Expense
    // Dr Input VAT
    // Cr Accounts Payable
    //
    // IMPORTANT:
    //
    // The frontend currently sends the FINAL expense
    // total in "amount".
    //
    // Example:
    //
    // Items                  100.00
    // VAT                      5.00
    // Total                  105.00
    //
    // Request:
    //
    // amount    = 105
    // vat_input = 5
    //
    // Therefore:
    //
    // Expense base = 105 - 5 = 100
    //
    // Ledger:
    //
    // Dr Expense             100
    // Dr Input VAT             5
    // Cr Payable             105
    //
    // This prevents VAT from being counted twice.
    // =====================================================

    if ($type === 'expense') {

        $expenseBaseAmount =
            round(
                $amount - $vatInput,
                2
            );


        if ($expenseBaseAmount < 0) {

            throw new Exception(
                'Expense amount cannot be less than VAT.'
            );
        }


        /*
         * Debit Expense
         */

        $addEntry(

            $expenseAccountId,

            null,

            $expenseBaseAmount,

            0

        );


        /*
         * Debit Input VAT
         */

        if ($vatInput > 0) {

            $addEntry(

                $accountMap['vat_input'],

                null,

                $vatInput,

                0

            );
        }


        /*
         * Credit Supplier Payable
         *
         * The payable is the final bill total.
         */

        $payableAmount =
            round(
                $amount,
                2
            );


        $addEntry(

            $accountMap['payable'],

            $partyId,

            0,

            $payableAmount

        );
    }


    // =====================================================
    // VERIFY LEDGER BALANCE
    // =====================================================

    $balanceStmt = $pdo->prepare("
        SELECT
            COALESCE(
                SUM(debit),
                0
            ) AS debit,

            COALESCE(
                SUM(credit),
                0
            ) AS credit

        FROM ledger_entries

        WHERE voucher_id = :voucher_id
    ");


    $balanceStmt->execute([
        ':voucher_id' =>
        $voucherId
    ]);


    $balance =
        $balanceStmt->fetch();


    $totalDebit =
        round(
            (float) (
                $balance['debit']
                ?? 0
            ),
            2
        );


    $totalCredit =
        round(
            (float) (
                $balance['credit']
                ?? 0
            ),
            2
        );


    if (
        abs(
            $totalDebit -
                $totalCredit
        ) > 0.001
    ) {

        throw new Exception(
            'Transaction is not balanced.'
        );
    }


    // =====================================================
    // COMMIT
    // =====================================================

    $pdo->commit();


    // =====================================================
    // SUCCESS RESPONSE
    // =====================================================

    echo json_encode([

        'success' =>
        true,


        'message' =>
        ucfirst($type)
            . ' saved successfully.',


        'data' => [

            'voucher_id' =>
            $voucherId,


            'type' =>
            $type,


            'amount' =>
            round(
                $amount,
                2
            )

        ]

    ]);
} catch (Throwable $e) {

    // =====================================================
    // ROLLBACK
    // =====================================================

    if (
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    // =====================================================
    // LOG ERROR
    // =====================================================

    error_log(
        'Transaction API error: '
            . $e->getMessage()
    );


    // =====================================================
    // ERROR RESPONSE
    // =====================================================

    http_response_code(500);


    echo json_encode([

        'success' =>
        false,


        'message' =>
        $e->getMessage()

    ]);
}
