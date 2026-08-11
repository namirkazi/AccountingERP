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
}