<?php

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';


$username =
    'fundadmin';

$password =
    'FundAdmin@12345';

$fullName =
    'Funds Administrator';


$passwordHash =
    password_hash(
        $password,
        PASSWORD_DEFAULT
    );


$stmt =
    $pdo->prepare("
        INSERT INTO fund_users (
            username,
            password,
            full_name,
            role,
            is_active
        )

        VALUES (
            :username,
            :password,
            :full_name,
            'admin',
            1
        )
    ");


$stmt->execute([

    ':username' =>
    $username,

    ':password' =>
    $passwordHash,

    ':full_name' =>
    $fullName

]);


echo 'Funds admin created.';
