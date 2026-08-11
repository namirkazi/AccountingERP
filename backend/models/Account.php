<?php

class Account
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getAll(int $companyId): array
    {
        $stmt = $this->db->prepare("
            SELECT
                id,
                account_name,
                account_type,
                account_subtype,
                is_system_account
            FROM accounts
            WHERE company_id = :company_id
            ORDER BY account_type, account_name
        ");

        $stmt->execute([
            ':company_id' => $companyId
        ]);

        return $stmt->fetchAll();
    }

    public function findByName(
        int $companyId,
        string $name
    ): ?array {

        $stmt = $this->db->prepare("
            SELECT
                id,
                account_name,
                account_type,
                account_subtype
            FROM accounts
            WHERE company_id = :company_id
            AND account_name = :account_name
            LIMIT 1
        ");

        $stmt->execute([
            ':company_id' => $companyId,
            ':account_name' => $name
        ]);

        $account = $stmt->fetch();

        return $account ?: null;
    }

    public function findById(
        int $companyId,
        int $id
    ): ?array {

        $stmt = $this->db->prepare("
            SELECT
                id,
                account_name,
                account_type,
                account_subtype
            FROM accounts
            WHERE company_id = :company_id
            AND id = :id
            LIMIT 1
        ");

        $stmt->execute([
            ':company_id' => $companyId,
            ':id' => $id
        ]);

        $account = $stmt->fetch();

        return $account ?: null;
    }
}