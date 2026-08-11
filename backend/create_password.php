<?php

$passwords = [
    'test_admin' => 'Test@12345',
    'test' => 'Test@12345',
    'mohinii_admin' => 'Mohinii@12345',
    'mohinii' => 'Mohinii@12345',
    'ambitious_admin' => 'Ambitious@12345',
    'ambitious' => 'Ambitious@12345'
];

foreach ($passwords as $username => $password) {

    echo $username . PHP_EOL;
    echo password_hash($password, PASSWORD_DEFAULT) . PHP_EOL;
    echo PHP_EOL;
}