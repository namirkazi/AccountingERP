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

    if ($companyId <= 0) {
        throw new Exception('Company not found.');
    }

    $date = trim(
        $_GET['date'] ?? ''
    );

    if ($date === '') {
        $date = date('Y-m-d');
    }

    $dateObject = DateTime::createFromFormat(
        'Y-m-d',
        $date
    );

    if (
        !$dateObject ||
        $dateObject->format('Y-m-d') !== $date
    ) {
        throw new Exception('Invalid Receipt date.');
    }

    $year = (int) $dateObject->format('Y');

    $prefix = 'RECEIPT';

    $stmt = $pdo->prepare("
        SELECT reference_number
        FROM vouchers
        WHERE company_id = :company_id
          AND voucher_type = 'RECEIPT'
          AND voucher_date >= :year_start
          AND voucher_date < :next_year_start
          AND reference_number IS NOT NULL
          AND reference_number <> ''
          AND reference_number LIKE :pattern
        ORDER BY id DESC
    ");

    $yearStart =
        $year . '-01-01';

    $nextYearStart =
        ($year + 1) . '-01-01';

    $stmt->execute([
        ':company_id' =>
            $companyId,

        ':year_start' =>
            $yearStart,

        ':next_year_start' =>
            $nextYearStart,

        ':pattern' =>
            $prefix
            . '/'
            . $year
            . '/%'
    ]);

    $highestSequence = 0;

    while ($row = $stmt->fetch()) {

        $reference =
            trim(
                (string) $row['reference_number']
            );

        $pattern =
            '#^'
            . preg_quote(
                $prefix,
                '#'
            )
            . '/'
            . $year
            . '/([0-9]+)$#';

        if (
            preg_match(
                $pattern,
                $reference,
                $matches
            )
        ) {

            $sequence =
                (int) $matches[1];

            if (
                $sequence >
                $highestSequence
            ) {
                $highestSequence =
                    $sequence;
            }
        }
    }

    $nextSequence =
        $highestSequence + 1;

    $receiptNumber =
        $prefix
        . '/'
        . $year
        . '/'
        . str_pad(
            (string) $nextSequence,
            5,
            '0',
            STR_PAD_LEFT
        );

    echo json_encode([
        'success' => true,

        'data' => [
            'receipt_number' =>
                $receiptNumber,

            'year' =>
                $year,

            'sequence' =>
                $nextSequence
        ]
    ]);

} catch (Throwable $e) {

    error_log(
        'Receipt number error: '
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'Unable to generate Receipt number.'
    ]);
}