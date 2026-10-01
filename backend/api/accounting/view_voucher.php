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

    $companyId =
        getCurrentCompanyId();

    $voucherId =
        (int) (
            $_GET['id'] ??
            0
        );


    if ($companyId <= 0) {
        throw new Exception(
            'Company not found.'
        );
    }


    if ($voucherId <= 0) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid voucher ID.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | COMPANY
    |--------------------------------------------------------------------------
    */

    $companyStmt =
        $pdo->prepare("
            SELECT
                *
            FROM companies
            WHERE id = :company_id
            LIMIT 1
        ");

    $companyStmt->execute([
        ':company_id' =>
        $companyId
    ]);

    $company =
        $companyStmt->fetch();


    if (!$company) {
        throw new Exception(
            'Company profile not found.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | COMPANY LOGO → BASE64
    |--------------------------------------------------------------------------
    */

    $logoData = null;


    if (!empty($company['logo'])) {

        $storagePath = rtrim(
            getenv('STORAGE_PATH')
                ?: (__DIR__ . '/../../storage'),
            '/\\'
        );

        $logoFilePath =
            $storagePath .
            '/' .
            ltrim(
                $company['logo'],
                '/'
            );


        if (is_file($logoFilePath)) {

            $mimeType =
                mime_content_type(
                    $logoFilePath
                );

            $logoContents =
                file_get_contents(
                    $logoFilePath
                );


            if ($logoContents !== false) {

                $logoData =
                    'data:' .
                    $mimeType .
                    ';base64,' .
                    base64_encode(
                        $logoContents
                    );
            }
        }
    }


    /*
    |--------------------------------------------------------------------------
    | VOUCHER
    |--------------------------------------------------------------------------
    */

    $voucherStmt =
        $pdo->prepare("
            SELECT
                v.*
            FROM vouchers v
            WHERE v.id = :voucher_id
            AND v.company_id = :company_id
            LIMIT 1
        ");

    $voucherStmt->execute([
        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId
    ]);

    $voucher =
        $voucherStmt->fetch();


    if (!$voucher) {

        http_response_code(404);

        echo json_encode([
            'success' => false,
            'message' => 'Voucher not found.'
        ]);

        exit;
    }


    $voucherType =
        strtoupper(
            trim(
                (string)
                $voucher['voucher_type']
            )
        );


    /*
    |--------------------------------------------------------------------------
    | PARTY
    |--------------------------------------------------------------------------
    */

    $party = null;


    if (
        !empty($voucher['party_id'])
    ) {

        $partyStmt =
            $pdo->prepare("
                SELECT
                    *
                FROM parties
                WHERE id = :party_id
                AND company_id = :company_id
                LIMIT 1
            ");

        $partyStmt->execute([
            ':party_id' =>
            $voucher['party_id'],

            ':company_id' =>
            $companyId
        ]);

        $party =
            $partyStmt->fetch();

        if ($party) {

            $party['phone'] =
                $party['phone'] ?? '';

            $party['email'] =
                $party['email'] ?? '';

            $party['address'] =
                $party['address'] ?? '';

            $party['tax_number'] =
                $party['tax_number'] ?? '';
        }
    }


    /*
    |--------------------------------------------------------------------------
    | LEDGER LINES
    |--------------------------------------------------------------------------
    */

    $ledgerStmt =
        $pdo->prepare("
            SELECT
                le.id,
                le.account_id,
                le.party_id,
                le.debit,
                le.credit,

                a.account_name,
                a.account_type,
                a.account_subtype

            FROM ledger_entries le

            INNER JOIN accounts a
                ON a.id = le.account_id
                AND a.company_id = le.company_id

            WHERE le.voucher_id = :voucher_id
            AND le.company_id = :company_id

            ORDER BY
                le.id ASC
        ");

    $ledgerStmt->execute([
        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId
    ]);

    $ledgerEntries =
        $ledgerStmt->fetchAll();


    /*
    |--------------------------------------------------------------------------
    | FORMAT LEDGER LINES
    |--------------------------------------------------------------------------
    */

    foreach (
        $ledgerEntries
        as &$line
    ) {

        $line['id'] =
            (int)
            $line['id'];

        $line['account_id'] =
            (int)
            $line['account_id'];

        $line['debit'] =
            (float)
            $line['debit'];

        $line['credit'] =
            (float)
            $line['credit'];
    }

    unset($line);

    /*
|--------------------------------------------------------------------------
| CAPITAL ALLOCATIONS
|--------------------------------------------------------------------------
|
| Capital allocations are stored through ledger_entries.
|
| Positive Capital:
|   Dr Cash / Bank
|   Cr Capital
|
| Negative Capital:
|   Dr Capital
|   Cr Cash / Bank
|
*/

    $capitalAllocations = [];

    if ($voucherType === 'CAPITAL') {

        foreach ($ledgerEntries as $line) {

            $subtype = strtolower(
                trim(
                    (string) (
                        $line['account_subtype']
                        ?? ''
                    )
                )
            );

            /*
         * Only Cash and physical Bank ledger lines
         * are Capital allocation lines.
         */
            if (
                $subtype !== 'cash' &&
                $subtype !== 'bank'
            ) {
                continue;
            }

            /*
         * Positive Capital uses debit.
         * Negative Capital uses credit.
         */
            $allocationAmount =
                (float) $line['debit'] > 0
                ? (float) $line['debit']
                : (float) $line['credit'];

            if ($allocationAmount <= 0) {
                continue;
            }

            $capitalAllocations[] = [

                'type' =>
                $subtype === 'cash'
                    ? 'cash'
                    : 'bank',

                'account_id' =>
                (int) $line['account_id'],

                'account_name' =>
                $line['account_name'] ?? '',

                'displayName' =>
                $line['account_name'] ?? '',

                'amount' =>
                round(
                    $allocationAmount,
                    2
                )
            ];
        }
    }
    /*
    |--------------------------------------------------------------------------
    | FIND THE MAIN ACCOUNT
    |--------------------------------------------------------------------------
    */

    $mainAccount =
        null;


    foreach (
        $ledgerEntries
        as $line
    ) {

        if (
            $voucherType === 'SALE' &&
            strtolower(
                (string)
                $line['account_type']
            ) === 'income'
        ) {

            $mainAccount =
                $line;

            break;
        }


        if (
            $voucherType === 'EXPENSE' &&
            strtolower(
                (string)
                $line['account_type']
            ) === 'expense'
        ) {

            $mainAccount =
                $line;

            break;
        }
    }


    if (!$mainAccount && !empty($ledgerEntries)) {
        $mainAccount =
            $ledgerEntries[0];
    }


    /*
    |--------------------------------------------------------------------------
    | RECONSTRUCT PARTICULARS
    |--------------------------------------------------------------------------
    |
    | Current database does not contain the original React line items.
    | Therefore we reconstruct one database-backed line.
    |
    */

    $particulars =
        trim(
            (string)
            ($voucher['narration'] ?? '')
        );


    if ($particulars === '') {

        $particulars =
            $mainAccount['account_name']
            ?? ucfirst(
                strtolower(
                    $voucherType
                )
            );
    }

    $itemStmt = $pdo->prepare("
    SELECT
        id,
        voucher_id,
        customer_service_id,
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

    $itemStmt->execute([
        ':voucher_id' => $voucherId
    ]);

    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$item) {

        $item['quantity'] =
            (float) $item['quantity'];

        $item['qty'] =
            $item['quantity'];

        $item['rate'] =
            (float) $item['rate'];

        $item['amount'] =
            (float) $item['amount'];
    }

    unset($item);

    /*
    |--------------------------------------------------------------------------
    | SOURCE VOUCHER
    |--------------------------------------------------------------------------
    */

    $sourceVoucher =
        null;


    if (
        !empty($voucher['source_voucher_id'])
    ) {

        $sourceStmt =
            $pdo->prepare("
                SELECT
                    v.*,
                    p.party_name,
                    p.party_type
                FROM vouchers v

                LEFT JOIN parties p
                    ON p.id = v.party_id
                    AND p.company_id = v.company_id

                WHERE v.id =
                    :source_voucher_id

                AND v.company_id =
                    :company_id

                LIMIT 1
            ");

        $sourceStmt->execute([
            ':source_voucher_id' =>
            $voucher['source_voucher_id'],

            ':company_id' =>
            $companyId
        ]);

        $sourceVoucher =
            $sourceStmt->fetch();
    }


    /*
    |--------------------------------------------------------------------------
    | PAYMENT ACCOUNT
    |--------------------------------------------------------------------------
    */

    $paymentAccount = null;

    if (
        $voucherType === 'PAYMENT' ||
        $voucherType === 'RECEIPT'
    ) {

        foreach ($ledgerEntries as $line) {

            $accountSubtype = strtolower(
                trim(
                    (string) (
                        $line['account_subtype']
                        ?? ''
                    )
                )
            );

            if (
                $accountSubtype !== 'cash' &&
                $accountSubtype !== 'bank'
            ) {
                continue;
            }

            /*
         * Cash
         */
            if ($accountSubtype === 'cash') {

                $paymentAccount = [
                    'id' =>
                    (int) $line['account_id'],

                    'account_id' =>
                    (int) $line['account_id'],

                    'account_name' =>
                    $line['account_name'] ?? 'Cash',

                    'displayName' =>
                    'Cash'
                ];

                break;
            }

            /*
         * Physical Bank
         */
            $bankStmt = $pdo->prepare("
            SELECT
                id,
                bank_name,
                account_name,
                account_number,
                iban,
                currency,
                accounting_account_id

            FROM bank_accounts

            WHERE company_id = :company_id
              AND accounting_account_id = :account_id

            LIMIT 1
        ");

            $bankStmt->execute([
                ':company_id' =>
                $companyId,

                ':account_id' =>
                (int) $line['account_id']
            ]);

            $bankAccount =
                $bankStmt->fetch();

            if ($bankAccount) {

                $accountNumber =
                    trim(
                        (string) (
                            $bankAccount['account_number']
                            ?? ''
                        )
                    );

                $lastFour =
                    $accountNumber !== ''
                    ? substr($accountNumber, -4)
                    : '';

                $displayName =
                    trim(
                        (string) (
                            $bankAccount['bank_name']
                            ?? ''
                        )
                    );

                if ($lastFour !== '') {
                    $displayName .=
                        ' — ' .
                        $lastFour;
                }

                $paymentAccount = [
                    'id' =>
                    (int) $bankAccount['accounting_account_id'],

                    'account_id' =>
                    (int) $bankAccount['accounting_account_id'],

                    'bank_account_id' =>
                    (int) $bankAccount['id'],

                    'bank_name' =>
                    $bankAccount['bank_name'] ?? '',

                    'account_name' =>
                    $bankAccount['account_name'] ?? '',

                    'account_number' =>
                    $bankAccount['account_number'] ?? '',

                    'currency' =>
                    $bankAccount['currency'] ?? 'AED',

                    'displayName' =>
                    $displayName
                ];
            } else {

                /*
             * Fallback if the physical bank row no longer exists.
             */
                $paymentAccount = [
                    'id' =>
                    (int) $line['account_id'],

                    'account_id' =>
                    (int) $line['account_id'],

                    'account_name' =>
                    $line['account_name'] ?? '',

                    'displayName' =>
                    $line['account_name'] ?? 'Bank'
                ];
            }

            break;
        }
    }


    /*
    |--------------------------------------------------------------------------
    | PAYMENT BILL
    |--------------------------------------------------------------------------
    */

    $selectedPaymentBill =
        null;


    if (
        $voucherType === 'PAYMENT' &&
        $sourceVoucher
    ) {

        $selectedPaymentBill = [
            'id' =>
            (int) $sourceVoucher['id'],

            'voucher_id' =>
            (int) $sourceVoucher['id'],

            'invoice_number' =>
            $sourceVoucher['reference_number'],

            'reference_number' =>
            $sourceVoucher['reference_number'],

            'bill_reference' =>
            $sourceVoucher['bill_reference'] ?? null,

            'party_name' =>
            $sourceVoucher['party_name'] ?? '',

            'amount' =>
            (float) $sourceVoucher['amount'],

            'total_amount' =>
            (float) $sourceVoucher['amount'],

            'address' =>
            $sourceVoucher['address'] ?? '',

            'phone' =>
            $sourceVoucher['phone'] ?? '',

            'email' =>
            $sourceVoucher['email'] ?? '',

            'trn' =>
            $sourceVoucher['trn'] ?? ''
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | RECEIPT BILL
    |--------------------------------------------------------------------------
    */

    $selectedReceiptBill =
        null;


    if (
        $voucherType === 'RECEIPT' &&
        $sourceVoucher
    ) {

        $selectedReceiptBill = [

            'id' =>
            (int)
            $sourceVoucher['id'],

            'voucher_id' =>
            (int)
            $sourceVoucher['id'],

            'invoice_number' =>
            $sourceVoucher['reference_number'],

            'reference_number' =>
            $sourceVoucher['reference_number'],

            'party_name' =>
            $sourceVoucher['party_name'],

            'amount' =>
            (float)
            $sourceVoucher['amount'],

            'total_amount' =>
            (float)
            $sourceVoucher['amount'],

            'address' =>
            $party['address']
                ?? '',

            'bill_reference' =>
            $sourceVoucher['bill_reference'] ?? null,

            'phone' =>
            $party['phone']
                ?? '',

            'email' =>
            $party['email']
                ?? '',

            'trn' =>
            $party['trn']
                ?? ''
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | AMOUNTS
    |--------------------------------------------------------------------------
    */

    $amount =
        (float)
        $voucher['amount'];

    $vatInput =
        (float)
        (
            $voucher['vat_input']
            ?? 0
        );

    $vatOutput =
        (float)
        (
            $voucher['vat_output']
            ?? 0
        );


    /*
    |--------------------------------------------------------------------------
    | COMPANY RESPONSE
    |--------------------------------------------------------------------------
    */

    $companyResponse = [

        'id' =>
        (int)
        $company['id'],

        'name' =>
        $company['company_name'] ?? '',

        'company_name' =>
        $company['company_name'] ?? '',

        'logo' =>
        $company['logo'] ?? '',

        'logo_data' =>
        $logoData,

        'address' =>
        $company['address'] ?? '',

        'city' =>
        $company['city'] ?? '',

        'country' =>
        $company['country'] ?? '',

        'phone' =>
        $company['phone'] ?? '',

        'email' =>
        $company['email'] ?? '',

        'website' =>
        $company['website'] ?? '',

        'trn' =>
        $company['trn'] ?? ''
    ];


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' =>
        true,

        'data' => [

            'voucher_id' =>
            (int)
            $voucher['id'],

            'type' =>
            strtolower(
                $voucherType
            ),

            'voucher_type' =>
            $voucherType,

            'date' =>
            $voucher['voucher_date'],

            'voucher_date' =>
            $voucher['voucher_date'],

            'referenceNumber' =>
            $voucher['reference_number'],

            'reference_number' =>
            $voucher['reference_number'],

            'billReference' =>
            $voucher['bill_reference'] ?? null,

            'voucherNumber' =>
            $voucher['reference_number'],

            'voucher_number' =>
            $voucher['reference_number'],

            'party' =>
            $party,

            'items' =>
            $items,

            'allocations' =>
            $capitalAllocations,

            'amount' =>
            $amount,

            'discountAmount' =>
            0,

            'discount_amount' =>
            0,

            'vatRate' =>
            $amount > 0
                ? round(
                    (
                        $vatInput +
                        $vatOutput
                    ) /
                        max(
                            0.01,
                            $amount -
                                (
                                    $vatInput +
                                    $vatOutput
                                )
                        ) *
                        100,
                    2
                )
                : 0,

            'vatAmount' =>
            $vatInput +
                $vatOutput,

            'vat_input' =>
            $vatInput,

            'vat_output' =>
            $vatOutput,

            'totalAmount' =>
            $amount,

            'total_amount' =>
            $amount,

            'paymentAmount' =>
            $voucherType === 'PAYMENT'
                ? $amount
                : 0,

            'receiptAmount' =>
            $voucherType === 'RECEIPT'
                ? $amount
                : 0,

            'paymentAccount' =>
            $paymentAccount,

            'selectedPaymentBill' =>
            $selectedPaymentBill,

            'selectedReceiptBill' =>
            $selectedReceiptBill,

            'narration' =>
            $voucher['narration'],

            'ledgerEntries' =>
            $ledgerEntries,

            'company' =>
            $companyResponse,

            'documentStatus' =>
            'COPY'
        ]
    ]);
} catch (Throwable $e) {

    error_log(
        'View voucher error: ' .
            $e->getMessage()
    );


    http_response_code(500);

    echo json_encode([

        'success' =>
        false,

        'message' =>
        $e->getMessage()
    ]);
}
