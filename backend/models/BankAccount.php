<?php

class BankAccount
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Get all bank accounts belonging to a company.
     */
    public function getAll(
        int $companyId,
        bool $includeInactive = true
    ): array {

        $sql = "
            SELECT
                ba.id,
                ba.company_id,
                ba.bank_name,
                ba.account_name,
                ba.account_number,
                ba.iban,
                ba.currency,
                ba.accounting_account_id,
                ba.is_active,
                ba.created_at,
                ba.updated_at,

                a.account_name AS ledger_account_name,
                a.account_type,
                a.account_subtype

            FROM bank_accounts ba

            INNER JOIN accounts a
                ON a.id = ba.accounting_account_id
                AND a.company_id = ba.company_id

            WHERE ba.company_id = :company_id
        ";

        if (!$includeInactive) {
            $sql .= "
                AND ba.is_active = 1
            ";
        }

        $sql .= "
            ORDER BY
                ba.bank_name ASC,
                ba.account_name ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':company_id' => $companyId
        ]);

        return $stmt->fetchAll();
    }


    /**
     * Find one bank account belonging to a company.
     */
    public function findById(
        int $companyId,
        int $id
    ): ?array {

        $stmt = $this->db->prepare("
            SELECT
                ba.id,
                ba.company_id,
                ba.bank_name,
                ba.account_name,
                ba.account_number,
                ba.iban,
                ba.currency,
                ba.accounting_account_id,
                ba.is_active,
                ba.created_at,
                ba.updated_at,

                a.account_name AS ledger_account_name,
                a.account_type,
                a.account_subtype

            FROM bank_accounts ba

            INNER JOIN accounts a
                ON a.id = ba.accounting_account_id
                AND a.company_id = ba.company_id

            WHERE ba.id = :id
            AND ba.company_id = :company_id

            LIMIT 1
        ");

        $stmt->execute([
            ':id' => $id,
            ':company_id' => $companyId
        ]);

        $account = $stmt->fetch();

        return $account ?: null;
    }


    /**
     * Check whether another bank account with the same
     * account name already exists for the company.
     */
    public function nameExists(
        int $companyId,
        string $accountName,
        ?int $excludeId = null
    ): bool {

        $sql = "
            SELECT id
            FROM bank_accounts
            WHERE company_id = :company_id
            AND LOWER(account_name) = LOWER(:account_name)
        ";

        $params = [
            ':company_id' => $companyId,
            ':account_name' => $accountName
        ];

        if ($excludeId !== null) {
            $sql .= "
                AND id != :exclude_id
            ";

            $params[':exclude_id'] = $excludeId;
        }

        $sql .= " LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }
}