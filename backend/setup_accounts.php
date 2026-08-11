<?php

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/services/AccountSetupService.php';

$setup = new AccountSetupService($pdo);

$companies = $pdo->query("
    SELECT id, company_name
    FROM companies
    ORDER BY id
")->fetchAll();

foreach ($companies as $company) {

    $setup->createDefaultAccounts(
        (int) $company['id']
    );

    echo "Accounts created for: "
        . $company['company_name']
        . PHP_EOL;
}

echo PHP_EOL;
echo "Account setup complete.";