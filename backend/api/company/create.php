<?php

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/User.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated.'
    ]);

    exit;
}

$userId = (int) $_SESSION['user_id'];

$companyName = trim(
    (string) ($_POST['company_name'] ?? '')
);

$companyCode = strtoupper(
    trim(
        (string) ($_POST['company_code'] ?? '')
    )
);

if ($companyName === '') {
    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' => 'Company name is required.'
    ]);

    exit;
}

if ($companyCode === '') {
    http_response_code(422);

    echo json_encode([
        'success' => false,
        'message' => 'Company code is required.'
    ]);

    exit;
}

/*
 * Check that the currently selected company
 * belongs to the logged-in user and that the
 * user has admin access to it.
 */

$currentCompanyId =
    (int) ($_SESSION['company_id'] ?? 0);

$userModel = new User($pdo);

$currentAccess =
    $userModel->getUserCompany(
        $userId,
        $currentCompanyId
    );

if (
    !$currentAccess ||
    strtolower(
        trim(
            (string) $currentAccess['role']
        )
    ) !== 'admin'
) {
    http_response_code(403);

    echo json_encode([
        'success' => false,
        'message' =>
        'Only an administrator can create a company.'
    ]);

    exit;
}

/*
 * Check company code uniqueness.
 */

$checkStmt = $pdo->prepare("
    SELECT id
    FROM companies
    WHERE company_code = :company_code
    LIMIT 1
");

$checkStmt->execute([
    ':company_code' => $companyCode
]);

if ($checkStmt->fetch()) {
    http_response_code(409);

    echo json_encode([
        'success' => false,
        'message' => 'Company code already exists.'
    ]);

    exit;
}

/*
 * Optional company fields.
 */

$address = trim(
    (string) ($_POST['address'] ?? '')
);

$city = trim(
    (string) ($_POST['city'] ?? '')
);

$country = trim(
    (string) ($_POST['country'] ?? '')
);

$phone = trim(
    (string) ($_POST['phone'] ?? '')
);

$email = trim(
    (string) ($_POST['email'] ?? '')
);

$website = trim(
    (string) ($_POST['website'] ?? '')
);

$trn = trim(
    (string) ($_POST['trn'] ?? '')
);

$primaryColor = trim(
    (string) (
        $_POST['primary_color']
        ?? '#17202A'
    )
);

$secondaryColor = trim(
    (string) (
        $_POST['secondary_color']
        ?? '#64748B'
    )
);

$accentColor = trim(
    (string) (
        $_POST['accent_color']
        ?? '#C28B2C'
    )
);

try {

    $pdo->beginTransaction();

    /*
     * Create the company.
     */

    $stmt = $pdo->prepare("
        INSERT INTO companies (
            company_name,
            company_code,
            address,
            city,
            country,
            phone,
            email,
            website,
            trn,
            primary_color,
            secondary_color,
            accent_color
        )
        VALUES (
            :company_name,
            :company_code,
            :address,
            :city,
            :country,
            :phone,
            :email,
            :website,
            :trn,
            :primary_color,
            :secondary_color,
            :accent_color
        )
    ");

    $stmt->execute([
        ':company_name' =>
        $companyName,

        ':company_code' =>
        $companyCode,

        ':address' =>
        $address !== ''
            ? $address
            : null,

        ':city' =>
        $city !== ''
            ? $city
            : null,

        ':country' =>
        $country !== ''
            ? $country
            : null,

        ':phone' =>
        $phone !== ''
            ? $phone
            : null,

        ':email' =>
        $email !== ''
            ? $email
            : null,

        ':website' =>
        $website !== ''
            ? $website
            : null,

        ':trn' =>
        $trn !== ''
            ? $trn
            : null,

        ':primary_color' =>
        $primaryColor,

        ':secondary_color' =>
        $secondaryColor,

        ':accent_color' =>
        $accentColor
    ]);

    $newCompanyId =
        (int) $pdo->lastInsertId();
    /*
 * =====================================================
 * DEFAULT ACCOUNTING ACCOUNTS
 * =====================================================
 *
 * Every company gets its own independent
 * system accounts.
 */

    $defaultAccounts = [
        [
            'name' => 'Cash',
            'type' => 'asset',
            'subtype' => 'cash'
        ],
        [
            'name' => 'Bank',
            'type' => 'asset',
            'subtype' => 'bank'
        ],
        [
            'name' => 'Receivable',
            'type' => 'asset',
            'subtype' => 'receivable'
        ],
        [
            'name' => 'Payable',
            'type' => 'liability',
            'subtype' => 'payable'
        ],
        [
            'name' => 'Sales',
            'type' => 'income',
            'subtype' => 'sales'
        ],
        [
            'name' => 'Capital',
            'type' => 'equity',
            'subtype' => 'capital'
        ]
    ];

    $accountStmt = $pdo->prepare("
    INSERT INTO accounts (
        company_id,
        account_name,
        account_type,
        account_subtype,
        is_system_account
    )
    VALUES (
        :company_id,
        :account_name,
        :account_type,
        :account_subtype,
        1
    )
");

    foreach ($defaultAccounts as $account) {

        $accountStmt->execute([
            ':company_id' =>
            $newCompanyId,

            ':account_name' =>
            $account['name'],

            ':account_type' =>
            $account['type'],

            ':account_subtype' =>
            $account['subtype']
        ]);
    }
    /*
 * =====================================================
 * COMPANY LOGO
 * =====================================================
 */

    if (
        isset($_FILES['logo']) &&
        $_FILES['logo']['error'] !==
        UPLOAD_ERR_NO_FILE
    ) {

        $logo =
            $_FILES['logo'];


        if (
            $logo['error'] !==
            UPLOAD_ERR_OK
        ) {

            throw new Exception(
                'Unable to upload logo.'
            );
        }


        if (
            $logo['size'] >
            5 * 1024 * 1024
        ) {

            throw new Exception(
                'Logo must be smaller than 5 MB.'
            );
        }


        $allowedMimeTypes = [

            'image/jpeg',
            'image/png',
            'image/webp',

        ];


        $fileInfo =
            finfo_open(
                FILEINFO_MIME_TYPE
            );


        $mimeType =
            finfo_file(
                $fileInfo,
                $logo['tmp_name']
            );


        finfo_close(
            $fileInfo
        );


        if (
            !in_array(
                $mimeType,
                $allowedMimeTypes,
                true
            )
        ) {

            throw new Exception(
                'Only JPG, PNG and WebP logos are allowed.'
            );
        }


        $extensionMap = [

            'image/jpeg' =>
            'jpg',

            'image/png' =>
            'png',

            'image/webp' =>
            'webp',

        ];


        $extension =
            $extensionMap[$mimeType];


        $uploadDirectory =
            __DIR__ .
            '/../../uploads/company/' .
            $newCompanyId;


        if (
            !is_dir(
                $uploadDirectory
            )
        ) {

            if (
                !mkdir(
                    $uploadDirectory,
                    0755,
                    true
                )
            ) {

                throw new Exception(
                    'Unable to create logo directory.'
                );
            }
        }


        $filename =
            'logo_' .
            time() .
            '_' .
            bin2hex(
                random_bytes(4)
            ) .
            '.' .
            $extension;


        $destination =
            $uploadDirectory .
            '/' .
            $filename;


        if (
            !move_uploaded_file(
                $logo['tmp_name'],
                $destination
            )
        ) {

            throw new Exception(
                'Unable to save uploaded logo.'
            );
        }


        $logoPath =
            'uploads/company/' .
            $newCompanyId .
            '/' .
            $filename;


        $logoStmt =
            $pdo->prepare("
            UPDATE companies
            SET logo = :logo
            WHERE id = :company_id
            LIMIT 1
        ");


        $logoStmt->execute([

            ':logo' =>
            $logoPath,

            ':company_id' =>
            $newCompanyId,

        ]);
    }
    /*
     * Give the creator admin access
     * to the newly created company.
     */

    $accessStmt = $pdo->prepare("
        INSERT INTO user_companies (
            user_id,
            company_id,
            role,
            is_default,
            is_active
        )
        VALUES (
            :user_id,
            :company_id,
            'admin',
            0,
            1
        )
    ");

    $accessStmt->execute([
        ':user_id' =>
        $userId,

        ':company_id' =>
        $newCompanyId
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' =>
        'Company created successfully.',
        'data' => [
            'company_id' =>
            $newCompanyId,

            'company_name' =>
            $companyName,

            'company_code' =>
            $companyCode
        ]
    ]);
} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
        'Unable to create company.'
    ]);
}
