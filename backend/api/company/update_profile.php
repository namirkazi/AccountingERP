<?php

require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/middleware/auth.php';


try {

    if (
        $_SERVER['REQUEST_METHOD'] !== 'POST'
    ) {

        http_response_code(405);

        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed.'
        ]);

        exit;
    }


    $companyId =
        getCurrentCompanyId();


    if (!$companyId) {

        throw new Exception(
            'Company could not be determined.'
        );
    }


    /*
     * =====================================================
     * FORM VALUES
     * =====================================================
     */

    $name =
        trim(
            $_POST['name'] ?? ''
        );

    $address =
        trim(
            $_POST['address'] ?? ''
        );

    $city =
        trim(
            $_POST['city'] ?? ''
        );

    $country =
        trim(
            $_POST['country'] ?? ''
        );

    $phone =
        trim(
            $_POST['phone'] ?? ''
        );

    $email =
        trim(
            $_POST['email'] ?? ''
        );

    $website =
        trim(
            $_POST['website'] ?? ''
        );

    $trn =
        trim(
            $_POST['trn'] ?? ''
        );

    $primaryColor =
        trim(
            $_POST['primary_color'] ?? ''
        );

    $secondaryColor =
        trim(
            $_POST['secondary_color'] ?? ''
        );

    $accentColor =
        trim(
            $_POST['accent_color'] ?? ''
        );


    if ($name === '') {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' =>
            'Company name is required.'
        ]);

        exit;
    }


    /*
     * =====================================================
     * LOGO
     * =====================================================
     */

    $logoPath = null;


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

            'image/jpeg' => 'jpg',

            'image/png' => 'png',

            'image/webp' => 'webp',

        ];


        $extension =
            $extensionMap[$mimeType];


        /*
         * Store company logos in a company-specific
         * directory so one company's logo cannot
         * overwrite another company's logo.
         */

        $storagePath = rtrim(
            getenv('STORAGE_PATH')
                ?: (__DIR__ . '/../../storage'),
            '/\\'
        );

        $uploadDirectory =
            $storagePath .
            '/uploads/company/' .
            $companyId;

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


        /*
         * This path is stored in the database.
         *
         * Adjust the public uploads prefix if your
         * backend is served from a different base URL.
         */

        $logoPath =
            'uploads/company/' .
            $companyId .
            '/' .
            $filename;
    }


    /*
     * =====================================================
     * UPDATE COMPANY
     * =====================================================
     */

    if ($logoPath !== null) {

        $stmt =
            $pdo->prepare("
                UPDATE companies
                SET
                    company_name = :name,
                    logo = :logo,
                    address = :address,
                    city = :city,
                    country = :country,
                    phone = :phone,
                    email = :email,
                    website = :website,
                    trn = :trn,
                    primary_color = :primary_color,
                    secondary_color = :secondary_color,
                    accent_color = :accent_color
                WHERE id = :company_id
                LIMIT 1
            ");


        $stmt->execute([

            ':name' =>
            $name,

            ':logo' =>
            $logoPath,

            ':address' =>
            $address,

            ':city' =>
            $city,

            ':country' =>
            $country,

            ':phone' =>
            $phone,

            ':email' =>
            $email,

            ':website' =>
            $website,

            ':trn' =>
            $trn,

            ':primary_color' =>
            $primaryColor,

            ':secondary_color' =>
            $secondaryColor,

            ':accent_color' =>
            $accentColor,

            ':company_id' =>
            $companyId,

        ]);
    } else {

        $stmt =
            $pdo->prepare("
                UPDATE companies
                SET
                    company_name = :name,
                    address = :address,
                    city = :city,
                    country = :country,
                    phone = :phone,
                    email = :email,
                    website = :website,
                    trn = :trn,
                    primary_color = :primary_color,
                    secondary_color = :secondary_color,
                    accent_color = :accent_color
                WHERE id = :company_id
                LIMIT 1
            ");


        $stmt->execute([

            ':name' =>
            $name,

            ':address' =>
            $address,

            ':city' =>
            $city,

            ':country' =>
            $country,

            ':phone' =>
            $phone,

            ':email' =>
            $email,

            ':website' =>
            $website,

            ':trn' =>
            $trn,

            ':primary_color' =>
            $primaryColor,

            ':secondary_color' =>
            $secondaryColor,

            ':accent_color' =>
            $accentColor,

            ':company_id' =>
            $companyId,

        ]);
    }


    /*
     * =====================================================
     * RETURN UPDATED PROFILE
     * =====================================================
     */

    $profileStmt =
        $pdo->prepare("
            SELECT
                id,
                company_name AS name,
                logo,
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
            FROM companies
            WHERE id = :company_id
            LIMIT 1
        ");


    $profileStmt->execute([
        ':company_id' =>
        $companyId
    ]);


    $company =
        $profileStmt->fetch();


    if (!$company) {

        throw new Exception(
            'Company profile not found.'
        );
    }
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
            ltrim($company['logo'], '/');

        if (is_file($logoFilePath)) {

            $mimeType =
                mime_content_type($logoFilePath);

            $logoContents =
                file_get_contents($logoFilePath);

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


    echo json_encode([

        'success' => true,

        'message' =>
        'Company profile updated successfully.',

        'company' => [

            'id' =>
            (int) $company['id'],

            'name' =>
            $company['name'],

            'logo' =>
            $company['logo'],

            'logo_data' =>
            $logoData,

            'address' =>
            $company['address'],

            'city' =>
            $company['city'],

            'country' =>
            $company['country'],

            'phone' =>
            $company['phone'],

            'email' =>
            $company['email'],

            'website' =>
            $company['website'],

            'trn' =>
            $company['trn'],

            'theme' => [

                'primary' =>
                $company['primary_color'],

                'secondary' =>
                $company['secondary_color'],

                'accent' =>
                $company['accent_color'],

            ],

        ],

    ]);
} catch (Throwable $e) {

    error_log(
        'Company profile update error: ' .
            $e->getMessage()
    );


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>
        $e->getMessage(),

    ]);
}
