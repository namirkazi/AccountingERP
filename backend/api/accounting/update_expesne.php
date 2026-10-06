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

        $data = $_POST;
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
            'Invalid expense update request.'
        );
    }


    $voucherId =
        (int) (
            $data['voucher_id']
            ?? 0
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
        round(
            (float) (
                $data['amount']
                ?? 0
            ),
            2
        );


    $vatOutput =
        round(
            (float) (
                $data['vat_output']
                ?? 0
            ),
            2
        );


    $narration =
        trim(
            (string) (
                $data['narration']
                ?? ''
            )
        );


    $items =
        $data['items']
        ?? [];


    if (is_string($items)) {

        $items =
            json_decode(
                $items,
                true
            );
    }


    if (!is_array($items)) {

        $items = [];
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($voucherId <= 0) {

        throw new Exception(
            'Expense voucher ID is required.'
        );
    }


    if ($date === '') {

        throw new Exception(
            'Expense date is required.'
        );
    }


    $dateObject =
        DateTime::createFromFormat(
            'Y-m-d',
            $date
        );


    if (
        !$dateObject ||
        $dateObject->format('Y-m-d')
        !== $date
    ) {

        throw new Exception(
            'Invalid expense date.'
        );
    }


    if ($partyId <= 0) {

        throw new Exception(
            'Please select a supplier.'
        );
    }


    if ($billReference === '') {

        throw new Exception(
            'Supplier bill/reference number is required.'
        );
    }


    if ($amount <= 0) {

        throw new Exception(
            'Expense total must be greater than zero.'
        );
    }


    if ($vatOutput < 0) {

        throw new Exception(
            'VAT cannot be negative.'
        );
    }


    if ($vatOutput > $amount) {

        throw new Exception(
            'VAT cannot be greater than the expense total.'
        );
    }


    if (count($items) === 0) {

        throw new Exception(
            'At least one expense item is required.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFY SUPPLIER
    |--------------------------------------------------------------------------
    */

    $partyStmt =
        $pdo->prepare("
            SELECT
                id,
                party_name,
                party_type

            FROM parties

            WHERE id = :party_id
            AND company_id = :company_id
            AND party_type = 'supplier'

            LIMIT 1
        ");


    $partyStmt->execute([
        ':party_id' =>
        $partyId,

        ':company_id' =>
        $companyId
    ]);


    $supplier =
        $partyStmt->fetch(
            PDO::FETCH_ASSOC
        );


    if (!$supplier) {

        throw new Exception(
            'Selected supplier is invalid.'
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
    | CURRENT EXPENSE
    |--------------------------------------------------------------------------
    */

    $expenseStmt =
        $pdo->prepare("
            SELECT
                id,
                party_id,
                amount,
                reference_number,
                bill_reference

            FROM vouchers

            WHERE id = :voucher_id
            AND company_id = :company_id
            AND voucher_type = 'EXPENSE'

            LIMIT 1

            FOR UPDATE
        ");


    $expenseStmt->execute([
        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId
    ]);


    $expense =
        $expenseStmt->fetch(
            PDO::FETCH_ASSOC
        );


    if (!$expense) {

        throw new Exception(
            'Expense voucher not found.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CHECK EXISTING PAYMENTS
    |--------------------------------------------------------------------------
    |
    | Supports:
    |
    | 1. old source_voucher_id payments
    | 2. payment_allocations
    |
    */

    $paidStmt =
        $pdo->prepare("
            SELECT

                COALESCE(
                    (
                        SELECT
                            SUM(p.amount)

                        FROM vouchers p

                        WHERE p.company_id =
                            :legacy_company_id

                        AND p.voucher_type =
                            'PAYMENT'

                        AND p.source_voucher_id =
                            :legacy_expense_id

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
                            :allocation_company_id

                        AND pa.expense_voucher_id =
                            :allocation_expense_id
                    ),
                    0
                )

                AS paid_amount
        ");


    $paidStmt->execute([

        ':legacy_company_id' =>
        $companyId,

        ':legacy_expense_id' =>
        $voucherId,

        ':allocation_company_id' =>
        $companyId,

        ':allocation_expense_id' =>
        $voucherId

    ]);


    $paidAmount =
        round(
            (float)
            $paidStmt->fetchColumn(),
            2
        );


    /*
     * Cannot reduce the bill below what
     * has already been paid.
     */

    if (
        $amount + 0.001
        <
        $paidAmount
    ) {

        throw new Exception(
            'Expense cannot be reduced below the amount already paid. '
                . 'Paid amount: AED '
                . number_format(
                    $paidAmount,
                    2
                )
        );
    }


    /*
     * Changing supplier after payments exist
     * would leave historical payment ledger
     * entries attached to the old supplier.
     */

    if (
        $paidAmount > 0 &&
        (int) $expense['party_id']
        !== $partyId
    ) {

        throw new Exception(
            'Supplier cannot be changed because payments already exist for this expense.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | PAYABLE ACCOUNT
    |--------------------------------------------------------------------------
    */

    $payableStmt =
        $pdo->prepare("
            SELECT id

            FROM accounts

            WHERE company_id = :company_id
            AND account_subtype = 'payable'

            LIMIT 1
        ");


    $payableStmt->execute([
        ':company_id' =>
        $companyId
    ]);


    $payableAccountId =
        (int)
        $payableStmt->fetchColumn();


    if ($payableAccountId <= 0) {

        throw new Exception(
            'Payable account is missing.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE ITEMS
    |--------------------------------------------------------------------------
    */

    $cleanItems = [];


    foreach ($items as $item) {

        if (!is_array($item)) {

            throw new Exception(
                'Invalid expense item.'
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
            $description === '' ||
            $quantity <= 0 ||
            $rate < 0
        ) {

            throw new Exception(
                'Every expense item requires a description, quantity and valid rate.'
            );
        }


        $cleanItems[] = [

            'supplier_item_id' =>
            !empty($item['supplier_item_id']
                ?? $item['supplierItemId']
                ?? null)
                ? (int) (
                    $item['supplier_item_id']
                    ?? $item['supplierItemId']
                )
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
            round(
                $quantity * $rate,
                2
            )
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE VOUCHER
    |--------------------------------------------------------------------------
    |
    | Keep reference_number unchanged.
    |
    | That is the internal EXPENSE/... voucher number.
    |
    */

    $updateStmt =
        $pdo->prepare("
            UPDATE vouchers

            SET
                voucher_date = :voucher_date,
                bill_reference = :bill_reference,
                party_id = :party_id,
                amount = :amount,
                vat_input = 0,
                vat_output = :vat_output,
                narration = :narration

            WHERE id = :voucher_id
            AND company_id = :company_id
            AND voucher_type = 'EXPENSE'
        ");


    $updateStmt->execute([

        ':voucher_date' =>
        $date,

        ':bill_reference' =>
        $billReference,

        ':party_id' =>
        $partyId,

        ':amount' =>
        $amount,

        ':vat_output' =>
        $vatOutput,

        ':narration' =>
        $narration !== ''
            ? $narration
            : 'Expense transaction',

        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId

    ]);


    /*
    |--------------------------------------------------------------------------
    | REBUILD ITEMS
    |--------------------------------------------------------------------------
    */

    $deleteItems =
        $pdo->prepare("
            DELETE FROM voucher_items
            WHERE voucher_id = :voucher_id
        ");


    $deleteItems->execute([
        ':voucher_id' =>
        $voucherId
    ]);


    $itemStmt =
        $pdo->prepare("
            INSERT INTO voucher_items (
                voucher_id,
                supplier_item_id,
                customer_service_id,
                description,
                unit,
                quantity,
                rate,
                amount
            )

            VALUES (
                :voucher_id,
                :supplier_item_id,
                NULL,
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

        $itemStmt->execute([

            ':voucher_id' =>
            $voucherId,

            ':supplier_item_id' =>
            $item['supplier_item_id'],

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


    /*
    |--------------------------------------------------------------------------
    | REBUILD EXPENSE LEDGER
    |--------------------------------------------------------------------------
    */

    $deleteLedger =
        $pdo->prepare("
            DELETE FROM ledger_entries

            WHERE voucher_id = :voucher_id
            AND company_id = :company_id
        ");


    $deleteLedger->execute([

        ':voucher_id' =>
        $voucherId,

        ':company_id' =>
        $companyId

    ]);


    /*
     * Current Accounting design creates the
     * supplier payable on the Expense voucher.
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
                0,
                :credit
            )
        ");


    $ledgerStmt->execute([

        ':company_id' =>
        $companyId,

        ':voucher_id' =>
        $voucherId,

        ':account_id' =>
        $payableAccountId,

        ':party_id' =>
        $partyId,

        ':credit' =>
        $amount

    ]);


    /*
    |--------------------------------------------------------------------------
    | OPTIONAL REPLACEMENT ATTACHMENT
    |--------------------------------------------------------------------------
    */

    if (
        isset(
            $_FILES['bill_attachment']
        ) &&
        $_FILES['bill_attachment']['error']
        !== UPLOAD_ERR_NO_FILE
    ) {

        $file =
            $_FILES['bill_attachment'];


        if (
            $file['error']
            !== UPLOAD_ERR_OK
        ) {

            throw new Exception(
                'Supplier bill upload failed.'
            );
        }


        if (
            (int) $file['size']
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
                'Supplier bill must be a PDF, JPG, PNG, or WEBP file.'
            );
        }


        $storagePath =
            rtrim(
                getenv(
                    'STORAGE_PATH'
                )
                    ?: (
                        __DIR__
                        . '/../../storage'
                    ),
                '/\\'
            );


        $uploadDirectory =
            $storagePath
            . '/uploads/accounting/vouchers/'
            . $companyId;


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
                'Unable to create upload directory.'
            );
        }


        $storedName =
            'voucher_'
            . $voucherId
            . '_'
            . bin2hex(
                random_bytes(8)
            )
            . '.'
            . $allowedMimeTypes[$mimeType];


        $destination =
            $uploadDirectory
            . '/'
            . $storedName;


        if (
            !move_uploaded_file(
                $file['tmp_name'],
                $destination
            )
        ) {

            throw new Exception(
                'Unable to store supplier bill.'
            );
        }


        $relativePath =
            'uploads/accounting/vouchers/'
            . $companyId
            . '/'
            . $storedName;


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


        $attachmentStmt->execute([

            ':voucher_id' =>
            $voucherId,

            ':original_name' =>
            basename(
                $file['name']
            ),

            ':stored_name' =>
            $storedName,

            ':file_path' =>
            $relativePath,

            ':mime_type' =>
            $mimeType,

            ':file_size' =>
            (int)
            $file['size']

        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | COMMIT
    |--------------------------------------------------------------------------
    */

    $pdo->commit();


    $outstanding =
        round(
            $amount
                -
                $paidAmount,
            2
        );


    echo json_encode([

        'success' => true,

        'message' =>
        'Expense updated successfully.',

        'data' => [

            'voucher_id' =>
            $voucherId,

            'reference_number' =>
            $expense['reference_number'],

            'bill_reference' =>
            $billReference,

            'amount' =>
            $amount,

            'paid_amount' =>
            $paidAmount,

            'outstanding_amount' =>
            $outstanding

        ]

    ]);
} catch (Throwable $e) {

    if (
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    error_log(
        'Update expense error: '
            . $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>
        $e->getMessage()

    ]);
}
