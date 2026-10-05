<?php

class FundAuthService
{
    private PDO $db;


    public function __construct(PDO $db)
    {
        $this->db = $db;
    }


    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */

    public function login(
        string $username,
        string $password
    ): array {

        $stmt =
            $this->db->prepare("
                SELECT
                    id,
                    username,
                    password,
                    full_name,
                    role,
                    is_active

                FROM fund_users

                WHERE username = :username

                LIMIT 1
            ");


        $stmt->execute([
            ':username' =>
            $username
        ]);


        $user =
            $stmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$user) {

            throw new Exception(
                'Invalid username or password.'
            );
        }


        if (
            (int) $user['is_active']
            !== 1
        ) {

            throw new Exception(
                'This Funds account is inactive.'
            );
        }


        if (
            !password_verify(
                $password,
                $user['password']
            )
        ) {

            throw new Exception(
                'Invalid username or password.'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | PREVENT SESSION FIXATION
        |--------------------------------------------------------------------------
        */

        session_regenerate_id(true);


        /*
        |--------------------------------------------------------------------------
        | FUNDS SESSION
        |--------------------------------------------------------------------------
        |
        | Notice:
        |
        | We do NOT use:
        |
        | $_SESSION['user_id']
        | $_SESSION['company_id']
        | $_SESSION['role']
        |
        | Those belong to the Accounting ERP.
        |
        */

        $_SESSION['fund_user_id'] =
            (int) $user['id'];

        $_SESSION['fund_username'] =
            $user['username'];

        $_SESSION['fund_full_name'] =
            $user['full_name'];

        $_SESSION['fund_role'] =
            $user['role'];


        return [

            'id' =>
            (int) $user['id'],

            'username' =>
            $user['username'],

            'full_name' =>
            $user['full_name'],

            'role' =>
            $user['role']

        ];
    }


    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    public function logout(): void
    {
        unset(
            $_SESSION['fund_user_id'],
            $_SESSION['fund_username'],
            $_SESSION['fund_full_name'],
            $_SESSION['fund_role']
        );
    }
}
