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

    $companyId = getCurrentCompanyId();
    $userId = getCurrentUserId();

    $data = json_decode(
        file_get_contents('php://input'),
        true
    );

    $type = strtolower(
        trim($data['type'] ?? '')
    );

    $date = trim(
        $data['date'] ?? ''
    );

    $partyId = (int) (
        $data['party_id'] ?? 0
    );

    $amount = (float) (
        $data['amount'] ?? 0
    );

    $vatInput = (float) (
        $data['vat_input'] ?? 0
    );

    $referenceNumber = trim(
        $data['reference_number'] ?? ''
    );

    $accountId = (int) (
        $data['account_id'] ?? 0
    );

    $narration = trim(
        $data['narration'] ?? ''
    );


    // =====================================================
    // VALIDATION
    // =====================================================

    $allowedTypes = [
        'sale',
        'receipt',
        'payment',
        'expense'
    ];

    if (!in_array($type, $allowedTypes, true)) {

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


    // =====================================================
    // START TRANSACTION
    // =====================================================

    $pdo->beginTransaction();


    // =====================================================
    // GET SYSTEM ACCOUNTS
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

    $accountMap = [];

    foreach ($accounts as $account) {

        $accountMap[$account['account_subtype']] = (int) $account['id'];
    }


    // =====================================================
    // REQUIRED ACCOUNTS
    // =====================================================

    $requiredAccounts = [
        'sale' => [
            'receivable',
            'sales'
        ],

        'receipt' => [
            'receivable'
        ],

        'payment' => [
            'payable'
        ],

        'expense' => []
    ];

    foreach (
        $requiredAccounts[$type]
        as $required
    ) {

        if (!isset($accountMap[$required])) {

            throw new Exception(
                ucfirst($required)
                    . ' account is missing.'
            );
        }
    }


    // =====================================================
    // PARTY VALIDATION
    // =====================================================

    if (
        $type === 'sale' ||
        $type === 'receipt' ||
        $type === 'payment' ||
        $type ===  'expense'
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
            ':party_id' => $partyId,
            ':company_id' => $companyId
        ]);

        $party = $partyStmt->fetch();

        if (!$party) {

            throw new Exception(
                'Selected party was not found.'
            );
        }


        $expectedPartyType =
            (
                $type === 'expense' ||
                $type === 'payment'
            )
            ? 'supplier'
            : 'customer';


        if (
            $party['party_type'] !==
            $expectedPartyType
        ) {

            throw new Exception(
                'Please select a '
                    . $expectedPartyType
                    . '.'
            );
        }
    }


    // =====================================================
    // ACCOUNT VALIDATION
    // =====================================================

    if (
        $type === 'sale' ||
        $type === 'receipt' ||
        $type === 'payment' ||
        $type === 'expense'
    ) {

        if ($accountId <= 0) {

            throw new Exception(
                'Please select an account.'
            );
        }

        $accountExists = false;

        foreach ($accounts as $account) {

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
                'Selected account is invalid.'
            );
        }
    }


    // =====================================================
    // CREATE VOUCHER
    // =====================================================

    $voucherTypes = [
        'sale' => 'SALE',
        'receipt' => 'RECEIPT',
        'payment' => 'PAYMENT',
        'expense' => 'EXPENSE'
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


    // =====================================================
    // LEDGER INSERT
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
            $debit,

            ':credit' =>
            $credit
        ]);
    };


    // =====================================================
    // SALE
    //
    // Dr Receivable
    // Cr Sales
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
    // Cr Receivable
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
    // Dr Payable
    // Cr Cash / Bank
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
    // Dr Expense Account
    // Dr VAT Input
    // Cr Supplier Payable
    //
    // Expense is NOT paid immediately.
    // Payment happens later through Payment.
    // =====================================================

    if ($type === 'expense') {

        /*
     * Expense account
     */

        $expenseAccountStmt = $pdo->prepare("
        SELECT id
        FROM accounts
        WHERE id = :account_id
        AND company_id = :company_id
        AND account_type = 'expense'
        LIMIT 1
    ");

        $expenseAccountStmt->execute([
            ':account_id' =>
            $accountId,

            ':company_id' =>
            $companyId
        ]);

        $expenseAccount =
            $expenseAccountStmt->fetch();


        if (!$expenseAccount) {

            throw new Exception(
                'Selected expense account is invalid.'
            );
        }


        /*
     * Debit Expense
     */

        $addEntry(
            (int) $expenseAccount['id'],
            null,
            $amount,
            0
        );


        /*
     * Debit VAT Input
     *
     * Only create the entry if VAT exists.
     */

        if ($vatInput > 0) {

            if (!isset(
                $accountMap['vat_input']
            )) {

                throw new Exception(
                    'VAT Input account is missing.'
                );
            }


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
     * Expense + VAT becomes the total
     * amount owed to the supplier.
     */

        $payableAmount =
            $amount + $vatInput;


        $addEntry(
            $accountMap['payable'],
            $partyId,
            0,
            $payableAmount
        );
    }

    // =====================================================
    // VERIFY BALANCE
    // =====================================================

    $balanceStmt = $pdo->prepare("
        SELECT
            COALESCE(SUM(debit), 0) AS debit,
            COALESCE(SUM(credit), 0) AS credit
        FROM ledger_entries
        WHERE voucher_id = :voucher_id
    ");

    $balanceStmt->execute([
        ':voucher_id' => $voucherId
    ]);

    $balance =
        $balanceStmt->fetch();

    $totalDebit =
        (float) $balance['debit'];

    $totalCredit =
        (float) $balance['credit'];

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


    echo json_encode([
        'success' => true,

        'message' =>
        ucfirst($type)
            . ' saved successfully.',

        'data' => [
            'voucher_id' =>
            $voucherId,

            'type' =>
            $type,

            'amount' =>
            $amount
        ]
    ]);
} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'Transaction API error: '
            . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
        $e->getMessage()
    ]);
}
