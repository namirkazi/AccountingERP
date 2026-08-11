<?php

class Customer
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getAll(int $companyId, string $search = ''): array
    {
        $sql = "
            SELECT
                id,
                customer_name,
                phone,
                email,
                address,
                tax_number,
                opening_balance,
                opening_balance_type,
                created_at,
                updated_at
            FROM customers
            WHERE company_id = :company_id
        ";

        $params = [
            ':company_id' => $companyId
        ];

        if ($search !== '') {

            $sql .= "
                AND (
                    customer_name LIKE :search
                    OR phone LIKE :search
                    OR email LIKE :search
                )
            ";

            $params[':search'] = '%' . $search . '%';
        }

        $sql .= "
            ORDER BY customer_name ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public function findById(
        int $companyId,
        int $id
    ): ?array {

        $stmt = $this->db->prepare("
            SELECT
                id,
                customer_name,
                phone,
                email,
                address,
                tax_number,
                opening_balance,
                opening_balance_type,
                created_at,
                updated_at
            FROM customers
            WHERE id = :id
            AND company_id = :company_id
            LIMIT 1
        ");

        $stmt->execute([
            ':id' => $id,
            ':company_id' => $companyId
        ]);

        $customer = $stmt->fetch();

        return $customer ?: null;
    }

    public function create(
        int $companyId,
        array $data
    ): int {

        $stmt = $this->db->prepare("
            INSERT INTO customers (
                company_id,
                customer_name,
                phone,
                email,
                address,
                tax_number,
                opening_balance,
                opening_balance_type
            )
            VALUES (
                :company_id,
                :customer_name,
                :phone,
                :email,
                :address,
                :tax_number,
                :opening_balance,
                :opening_balance_type
            )
        ");

        $stmt->execute([
            ':company_id' => $companyId,
            ':customer_name' => $data['customer_name'],
            ':phone' => $data['phone'],
            ':email' => $data['email'],
            ':address' => $data['address'],
            ':tax_number' => $data['tax_number'],
            ':opening_balance' => $data['opening_balance'],
            ':opening_balance_type' => $data['opening_balance_type']
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(
        int $companyId,
        int $id,
        array $data
    ): bool {

        $stmt = $this->db->prepare("
            UPDATE customers
            SET
                customer_name = :customer_name,
                phone = :phone,
                email = :email,
                address = :address,
                tax_number = :tax_number,
                opening_balance = :opening_balance,
                opening_balance_type = :opening_balance_type
            WHERE id = :id
            AND company_id = :company_id
        ");

        $stmt->execute([
            ':id' => $id,
            ':company_id' => $companyId,
            ':customer_name' => $data['customer_name'],
            ':phone' => $data['phone'],
            ':email' => $data['email'],
            ':address' => $data['address'],
            ':tax_number' => $data['tax_number'],
            ':opening_balance' => $data['opening_balance'],
            ':opening_balance_type' => $data['opening_balance_type']
        ]);

        return $stmt->rowCount() > 0;
    }

    public function delete(
        int $companyId,
        int $id
    ): bool {

        $stmt = $this->db->prepare("
            DELETE FROM customers
            WHERE id = :id
            AND company_id = :company_id
        ");

        $stmt->execute([
            ':id' => $id,
            ':company_id' => $companyId
        ]);

        return $stmt->rowCount() > 0;
    }
}