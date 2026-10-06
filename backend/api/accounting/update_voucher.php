<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';


/*
|--------------------------------------------------------------------------
| METHOD
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function roundMoney($value): float
{
    return round(
        (float) $value,
        2
    );
}


function decodeArrayField($value): array
{
    if (is_array($value)) {
        return $value;
    }

    if (
        $value === null ||
        $value === ''
    ) {
        return [];
    }

    $decoded =
        json_decode(
            (string) $value,
            true
        );

    return is_array($decoded)
        ? $decoded
        : [];
}


function validDate(string $value): bool
{
    if ($value === '') {
        return false;
    }

    $date =
        DateTime::createFromFormat(
            'Y-m-d',
            $value
        );

    return
        $date &&
        $date->format('Y-m-d') === $value;
}


try {

    /*
    |--------------------------------------------------------------------------
    | AUTH
    |--------------------------------------------------------------------------
    */

    $companyId =
        getCurrentCompanyId();


    /*
    |--------------------------------------------------------------------------
    | REQUEST
    |--------------------------------------------------------------------------
    */

    $contentType =
        $_SERVER['CONTENT_TYPE']
        ?? '';


    if (
        stripos(
            $contentType,
            'multipart/form-data'
        ) === 0
    ) {

        $data =
            $_POST;
    } else {

        $data =
            json_decode(
                file_get_contents(
                    'php://input'
                ),
                true
            );
    }


    if (!is_array($data)) {

        throw new Exception(
            'Invalid update request.'
        );
    }


    $voucherId =
        (int) (
            $data['voucher_id']
            ?? 0
        );


    $type =
        strtolower(
            trim(
                (string) (
                    $data['type']
                    ?? ''
                )
            )
        );


    $date =
        trim(
            (string) (
                $data['date']
                ?? ''
            )
        );


    $partyId =
        (int) (
            $data['party_id']
            ?? 0
        );


    $billReference =
        trim(
            (string) (
                $data['bill_reference']
                ?? ''
            )
        );


    $amount =
        roundMoney(
            $data['amount']
                ?? 0
        );


    $vatInput =
        roundMoney(
            $data['vat_input']
                ?? 0
        );


    $vatOutput =
        roundMoney(
            $data['vat_output']
                ?? 0
        );


    $accountId =
        (int) (
            $data['account_id']
            ?? 0
        );


    $sourceVoucherId =
        (int) (
            $data['source_voucher_id']
            ?? 0
        );


    $narration =
        trim(
            (string) (
                $data['narration']
                ?? ''
            )
        );


    $items =
        decodeArrayField(
            $data['items']
                ?? []
        );


    $paymentAllocations =
        decodeArrayField(
            $data['payment_allocations']
                ?? []
        );


    $capitalAllocations =
        decodeArrayField(
            $data['capital_allocations']
                ?? []
        );


    /*
    |--------------------------------------------------------------------------
    | BASIC VALIDATION
    |--------------------------------------------------------------------------
    */

    $allowedTypes = [
        'sale',
        'receipt',
        'payment',
        'expense',
        'capital'
    ];


    if ($voucherId <= 0) {

        throw new Exception(
            'Invalid voucher.'
        );
    }


    if (
        !in_array(
            $type,
            $allowedTypes,
            true
        )
    ) {

        throw new Exception(
            'Invalid voucher type.'
        );
    }


    if (!validDate($date)) {

        throw new Exception(
            'A valid voucher date is required.'
        );
    }


    if (
        $type !== 'capital' &&
        $amount <= 0
    ) {

        throw new Exception(
            'Amount must be greater than zero.'
        );
    }


    if (
        $vatInput < 0 ||
        $vatOutput < 0
    ) {

        throw new Exception(
            'VAT cannot be negative.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | START TRANSACTION
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();


    /*
    |--------------------------------------------------------------------------
    | LOCK EXISTING VOUCHER
    |--------------------------------------------------------------------------
    */

    $voucherStmt =
        $pdo->prepare("
            SELECT
                id,
                company_id,
                voucher_type,
                voucher_date,
                reference_number,
                bill_reference,
                source_voucher_id,
                party_id,
                amount,
                vat_input,
                vat_output,
                narration,
                created_by

            FROM vouchers

            WHERE id = :voucher_id

            AND company_id =
                :company_id

            LIMIT 1

            FOR UPDATE
        ");


    $voucherStmt->execute([

        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId

    ]);


    $existingVoucher =
        $voucherStmt->fetch(
            PDO::FETCH_ASSOC
        );


    if (!$existingVoucher) {

        throw new Exception(
            'Voucher not found.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | DO NOT ALLOW TYPE CHANGE
    |--------------------------------------------------------------------------
    |
    | SALE must remain SALE.
    | PAYMENT must remain PAYMENT.
    |
    | Changing voucher type would corrupt historical references.
    |
    */

    $expectedVoucherTypes = [

        'sale' =>
        'SALE',

        'receipt' =>
        'RECEIPT',

        'payment' =>
        'PAYMENT',

        'expense' =>
        'EXPENSE',

        'capital' =>
        'CAPITAL'

    ];


    if (
        $existingVoucher['voucher_type'] !==
        $expectedVoucherTypes[$type]
    ) {

        throw new Exception(
            'Voucher type cannot be changed.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | KEEP ORIGINAL VOUCHER NUMBER
    |--------------------------------------------------------------------------
    */

    $referenceNumber =
        $existingVoucher['reference_number'];


    /*
    |--------------------------------------------------------------------------
    | CAPITAL DIRECTION
    |--------------------------------------------------------------------------
    |
    | Existing negative Capital remains negative.
    |
    | The frontend editor sends the allocation total as positive,
    | so preserve the original direction here.
    |
    */

    if ($type === 'capital') {

        $originalCapitalAmount =
            roundMoney(
                $existingVoucher['amount']
            );


        $capitalDirection =
            $originalCapitalAmount < 0
            ? -1
            : 1;


        $amount =
            abs(
                roundMoney(
                    $amount
                )
            )
            *
            $capitalDirection;


        if (
            abs($amount)
            < 0.01
        ) {

            throw new Exception(
                'Capital amount cannot be zero.'
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | LOAD COMPANY ACCOUNTS
    |--------------------------------------------------------------------------
    */

    $accountsStmt =
        $pdo->prepare("
            SELECT
                id,
                account_name,
                account_type,
                account_subtype

            FROM accounts

            WHERE company_id =
                :company_id
        ");


    $accountsStmt->execute([

        ':company_id' =>
        $companyId

    ]);


    $accounts =
        $accountsStmt->fetchAll(
            PDO::FETCH_ASSOC
        );


    $accountMap = [];


    foreach (
        $accounts
        as $account
    ) {

        $subtype =
            trim(
                (string) (
                    $account['account_subtype']
                    ?? ''
                )
            );


        if (
            $subtype !== '' &&
            !isset(
                $accountMap[$subtype]
            )
        ) {

            $accountMap[$subtype] =
                (int)
                $account['id'];
        }
    }


    /*
    |--------------------------------------------------------------------------
    | REQUIRED SYSTEM ACCOUNTS
    |--------------------------------------------------------------------------
    */

    $required = [];


    switch ($type) {

        case 'sale':

            $required = [
                'receivable',
                'sales'
            ];

            break;


        case 'receipt':

            $required = [
                'receivable'
            ];

            break;


        case 'payment':

            $required = [
                'payable'
            ];

            break;


        case 'expense':

            $required = [
                'payable'
            ];

            break;


        case 'capital':

            $required = [
                'capital',
                'cash'
            ];

            break;
    }


    foreach (
        $required
        as $requiredSubtype
    ) {

        if (
            !isset(
                $accountMap[$requiredSubtype]
            )
        ) {

            throw new Exception(
                ucfirst(
                    $requiredSubtype
                )
                    .
                    ' account is missing.'
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | PARTY VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($type !== 'capital') {

        if ($partyId <= 0) {

            throw new Exception(
                'Please select a party.'
            );
        }


        $partyStmt =
            $pdo->prepare("
                SELECT
                    id,
                    party_name,
                    party_type

                FROM parties

                WHERE id = :party_id

                AND company_id =
                    :company_id

                LIMIT 1
            ");


        $partyStmt->execute([

            ':party_id' =>
            $partyId,

            ':company_id' =>
            $companyId

        ]);


        $party =
            $partyStmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$party) {

            throw new Exception(
                'Selected party was not found.'
            );
        }


        $expectedPartyType =
            (
                $type ===
                'expense' ||
                $type ===
                'payment'
            )
            ? 'supplier'
            : 'customer';


        if (
            $party['party_type'] !==
            $expectedPartyType
        ) {

            throw new Exception(
                'Please select a '
                    .
                    $expectedPartyType
                    .
                    '.'
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CASH / BANK VALIDATION
    |--------------------------------------------------------------------------
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


        $cashBankStmt =
            $pdo->prepare("
                SELECT
                    id,
                    account_subtype

                FROM accounts

                WHERE id = :account_id

                AND company_id =
                    :company_id

                AND account_subtype IN (
                    'cash',
                    'bank'
                )

                LIMIT 1
            ");


        $cashBankStmt->execute([

            ':account_id' =>
            $accountId,

            ':company_id' =>
            $companyId

        ]);


        if (
            !$cashBankStmt->fetch()
        ) {

            throw new Exception(
                'Selected Cash/Bank account is invalid.'
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | NORMALISE SALE / EXPENSE ITEMS
    |--------------------------------------------------------------------------
    */

    $cleanItems = [];


    if (
        $type === 'sale' ||
        $type === 'expense'
    ) {

        if (
            count($items)
            === 0
        ) {

            throw new Exception(
                'At least one item is required.'
            );
        }


        foreach (
            $items
            as $item
        ) {

            if (
                !is_array(
                    $item
                )
            ) {

                throw new Exception(
                    'Invalid voucher item.'
                );
            }


            $description =
                trim(
                    (string) (
                        $item['description']
                        ?? ''
                    )
                );


            $unit =
                trim(
                    (string) (
                        $item['unit']
                        ?? ''
                    )
                );


            $quantity =
                (float) (
                    $item['quantity']
                    ?? 0
                );


            $rate =
                (float) (
                    $item['rate']
                    ?? 0
                );


            if (
                $description === ''
            ) {

                throw new Exception(
                    'Every item requires a description.'
                );
            }


            if (
                $quantity <= 0
            ) {

                throw new Exception(
                    'Every item quantity must be greater than zero.'
                );
            }


            if ($rate < 0) {

                throw new Exception(
                    'Item rate cannot be negative.'
                );
            }


            $cleanItems[] = [

                'customer_service_id' =>
                !empty($item['customer_service_id'])
                    ? (int)
                    $item['customer_service_id']
                    : null,


                'supplier_item_id' =>
                !empty($item['supplier_item_id'])
                    ? (int)
                    $item['supplier_item_id']
                    : null,


                'description' =>
                $description,


                'unit' =>
                $unit,


                'quantity' =>
                $quantity,


                'rate' =>
                $rate,


                'amount' =>
                roundMoney(
                    $quantity
                        *
                        $rate
                )

            ];
        }
    }


    /*
    |--------------------------------------------------------------------------
    | EXPENSE PAYMENT PROTECTION
    |--------------------------------------------------------------------------
    |
    | Do not let an Expense:
    |
    | - become smaller than money already paid against it
    | - move to another supplier after payment
    |
    */

    if ($type === 'expense') {

        if (
            $billReference === ''
        ) {

            throw new Exception(
                'Supplier bill/reference number is required.'
            );
        }


        $expensePaidStmt =
            $pdo->prepare("
                SELECT

                    COALESCE(
                        (
                            SELECT
                                SUM(p.amount)

                            FROM vouchers p

                            WHERE p.company_id =
                                :legacy_company

                            AND p.voucher_type =
                                'PAYMENT'

                            AND p.source_voucher_id =
                                :legacy_expense

                            AND NOT EXISTS (

                                SELECT 1

                                FROM payment_allocations pc

                                WHERE pc.company_id =
                                    p.company_id

                                AND pc.payment_voucher_id =
                                    p.id
                            )
                        ),
                        0
                    )

                    +

                    COALESCE(
                        (
                            SELECT
                                SUM(pa.amount)

                            FROM payment_allocations pa

                            WHERE pa.company_id =
                                :allocation_company

                            AND pa.expense_voucher_id =
                                :allocation_expense
                        ),
                        0
                    )

                    AS paid_amount
            ");


        $expensePaidStmt->execute([

            ':legacy_company' =>
            $companyId,

            ':legacy_expense' =>
            $voucherId,

            ':allocation_company' =>
            $companyId,

            ':allocation_expense' =>
            $voucherId

        ]);


        $alreadyPaid =
            roundMoney(
                $expensePaidStmt
                    ->fetchColumn()
            );


        if (
            $alreadyPaid > 0 &&
            $partyId !==
            (int)
            $existingVoucher['party_id']
        ) {

            throw new Exception(
                'Supplier cannot be changed because payments already exist against this Expense.'
            );
        }


        if (
            $amount <
            $alreadyPaid
        ) {

            throw new Exception(
                'Expense amount cannot be lower than the amount already paid. Paid: AED '
                    .
                    number_format(
                        $alreadyPaid,
                        2
                    )
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | SALE RECEIPT PROTECTION
    |--------------------------------------------------------------------------
    |
    | Do not reduce a Sale below receipts already recorded against it.
    |
    */

    if ($type === 'sale') {

        $receivedStmt =
            $pdo->prepare("
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    )

                FROM vouchers

                WHERE company_id =
                    :company_id

                AND voucher_type =
                    'RECEIPT'

                AND source_voucher_id =
                    :sale_id
            ");


        $receivedStmt->execute([

            ':company_id' =>
            $companyId,

            ':sale_id' =>
            $voucherId

        ]);


        $alreadyReceived =
            roundMoney(
                $receivedStmt
                    ->fetchColumn()
            );


        if (
            $alreadyReceived > 0 &&
            $partyId !==
            (int)
            $existingVoucher['party_id']
        ) {

            throw new Exception(
                'Customer cannot be changed because Receipts already exist against this Sale.'
            );
        }


        if (
            $amount <
            $alreadyReceived
        ) {

            throw new Exception(
                'Sale amount cannot be lower than the amount already received. Received: AED '
                    .
                    number_format(
                        $alreadyReceived,
                        2
                    )
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | RECEIPT LINK VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
        $type === 'receipt' &&
        $sourceVoucherId > 0
    ) {

        $saleStmt =
            $pdo->prepare("
                SELECT
                    id,
                    party_id,
                    amount,
                    reference_number

                FROM vouchers

                WHERE id =
                    :sale_id

                AND company_id =
                    :company_id

                AND voucher_type =
                    'SALE'

                LIMIT 1

                FOR UPDATE
            ");


        $saleStmt->execute([

            ':sale_id' =>
            $sourceVoucherId,

            ':company_id' =>
            $companyId

        ]);


        $sale =
            $saleStmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$sale) {

            throw new Exception(
                'Selected Sales bill was not found.'
            );
        }


        if (
            (int)
            $sale['party_id']
            !==
            $partyId
        ) {

            throw new Exception(
                'The selected Sales bill belongs to another customer.'
            );
        }


        /*
         * Other receipts against the same Sale,
         * excluding the Receipt currently being edited.
         */

        $otherReceiptStmt =
            $pdo->prepare("
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    )

                FROM vouchers

                WHERE company_id =
                    :company_id

                AND voucher_type =
                    'RECEIPT'

                AND source_voucher_id =
                    :sale_id

                AND id !=
                    :receipt_id
            ");


        $otherReceiptStmt->execute([

            ':company_id' =>
            $companyId,

            ':sale_id' =>
            $sourceVoucherId,

            ':receipt_id' =>
            $voucherId

        ]);


        $otherReceived =
            roundMoney(
                $otherReceiptStmt
                    ->fetchColumn()
            );


        $available =
            roundMoney(
                (float)
                $sale['amount']
                    -
                    $otherReceived
            );


        if (
            $amount >
            $available
        ) {

            throw new Exception(
                'Receipt exceeds the remaining Sales balance. Maximum: AED '
                    .
                    number_format(
                        $available,
                        2
                    )
            );
        }


        /*
         * Keep bill_reference synchronised
         * with the linked Sales voucher.
         */

        $billReference =
            $sale['reference_number']
            ?? '';
    }


    /*
    |--------------------------------------------------------------------------
    | PAYMENT ALLOCATION VALIDATION
    |--------------------------------------------------------------------------
    */

    $cleanPaymentAllocations =
        [];


    if ($type === 'payment') {

        $allocationTotal = 0;


        foreach (
            $paymentAllocations
            as $allocation
        ) {

            if (
                !is_array(
                    $allocation
                )
            ) {

                continue;
            }


            $expenseId =
                (int) (
                    $allocation['expense_id']
                    ?? 0
                );


            $allocationAmount =
                roundMoney(
                    $allocation['amount']
                        ?? 0
                );


            if (
                $expenseId <= 0 ||
                $allocationAmount <= 0
            ) {

                continue;
            }


            $expenseStmt =
                $pdo->prepare("
                    SELECT
                        id,
                        party_id,
                        amount,
                        reference_number,
                        bill_reference

                    FROM vouchers

                    WHERE id =
                        :expense_id

                    AND company_id =
                        :company_id

                    AND voucher_type =
                        'EXPENSE'

                    LIMIT 1

                    FOR UPDATE
                ");


            $expenseStmt->execute([

                ':expense_id' =>
                $expenseId,

                ':company_id' =>
                $companyId

            ]);


            $expense =
                $expenseStmt->fetch(
                    PDO::FETCH_ASSOC
                );


            if (!$expense) {

                throw new Exception(
                    'One of the selected Expense bills no longer exists.'
                );
            }


            if (
                (int)
                $expense['party_id']
                !==
                $partyId
            ) {

                throw new Exception(
                    'All Payment bills must belong to the selected supplier.'
                );
            }


            /*
             * Amount paid by OTHER Payments.
             *
             * Exclude the Payment currently being edited.
             */

            $otherPaidStmt =
                $pdo->prepare("
                    SELECT

                        COALESCE(
                            (
                                SELECT
                                    SUM(p.amount)

                                FROM vouchers p

                                WHERE p.company_id =
                                    :legacy_company

                                AND p.voucher_type =
                                    'PAYMENT'

                                AND p.source_voucher_id =
                                    :legacy_expense

                                AND p.id !=
                                    :current_payment

                                AND NOT EXISTS (

                                    SELECT 1

                                    FROM payment_allocations pc

                                    WHERE pc.company_id =
                                        p.company_id

                                    AND pc.payment_voucher_id =
                                        p.id
                                )
                            ),
                            0
                        )

                        +

                        COALESCE(
                            (
                                SELECT
                                    SUM(pa.amount)

                                FROM payment_allocations pa

                                WHERE pa.company_id =
                                    :allocation_company

                                AND pa.expense_voucher_id =
                                    :allocation_expense

                                AND pa.payment_voucher_id !=
                                    :allocation_current_payment
                            ),
                            0
                        )
                ");


            $otherPaidStmt->execute([

                ':legacy_company' =>
                $companyId,

                ':legacy_expense' =>
                $expenseId,

                ':current_payment' =>
                $voucherId,

                ':allocation_company' =>
                $companyId,

                ':allocation_expense' =>
                $expenseId,

                ':allocation_current_payment' =>
                $voucherId

            ]);


            $otherPaid =
                roundMoney(
                    $otherPaidStmt
                        ->fetchColumn()
                );


            $available =
                roundMoney(
                    (float)
                    $expense['amount']
                        -
                        $otherPaid
                );


            if (
                $allocationAmount >
                $available
            ) {

                throw new Exception(
                    'Payment exceeds the available balance for bill '
                        .
                        (
                            $expense['bill_reference']
                            ?:
                            $expense['reference_number']
                        )
                        .
                        '. Maximum: AED '
                        .
                        number_format(
                            $available,
                            2
                        )
                );
            }


            $cleanPaymentAllocations[] =
                [

                    'expense_id' =>
                    $expenseId,

                    'amount' =>
                    $allocationAmount,

                    'bill_reference' =>
                    !empty($expense['bill_reference'])
                        ? trim(
                            (string)
                            $expense['bill_reference']
                        )
                        : null,

                    'reference_number' =>
                    !empty($expense['reference_number'])
                        ? trim(
                            (string)
                            $expense['reference_number']
                        )
                        : null

                ];


            $allocationTotal +=
                $allocationAmount;
        }


        $allocationTotal =
            roundMoney(
                $allocationTotal
            );


        /*
         * New multi-bill payment.
         */

        if (
            count(
                $cleanPaymentAllocations
            ) > 0
        ) {

            if (
                abs(
                    $allocationTotal
                        -
                        $amount
                ) > 0.01
            ) {

                throw new Exception(
                    'Payment allocation total must equal the Payment amount.'
                );
            }


            /*
             * Preserve source_voucher_id for a one-bill
             * Payment for backwards compatibility.
             *
             * Multi-bill Payment has no single source.
             */

            if (
                count(
                    $cleanPaymentAllocations
                ) === 1
            ) {

                $sourceVoucherId =
                    $cleanPaymentAllocations[0]['expense_id'];
            } else {

                $sourceVoucherId =
                    0;
            }
        } else {

            /*
             * Legacy Payment without allocation rows.
             *
             * Keep its old source voucher if present.
             */

            $existingSource =
                (int) (
                    $existingVoucher['source_voucher_id']
                    ?? 0
                );


            if (
                $existingSource > 0
            ) {

                $sourceVoucherId =
                    $existingSource;


                $legacyExpenseStmt =
                    $pdo->prepare("
                        SELECT
                            id,
                            party_id,
                            amount

                        FROM vouchers

                        WHERE id =
                            :expense_id

                        AND company_id =
                            :company_id

                        AND voucher_type =
                            'EXPENSE'

                        LIMIT 1
                    ");


                $legacyExpenseStmt
                    ->execute([

                        ':expense_id' =>
                        $sourceVoucherId,

                        ':company_id' =>
                        $companyId

                    ]);


                $legacyExpense =
                    $legacyExpenseStmt
                    ->fetch(
                        PDO::FETCH_ASSOC
                    );


                if (!$legacyExpense) {

                    throw new Exception(
                        'Linked Expense bill was not found.'
                    );
                }


                if (
                    (int)
                    $legacyExpense['party_id']
                    !==
                    $partyId
                ) {

                    throw new Exception(
                        'Linked Expense belongs to another supplier.'
                    );
                }
            }
        }
    }

    /*
|--------------------------------------------------------------------------
| PAYMENT BILL REFERENCE
|--------------------------------------------------------------------------
|
| A Payment may be allocated against one or multiple Expense bills.
|
| One Expense:
|   Keep that Expense's supplier bill/reference number on the Payment.
|
| Multiple Expenses:
|   There is no single bill reference, so leave it NULL.
|
| Legacy Payment:
|   Preserve the existing Payment bill reference.
|
*/

    if ($type === 'payment') {

        if (
            count(
                $cleanPaymentAllocations
            ) === 1
        ) {

            $paymentExpense =
                $cleanPaymentAllocations[0];

            $billReference =
                trim(
                    (string) (
                        $paymentExpense['bill_reference']
                        ??
                        ''
                    )
                );


            /*
         * If the Expense has no supplier bill reference,
         * fall back to its Expense voucher number.
         */

            if ($billReference === '') {

                $billReference =
                    trim(
                        (string) (
                            $paymentExpense['reference_number']
                            ??
                            ''
                        )
                    );
            }
        } elseif (
            count(
                $cleanPaymentAllocations
            ) > 1
        ) {

            /*
         * A multi-bill Payment cannot have one
         * meaningful bill_reference.
         */

            $billReference = null;
        } else {

            /*
         * Legacy Payment without payment_allocations.
         *
         * Do not wipe an existing historical reference
         * just because the frontend did not send it.
         */

            $billReference =
                trim(
                    (string) (
                        $existingVoucher['bill_reference']
                        ??
                        ''
                    )
                );
        }
    }
    /*
    |--------------------------------------------------------------------------
    | CAPITAL VALIDATION
    |--------------------------------------------------------------------------
    */

    $cleanCapitalAllocations =
        [];


    if ($type === 'capital') {

        if (
            count(
                $capitalAllocations
            ) === 0
        ) {

            throw new Exception(
                'At least one Capital allocation is required.'
            );
        }


        $allocationTotal = 0;


        foreach (
            $capitalAllocations
            as $allocation
        ) {

            if (
                !is_array(
                    $allocation
                )
            ) {

                throw new Exception(
                    'Invalid Capital allocation.'
                );
            }


            $allocationType =
                strtolower(
                    trim(
                        (string) (
                            $allocation['type']
                            ?? ''
                        )
                    )
                );


            $allocationAmount =
                roundMoney(
                    $allocation['amount']
                        ?? 0
                );


            $allocationAccountId =
                (int) (
                    $allocation['account_id']
                    ?? 0
                );


            if (
                $allocationType !==
                'cash' &&
                $allocationType !==
                'bank'
            ) {

                throw new Exception(
                    'Capital allocation must be Cash or Bank.'
                );
            }


            if (
                $allocationAmount <=
                0
            ) {

                throw new Exception(
                    'Capital allocation amount must be greater than zero.'
                );
            }


            if (
                $allocationType ===
                'bank'
            ) {

                if (
                    $allocationAccountId
                    <= 0
                ) {

                    throw new Exception(
                        'Please select a bank account for every bank allocation.'
                    );
                }


                $bankStmt =
                    $pdo->prepare("
                        SELECT
                            id

                        FROM bank_accounts

                        WHERE company_id =
                            :company_id

                        AND accounting_account_id =
                            :account_id

                        AND is_active = 1

                        LIMIT 1
                    ");


                $bankStmt->execute([

                    ':company_id' =>
                    $companyId,

                    ':account_id' =>
                    $allocationAccountId

                ]);


                if (
                    !$bankStmt->fetch()
                ) {

                    throw new Exception(
                        'Selected bank account is invalid or inactive.'
                    );
                }
            } else {

                $allocationAccountId =
                    $accountMap['cash'];
            }


            $cleanCapitalAllocations[] =
                [

                    'type' =>
                    $allocationType,

                    'account_id' =>
                    $allocationAccountId,

                    'amount' =>
                    $allocationAmount

                ];


            $allocationTotal +=
                $allocationAmount;
        }


        $allocationTotal =
            roundMoney(
                $allocationTotal
            );


        if (
            abs(
                $allocationTotal
                    -
                    abs($amount)
            ) > 0.01
        ) {

            throw new Exception(
                'Capital allocations must equal the Capital amount.'
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | FINAL VAT RULES
    |--------------------------------------------------------------------------
    */

    if (
        $type !== 'sale'
    ) {

        $vatInput = 0;
    }


    if (
        $type !== 'expense'
    ) {

        $vatOutput = 0;
    }


    if (
        $type === 'expense' &&
        $vatOutput > $amount
    ) {

        throw new Exception(
            'VAT cannot be greater than the Expense total.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VOUCHER VALUES
    |--------------------------------------------------------------------------
    */

    if (
        $type === 'sale' ||
        $type === 'capital'
    ) {

        $billReference = null;
    }


    if (
        $type === 'capital'
    ) {

        $partyId = null;

        $sourceVoucherId = null;
    }


    if (
        $type !== 'receipt' &&
        $type !== 'payment'
    ) {

        $sourceVoucherId = null;
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE VOUCHER
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | reference_number is deliberately NOT updated.
    |
    | SALES/...
    | RECEIPT/...
    | PAYMENT/...
    | EXPENSE/...
    | CAPITAL/...
    |
    | all remain unchanged.
    |
    */

    $updateVoucherStmt =
        $pdo->prepare("
            UPDATE vouchers

            SET

                voucher_date =
                    :voucher_date,

                bill_reference =
                    :bill_reference,

                source_voucher_id =
                    :source_voucher_id,

                party_id =
                    :party_id,

                amount =
                    :amount,

                vat_input =
                    :vat_input,

                vat_output =
                    :vat_output,

                narration =
                    :narration

            WHERE id =
                :voucher_id

            AND company_id =
                :company_id
        ");


    $updateVoucherStmt->execute([

        ':voucher_date' =>
        $date,

        ':bill_reference' =>
        $billReference !== ''
            ? $billReference
            : null,

        ':source_voucher_id' =>
        $sourceVoucherId > 0
            ? $sourceVoucherId
            : null,

        ':party_id' =>
        $partyId
            ? $partyId
            : null,

        ':amount' =>
        $amount,

        ':vat_input' =>
        $vatInput,

        ':vat_output' =>
        $vatOutput,

        ':narration' =>
        $narration !== ''
            ? $narration
            : null,

        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId

    ]);


    /*
    |--------------------------------------------------------------------------
    | REPLACE SALE / EXPENSE ITEMS
    |--------------------------------------------------------------------------
    */

    if (
        $type === 'sale' ||
        $type === 'expense'
    ) {

        $deleteItemsStmt =
            $pdo->prepare("
                DELETE FROM voucher_items

                WHERE voucher_id =
                    :voucher_id
            ");


        $deleteItemsStmt->execute([

            ':voucher_id' =>
            $voucherId

        ]);


        $insertItemStmt =
            $pdo->prepare("
                INSERT INTO voucher_items (

                    voucher_id,
                    customer_service_id,
                    supplier_item_id,
                    description,
                    unit,
                    quantity,
                    rate,
                    amount

                )

                VALUES (

                    :voucher_id,
                    :customer_service_id,
                    :supplier_item_id,
                    :description,
                    :unit,
                    :quantity,
                    :rate,
                    :amount

                )
            ");


        foreach (
            $cleanItems
            as $item
        ) {

            $insertItemStmt
                ->execute([

                    ':voucher_id' =>
                    $voucherId,

                    ':customer_service_id' =>
                    $type === 'sale'
                        ? $item['customer_service_id']
                        : null,

                    ':supplier_item_id' =>
                    $type === 'expense'
                        ? $item['supplier_item_id']
                        : null,

                    ':description' =>
                    $item['description'],

                    ':unit' =>
                    $item['unit'],

                    ':quantity' =>
                    $item['quantity'],

                    ':rate' =>
                    $item['rate'],

                    ':amount' =>
                    $item['amount']

                ]);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | REPLACE PAYMENT ALLOCATIONS
    |--------------------------------------------------------------------------
    */

    if ($type === 'payment') {

        $deletePaymentAllocations =
            $pdo->prepare("
                DELETE FROM payment_allocations

                WHERE company_id =
                    :company_id

                AND payment_voucher_id =
                    :payment_voucher_id
            ");


        $deletePaymentAllocations
            ->execute([

                ':company_id' =>
                $companyId,

                ':payment_voucher_id' =>
                $voucherId

            ]);


        if (
            count(
                $cleanPaymentAllocations
            ) > 0
        ) {

            $insertAllocationStmt =
                $pdo->prepare("
                    INSERT INTO payment_allocations (

                        company_id,
                        payment_voucher_id,
                        expense_voucher_id,
                        amount

                    )

                    VALUES (

                        :company_id,
                        :payment_voucher_id,
                        :expense_voucher_id,
                        :amount

                    )
                ");


            foreach (
                $cleanPaymentAllocations
                as $allocation
            ) {

                $insertAllocationStmt
                    ->execute([

                        ':company_id' =>
                        $companyId,

                        ':payment_voucher_id' =>
                        $voucherId,

                        ':expense_voucher_id' =>
                        $allocation['expense_id'],

                        ':amount' =>
                        $allocation['amount']

                    ]);
            }
        }
    }


    /*
    |--------------------------------------------------------------------------
    | DELETE OLD LEDGER ENTRIES
    |--------------------------------------------------------------------------
    */

    $deleteLedgerStmt =
        $pdo->prepare("
            DELETE FROM ledger_entries

            WHERE voucher_id =
                :voucher_id

            AND company_id =
                :company_id
        ");


    $deleteLedgerStmt->execute([

        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId

    ]);


    /*
    |--------------------------------------------------------------------------
    | LEDGER INSERT
    |--------------------------------------------------------------------------
    */

    $ledgerStmt =
        $pdo->prepare("
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


    $addLedgerEntry =
        function (
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


            if (
                $debit > 0 &&
                $credit > 0
            ) {

                throw new Exception(
                    'Ledger line cannot contain both debit and credit.'
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
                roundMoney(
                    $debit
                ),

                ':credit' =>
                roundMoney(
                    $credit
                )

            ]);
        };


    /*
    |--------------------------------------------------------------------------
    | SALE
    |--------------------------------------------------------------------------
    |
    | Dr Receivable
    | Cr Sales
    |
    */

    if ($type === 'sale') {

        $addLedgerEntry(

            $accountMap['receivable'],

            $partyId,

            $amount,

            0

        );


        $addLedgerEntry(

            $accountMap['sales'],

            null,

            0,

            $amount

        );
    }


    /*
    |--------------------------------------------------------------------------
    | RECEIPT
    |--------------------------------------------------------------------------
    |
    | Dr Cash / Bank
    | Cr Receivable
    |
    */

    if ($type === 'receipt') {

        $addLedgerEntry(

            $accountId,

            null,

            $amount,

            0

        );


        $addLedgerEntry(

            $accountMap['receivable'],

            $partyId,

            0,

            $amount

        );
    }


    /*
    |--------------------------------------------------------------------------
    | PAYMENT
    |--------------------------------------------------------------------------
    |
    | Dr Payable
    | Cr Cash / Bank
    |
    */

    if ($type === 'payment') {

        $addLedgerEntry(

            $accountMap['payable'],

            $partyId,

            $amount,

            0

        );


        $addLedgerEntry(

            $accountId,

            null,

            0,

            $amount

        );
    }


    /*
    |--------------------------------------------------------------------------
    | EXPENSE
    |--------------------------------------------------------------------------
    |
    | Preserve current ERP behaviour:
    |
    | Cr Payable
    |
    | Your current transactions.php intentionally treats Expense
    | differently and does not run its balancing check.
    |
    */

    if ($type === 'expense') {

        $addLedgerEntry(

            $accountMap['payable'],

            $partyId,

            0,

            $amount

        );
    }


    /*
    |--------------------------------------------------------------------------
    | CAPITAL
    |--------------------------------------------------------------------------
    */

    if ($type === 'capital') {

        foreach (
            $cleanCapitalAllocations
            as $allocation
        ) {

            $allocationAccountId =
                (int)
                $allocation['account_id'];


            $allocationAmount =
                roundMoney(
                    $allocation['amount']
                );


            if ($amount > 0) {

                /*
                 * Capital entering Cash / Bank.
                 */

                $addLedgerEntry(

                    $allocationAccountId,

                    null,

                    $allocationAmount,

                    0

                );
            } else {

                /*
                 * Capital leaving Cash / Bank.
                 */

                $addLedgerEntry(

                    $allocationAccountId,

                    null,

                    0,

                    $allocationAmount

                );
            }
        }


        if ($amount > 0) {

            $addLedgerEntry(

                $accountMap['capital'],

                null,

                0,

                abs($amount)

            );
        } else {

            $addLedgerEntry(

                $accountMap['capital'],

                null,

                abs($amount),

                0

            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFY DOUBLE-ENTRY BALANCE
    |--------------------------------------------------------------------------
    |
    | Expense remains excluded because your existing ERP
    | currently posts Expense as payable-only.
    |
    */

    if ($type !== 'expense') {

        $balanceStmt =
            $pdo->prepare("
                SELECT

                    COALESCE(
                        SUM(debit),
                        0
                    ) AS total_debit,

                    COALESCE(
                        SUM(credit),
                        0
                    ) AS total_credit

                FROM ledger_entries

                WHERE voucher_id =
                    :voucher_id

                AND company_id =
                    :company_id
            ");


        $balanceStmt->execute([

            ':voucher_id' =>
            $voucherId,

            ':company_id' =>
            $companyId

        ]);


        $ledgerBalance =
            $balanceStmt->fetch(
                PDO::FETCH_ASSOC
            );


        $totalDebit =
            roundMoney(
                $ledgerBalance['total_debit']
                    ?? 0
            );


        $totalCredit =
            roundMoney(
                $ledgerBalance['total_credit']
                    ?? 0
            );


        if (
            abs(
                $totalDebit
                    -
                    $totalCredit
            ) > 0.01
        ) {

            throw new Exception(
                'Updated voucher is not balanced.'
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | OPTIONAL EXPENSE ATTACHMENT
    |--------------------------------------------------------------------------
    |
    | Existing attachments are NOT deleted.
    |
    | Editing can add another supplier bill file.
    |
    */

    if (
        $type === 'expense' &&
        isset(
            $_FILES['bill_attachment']
        ) &&
        $_FILES['bill_attachment']['error'] !==
        UPLOAD_ERR_NO_FILE
    ) {

        $file =
            $_FILES['bill_attachment'];


        if (
            $file['error']
            !==
            UPLOAD_ERR_OK
        ) {

            throw new Exception(
                'Supplier bill upload failed.'
            );
        }


        if (
            (int)
            $file['size']
            >
            10 * 1024 * 1024
        ) {

            throw new Exception(
                'Supplier bill attachment cannot exceed 10 MB.'
            );
        }


        $finfo =
            new finfo(
                FILEINFO_MIME_TYPE
            );


        $mimeType =
            $finfo->file(
                $file['tmp_name']
            );


        $allowedMimeTypes = [

            'application/pdf' =>
            'pdf',

            'image/jpeg' =>
            'jpg',

            'image/png' =>
            'png',

            'image/webp' =>
            'webp'

        ];


        if (
            !isset(
                $allowedMimeTypes[$mimeType]
            )
        ) {

            throw new Exception(
                'Supplier bill must be PDF, JPG, PNG, or WEBP.'
            );
        }


        $storagePath =
            rtrim(
                getenv(
                    'STORAGE_PATH'
                )
                    ?: (
                        __DIR__
                        .
                        '/../../storage'
                    ),
                '/\\'
            );


        $uploadDirectory =
            $storagePath
            .
            '/uploads/accounting/vouchers/'
            .
            $companyId;


        if (
            !is_dir(
                $uploadDirectory
            ) &&
            !mkdir(
                $uploadDirectory,
                0755,
                true
            )
        ) {

            throw new Exception(
                'Unable to create supplier bill upload directory.'
            );
        }


        $storedName =
            'voucher_'
            .
            $voucherId
            .
            '_'
            .
            bin2hex(
                random_bytes(8)
            )
            .
            '.'
            .
            $allowedMimeTypes[$mimeType];


        $destination =
            $uploadDirectory
            .
            '/'
            .
            $storedName;


        if (
            !move_uploaded_file(
                $file['tmp_name'],
                $destination
            )
        ) {

            throw new Exception(
                'Unable to store supplier bill attachment.'
            );
        }


        $relativePath =
            'uploads/accounting/vouchers/'
            .
            $companyId
            .
            '/'
            .
            $storedName;


        $attachmentStmt =
            $pdo->prepare("
                INSERT INTO voucher_attachments (

                    voucher_id,
                    original_name,
                    stored_name,
                    file_path,
                    mime_type,
                    file_size

                )

                VALUES (

                    :voucher_id,
                    :original_name,
                    :stored_name,
                    :file_path,
                    :mime_type,
                    :file_size

                )
            ");


        $attachmentStmt
            ->execute([

                ':voucher_id' =>
                $voucherId,

                ':original_name' =>
                basename(
                    (string) $file['name']
                ),

                ':stored_name' =>
                $storedName,

                ':file_path' =>
                $relativePath,

                ':mime_type' =>
                $mimeType,

                ':file_size' =>
                (int) $file['size']

            ]);
    }


    /*
    |--------------------------------------------------------------------------
    | COMMIT
    |--------------------------------------------------------------------------
    */

    $pdo->commit();


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' => true,

        'message' =>
        ucfirst($type)
            .
            ' updated successfully.',

        'voucher_id' =>
        $voucherId,

        'reference_number' =>
        $referenceNumber

    ]);
} catch (Throwable $e) {

    if (
        isset($pdo) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    error_log(
        'Voucher update failed: '
            .
            $e->getMessage()
    );


    http_response_code(400);


    echo json_encode([

        'success' => false,

        'message' =>
        $e->getMessage()

    ]);
}
