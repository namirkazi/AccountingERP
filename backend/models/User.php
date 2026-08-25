<?php

class User
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findByUsername(string $username): ?array
    {
        $sql = "
            SELECT
                u.id,
                u.company_id,
                u.username,
                u.password,
                u.role,
                u.full_name,
                c.company_name,
                c.company_code,
                c.logo
            FROM users u
            INNER JOIN companies c
                ON c.id = u.company_id
            WHERE u.username = :username
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':username' => $username
        ]);

        $user = $stmt->fetch();

        return $user ?: null;
    }
    public function getUserCompanies(int $userId): array
    {
        $sql = "
        SELECT
            uc.id AS user_company_id,
            uc.user_id,
            uc.company_id,
            uc.role,
            uc.is_default,
            uc.is_active,

            c.company_name,
            c.company_code,
            c.logo,
            c.address,
            c.city,
            c.country,
            c.phone,
            c.email,
            c.website,
            c.trn,
            c.primary_color,
            c.secondary_color,
            c.accent_color

        FROM user_companies uc

        INNER JOIN companies c
            ON c.id = uc.company_id

        WHERE uc.user_id = :user_id
          AND uc.is_active = 1

        ORDER BY
            uc.is_default DESC,
            c.company_name ASC
    ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':user_id' => $userId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    public function getUserCompany(
        int $userId,
        int $companyId
    ): ?array {
        $sql = "
        SELECT
            uc.id AS user_company_id,
            uc.user_id,
            uc.company_id,
            uc.role,
            uc.is_default,
            uc.is_active,

            c.company_name,
            c.company_code,
            c.logo,
            c.address,
            c.city,
            c.country,
            c.phone,
            c.email,
            c.website,
            c.trn,
            c.primary_color,
            c.secondary_color,
            c.accent_color

        FROM user_companies uc

        INNER JOIN companies c
            ON c.id = uc.company_id

        WHERE uc.user_id = :user_id
          AND uc.company_id = :company_id
          AND uc.is_active = 1

        LIMIT 1
    ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }
}
