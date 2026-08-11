<?php

class Party
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function search(
        int $companyId,
        string $search
    ): array {

        $stmt = $this->db->prepare("
            SELECT
                id,
                party_name,
                party_type,
                phone,
                email
            FROM parties
            WHERE company_id = :company_id
            AND party_name LIKE :search
            ORDER BY party_name ASC
            LIMIT 10
        ");

        $stmt->execute([
            ':company_id' => $companyId,
            ':search' => '%' . $search . '%'
        ]);

        return $stmt->fetchAll();
    }

    public function find(
        int $companyId,
        int $id
    ): ?array {

        $stmt = $this->db->prepare("
            SELECT
                id,
                party_name,
                party_type,
                phone,
                email,
                address,
                tax_number
            FROM parties
            WHERE company_id = :company_id
            AND id = :id
            LIMIT 1
        ");

        $stmt->execute([
            ':company_id' => $companyId,
            ':id' => $id
        ]);

        $party = $stmt->fetch();

        return $party ?: null;
    }

    public function create(
        int $companyId,
        string $name,
        string $type,
        ?string $phone = null,
        ?string $email = null
    ): int {

        $stmt = $this->db->prepare("
            INSERT INTO parties (
                company_id,
                party_name,
                party_type,
                phone,
                email
            )
            VALUES (
                :company_id,
                :party_name,
                :party_type,
                :phone,
                :email
            )
        ");

        $stmt->execute([
            ':company_id' => $companyId,
            ':party_name' => $name,
            ':party_type' => $type,
            ':phone' => $phone,
            ':email' => $email
        ]);

        return (int) $this->db->lastInsertId();
    }
}