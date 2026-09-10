<?php

/*
|--------------------------------------------------------------------------
| Database Configuration
|--------------------------------------------------------------------------
|
| Railway provides these variables automatically from the MySQL service:
|
| MYSQLHOST
| MYSQLPORT
| MYSQLDATABASE
| MYSQLUSER
| MYSQLPASSWORD
|
| For local development, the fallback values keep the existing
| XAMPP/MariaDB setup working.
|
|--------------------------------------------------------------------------
*/

$host = getenv('MYSQLHOST') ?: 'localhost';
$port = getenv('MYSQLPORT') ?: '3306';
$db   = getenv('MYSQL_DATABASE') ?: 'accounting_erp';
$user = getenv('MYSQLUSER') ?: 'root';
$pass = getenv('MYSQL_ROOT_PASSWORD') ?: '';

$charset = 'utf8mb4';

$dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {

    $pdo = new PDO(
        $dsn,
        $user,
        $pass,
        $options
    );
} catch (PDOException $e) {

    error_log(
        'Database connection failed: ' . $e->getMessage()
    );

    http_response_code(500);

    header('Content-Type: application/json');

    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed.',
        'error' => $e->getMessage(),
    ]);

    exit;
}
