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
| PAYMENT ALLOCATIONS
|--------------------------------------------------------------------------
|
| New Payment vouchers can settle multiple Expense vouchers.
|
| payment_allocations stores:
|
|   Payment Voucher -> Expense Voucher -> Amount Paid
|
| For every bill we reconstruct:
|
|   - Supplier bill reference
|   - Internal Expense voucher reference
|   - Original bill amount
|   - Amount paid before THIS Payment
|   - Amount allocated by THIS Payment
|   - Balance after THIS Payment
|
| Old Payment vouchers that only use source_voucher_id are also
| converted into one allocation row below.
|
*/

    $paymentAllocations = [];


    if ($voucherType === 'PAYMENT') {
        /*
|--------------------------------------------------------------------------
| SOURCE EXPENSE ITEMS
|--------------------------------------------------------------------------
|
| These are the actual items / particulars from the Expense bill.
| They are displayed underneath the supplier name on the Payment voucher.
|
*/

        $paymentExpenseItemsStmt =
            $pdo->prepare("
        SELECT
            id,
            description,
            unit,
            quantity,
            rate,
            amount

        FROM voucher_items

        WHERE voucher_id = :expense_voucher_id

        ORDER BY id ASC
    ");
        /*
    |--------------------------------------------------------------------------
    | LOAD ALLOCATIONS FOR THIS PAYMENT
    |--------------------------------------------------------------------------
    */

        $paymentAllocationStmt =
            $pdo->prepare("
            SELECT
                pa.id,
                pa.expense_voucher_id,
                pa.amount AS allocation_amount,

                e.reference_number,
                e.bill_reference,
                e.amount AS bill_amount,
                e.party_id

            FROM payment_allocations pa

            INNER JOIN vouchers e
                ON e.id = pa.expense_voucher_id
                AND e.company_id = pa.company_id
                AND e.voucher_type = 'EXPENSE'

            WHERE pa.company_id = :company_id

            AND pa.payment_voucher_id = :payment_voucher_id

            ORDER BY pa.id ASC
        ");


        $paymentAllocationStmt->execute([

            ':company_id' =>
            $companyId,

            ':payment_voucher_id' =>
            $voucherId

        ]);


        $allocationRows =
            $paymentAllocationStmt->fetchAll(
                PDO::FETCH_ASSOC
            );


        /*
    |--------------------------------------------------------------------------
    | CALCULATE PAYMENTS MADE BEFORE THIS PAYMENT
    |--------------------------------------------------------------------------
    |
    | We need the historical balance as of this Payment voucher.
    |
    | Previous payments can come from:
    |
    | 1. Legacy vouchers.source_voucher_id payments
    | 2. New payment_allocations rows
    |
    | We only count Payments before the current voucher.
    |
    | Ordering:
    |   voucher_date first
    |   voucher.id second
    |
    */

        $previousPaidStmt =
            $pdo->prepare("
            SELECT

                COALESCE(
                    (
                        SELECT SUM(previous_payment.amount)

                        FROM vouchers previous_payment

                        WHERE previous_payment.company_id =
                            :legacy_company_id

                        AND previous_payment.voucher_type =
                            'PAYMENT'

                        AND previous_payment.source_voucher_id =
                            :legacy_expense_id

                        AND (
                            previous_payment.voucher_date <
                                :legacy_payment_date

                            OR (
                                previous_payment.voucher_date =
                                    :legacy_same_date

                                AND previous_payment.id <
                                    :legacy_payment_id
                            )
                        )

                        AND NOT EXISTS (
                            SELECT 1

                            FROM payment_allocations legacy_check

                            WHERE legacy_check.company_id =
                                previous_payment.company_id

                            AND legacy_check.payment_voucher_id =
                                previous_payment.id
                        )
                    ),
                    0
                )

                +

                COALESCE(
                    (
                        SELECT SUM(previous_allocation.amount)

                        FROM payment_allocations previous_allocation

                        INNER JOIN vouchers previous_voucher
                            ON previous_voucher.id =
                                previous_allocation.payment_voucher_id

                            AND previous_voucher.company_id =
                                previous_allocation.company_id

                            AND previous_voucher.voucher_type =
                                'PAYMENT'

                        WHERE previous_allocation.company_id =
                            :allocation_company_id

                        AND previous_allocation.expense_voucher_id =
                            :allocation_expense_id

                        AND (
                            previous_voucher.voucher_date <
                                :allocation_payment_date

                            OR (
                                previous_voucher.voucher_date =
                                    :allocation_same_date

                                AND previous_voucher.id <
                                    :allocation_payment_id
                            )
                        )
                    ),
                    0
                )

                AS previously_paid
        ");


        /*
    |--------------------------------------------------------------------------
    | FORMAT NEW ALLOCATION-BASED PAYMENTS
    |--------------------------------------------------------------------------
    */

        foreach ($allocationRows as $allocationRow) {

            $expenseId =
                (int)
                $allocationRow['expense_voucher_id'];
            /*
|--------------------------------------------------------------------------
| LOAD ITEMS FROM THE SOURCE EXPENSE
|--------------------------------------------------------------------------
*/

            $paymentExpenseItemsStmt->execute([
                ':expense_voucher_id' =>
                $expenseId
            ]);


            $expenseItems =
                $paymentExpenseItemsStmt->fetchAll(
                    PDO::FETCH_ASSOC
                );


            foreach (
                $expenseItems
                as &$expenseItem
            ) {

                $expenseItem['id'] =
                    (int) $expenseItem['id'];

                $expenseItem['quantity'] =
                    (float) $expenseItem['quantity'];

                $expenseItem['rate'] =
                    (float) $expenseItem['rate'];

                $expenseItem['amount'] =
                    (float) $expenseItem['amount'];
            }


            unset($expenseItem);

            $previousPaidStmt->execute([

                ':legacy_company_id' =>
                $companyId,

                ':legacy_expense_id' =>
                $expenseId,

                ':legacy_payment_date' =>
                $voucher['voucher_date'],

                ':legacy_same_date' =>
                $voucher['voucher_date'],

                ':legacy_payment_id' =>
                $voucherId,


                ':allocation_company_id' =>
                $companyId,

                ':allocation_expense_id' =>
                $expenseId,

                ':allocation_payment_date' =>
                $voucher['voucher_date'],

                ':allocation_same_date' =>
                $voucher['voucher_date'],

                ':allocation_payment_id' =>
                $voucherId

            ]);


            $previouslyPaid =
                round(
                    (float)
                    $previousPaidStmt->fetchColumn(),
                    2
                );


            $billAmount =
                round(
                    (float)
                    $allocationRow['bill_amount'],
                    2
                );


            $thisPayment =
                round(
                    (float)
                    $allocationRow['allocation_amount'],
                    2
                );


            $outstandingBefore =
                max(
                    0,
                    round(
                        $billAmount -
                            $previouslyPaid,
                        2
                    )
                );


            $outstandingAfter =
                max(
                    0,
                    round(
                        $outstandingBefore -
                            $thisPayment,
                        2
                    )
                );


            $paymentAllocations[] = [

                'expense_id' =>
                $expenseId,

                /*
             * Internal ERP Expense number.
             */
                'reference_number' =>
                $allocationRow['reference_number']
                    ?? '',

                /*
             * Supplier's actual bill / invoice number.
             */
                'bill_reference' =>
                $allocationRow['bill_reference']
                    ?? '',
                /*
 * Items from the original Expense bill.
 */
                'items' =>
                $expenseItems,

                'items_summary' =>
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
                ),
                /*
             * Original bill value.
             */
                'bill_amount' =>
                $billAmount,

                'original_amount' =>
                $billAmount,

                /*
             * Historical paid amount BEFORE this Payment.
             */
                'paid_amount' =>
                $previouslyPaid,

                'previously_paid' =>
                $previouslyPaid,

                /*
             * Balance immediately before this Payment.
             */
                'outstanding_amount' =>
                $outstandingBefore,

                'outstanding_before' =>
                $outstandingBefore,

                /*
             * Amount paid by THIS Payment voucher.
             */
                'amount' =>
                $thisPayment,

                /*
             * Balance after this Payment.
             */
                'outstanding_after' =>
                $outstandingAfter,

                'status' =>
                $outstandingAfter <= 0.0001
                    ? 'PAID'
                    : 'PARTIALLY_PAID'

            ];
        }


        /*
    |--------------------------------------------------------------------------
    | LEGACY PAYMENT FALLBACK
    |--------------------------------------------------------------------------
    |
    | Older Payments do not have payment_allocations rows.
    |
    | They only have:
    |
    |     vouchers.source_voucher_id
    |
    | Convert those old Payments into the same allocation shape so
    | PrintableVoucher does not need separate rendering logic.
    |
    */

        if (
            empty($paymentAllocations) &&
            $sourceVoucher
        ) {

            $expenseId =
                (int)
                $sourceVoucher['id'];
            $paymentExpenseItemsStmt->execute([
                ':expense_voucher_id' =>
                $expenseId
            ]);


            $expenseItems =
                $paymentExpenseItemsStmt->fetchAll(
                    PDO::FETCH_ASSOC
                );


            foreach (
                $expenseItems
                as &$expenseItem
            ) {

                $expenseItem['id'] =
                    (int) $expenseItem['id'];

                $expenseItem['quantity'] =
                    (float) $expenseItem['quantity'];

                $expenseItem['rate'] =
                    (float) $expenseItem['rate'];

                $expenseItem['amount'] =
                    (float) $expenseItem['amount'];
            }


            unset($expenseItem);

            $previousPaidStmt->execute([

                ':legacy_company_id' =>
                $companyId,

                ':legacy_expense_id' =>
                $expenseId,

                ':legacy_payment_date' =>
                $voucher['voucher_date'],

                ':legacy_same_date' =>
                $voucher['voucher_date'],

                ':legacy_payment_id' =>
                $voucherId,


                ':allocation_company_id' =>
                $companyId,

                ':allocation_expense_id' =>
                $expenseId,

                ':allocation_payment_date' =>
                $voucher['voucher_date'],

                ':allocation_same_date' =>
                $voucher['voucher_date'],

                ':allocation_payment_id' =>
                $voucherId

            ]);


            $previouslyPaid =
                round(
                    (float)
                    $previousPaidStmt->fetchColumn(),
                    2
                );


            $billAmount =
                round(
                    (float)
                    $sourceVoucher['amount'],
                    2
                );


            $thisPayment =
                round(
                    (float)
                    $voucher['amount'],
                    2
                );


            $outstandingBefore =
                max(
                    0,
                    round(
                        $billAmount -
                            $previouslyPaid,
                        2
                    )
                );


            $outstandingAfter =
                max(
                    0,
                    round(
                        $outstandingBefore -
                            $thisPayment,
                        2
                    )
                );


            $paymentAllocations[] = [

                'expense_id' =>
                $expenseId,

                'reference_number' =>
                $sourceVoucher['reference_number']
                    ?? '',

                'bill_reference' =>
                $sourceVoucher['bill_reference']
                    ?? '',
                'items' =>
                $expenseItems,

                'items_summary' =>
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
                ),
                'bill_amount' =>
                $billAmount,

                'original_amount' =>
                $billAmount,

                'paid_amount' =>
                $previouslyPaid,

                'previously_paid' =>
                $previouslyPaid,

                'outstanding_amount' =>
                $outstandingBefore,

                'outstanding_before' =>
                $outstandingBefore,

                'amount' =>
                $thisPayment,

                'outstanding_after' =>
                $outstandingAfter,

                'status' =>
                $outstandingAfter <= 0.0001
                    ? 'PAID'
                    : 'PARTIALLY_PAID'

            ];
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

            'paymentAllocations' =>
            $paymentAllocations,

            'payment_allocations' =>
            $paymentAllocations,

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
