<?php

require_once __DIR__ . '/../../config/cors.php';

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';


if ($_SERVER['REQUEST_METHOD'] !== 'GET') {

    header('Content-Type: application/json');

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


    $attachmentId =
        isset($_GET['id'])
        ? (int) $_GET['id']
        : 0;


    if ($attachmentId <= 0) {

        header('Content-Type: application/json');

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Attachment ID is required.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | FIND ATTACHMENT
    |--------------------------------------------------------------------------
    |
    | Verify through the voucher that this attachment belongs to:
    |
    | 1. The current company
    | 2. An Expense voucher
    |
    */

    $stmt =
        $pdo->prepare("
            SELECT
                va.id,
                va.voucher_id,
                va.original_name,
                va.stored_name,
                va.file_path,
                va.mime_type,
                va.file_size,

                v.company_id,
                v.voucher_type

            FROM voucher_attachments va

            INNER JOIN vouchers v
                ON v.id = va.voucher_id

            WHERE va.id = :attachment_id

            AND v.company_id = :company_id

            AND v.voucher_type = 'EXPENSE'

            LIMIT 1
        ");


    $stmt->execute([

        ':attachment_id' =>
        $attachmentId,

        ':company_id' =>
        $companyId

    ]);


    $attachment =
        $stmt->fetch(PDO::FETCH_ASSOC);


    if (!$attachment) {

        header('Content-Type: application/json');

        http_response_code(404);

        echo json_encode([
            'success' => false,
            'message' => 'Supplier bill attachment not found.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | STORAGE
    |--------------------------------------------------------------------------
    */

    $storagePath =
        rtrim(
            getenv('STORAGE_PATH')
                ?: (__DIR__ . '/../../storage'),
            '/\\'
        );


    $relativePath =
        ltrim(
            (string) $attachment['file_path'],
            '/\\'
        );


    $absolutePath =
        $storagePath
        . DIRECTORY_SEPARATOR
        . str_replace(
            ['/', '\\'],
            DIRECTORY_SEPARATOR,
            $relativePath
        );


    /*
    |--------------------------------------------------------------------------
    | SECURITY CHECK
    |--------------------------------------------------------------------------
    */

    $storageRealPath =
        realpath($storagePath);

    $fileRealPath =
        realpath($absolutePath);


    if (
        !$storageRealPath ||
        !$fileRealPath ||
        !is_file($fileRealPath)
    ) {

        header('Content-Type: application/json');

        http_response_code(404);

        echo json_encode([
            'success' => false,
            'message' => 'Supplier bill file was not found.'
        ]);

        exit;
    }


    $storagePrefix =
        rtrim(
            $storageRealPath,
            DIRECTORY_SEPARATOR
        )
        . DIRECTORY_SEPARATOR;


    if (
        strpos(
            $fileRealPath,
            $storagePrefix
        ) !== 0
    ) {

        header('Content-Type: application/json');

        http_response_code(403);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid attachment path.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | MIME TYPE
    |--------------------------------------------------------------------------
    */

    $allowedMimeTypes = [

        'application/pdf',

        'image/jpeg',

        'image/png',

        'image/webp'

    ];


    $mimeType =
        trim(
            (string) (
                $attachment['mime_type']
                ?? ''
            )
        );


    if (
        !in_array(
            $mimeType,
            $allowedMimeTypes,
            true
        )
    ) {

        $finfo =
            new finfo(
                FILEINFO_MIME_TYPE
            );


        $mimeType =
            $finfo->file(
                $fileRealPath
            );
    }


    if (
        !in_array(
            $mimeType,
            $allowedMimeTypes,
            true
        )
    ) {

        header('Content-Type: application/json');

        http_response_code(415);

        echo json_encode([
            'success' => false,
            'message' => 'Unsupported supplier bill file type.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | DISPLAY FILE INLINE
    |--------------------------------------------------------------------------
    */

    $fileName =
        basename(
            (string) (
                $attachment['original_name']
                ?: 'supplier-bill'
            )
        );


    $safeFileName =
        preg_replace(
            '/[^A-Za-z0-9._ -]/',
            '_',
            $fileName
        );


    session_write_close();


    header(
        'Content-Type: '
            . $mimeType
    );


    header(
        'Content-Length: '
            . filesize($fileRealPath)
    );


    header(
        'Content-Disposition: inline; filename="'
            . addcslashes(
                $safeFileName,
                "\"\\"
            )
            . '"'
    );


    header(
        'X-Content-Type-Options: nosniff'
    );


    readfile(
        $fileRealPath
    );

    exit;
} catch (Throwable $e) {

    error_log(
        'Voucher attachment error: '
            . $e->getMessage()
    );


    header('Content-Type: application/json');

    http_response_code(500);


    echo json_encode([
        'success' => false,
        'message' => 'Unable to load supplier bill attachment.'
    ]);
}
