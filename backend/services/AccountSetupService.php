<?php

class AccountSetupService
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function createDefaultAccounts(int $companyId): void
    {
        $accounts = [
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

        $stmt = $this->db->prepare("
            INSERT IGNORE INTO accounts
            (
                company_id,
                account_name,
                account_type,
                account_subtype,
                is_system_account
            )
            VALUES
            (
                :company_id,
                :account_name,
                :account_type,
                :account_subtype,
                1
            )
        ");

        foreach ($accounts as $account) {

            $stmt->execute([
                ':company_id' => $companyId,
                ':account_name' => $account['name'],
                ':account_type' => $account['type'],
                ':account_subtype' => $account['subtype']
            ]);
        }
    }
}