<?php

require_once __DIR__ . '/../models/User.php';


class AuthService
{
    private User $userModel;

    private PDO $db;


    public function __construct(PDO $db)
    {
        $this->db = $db;

        $this->userModel =
            new User($db);
    }


    public function login(
        string $username,
        string $password
    ): array {

        /*
        |--------------------------------------------------------------------------
        | CHECK ACCOUNTING USER
        |--------------------------------------------------------------------------
        */

        $accountingUser =
            $this->userModel
            ->findByUsername(
                $username
            );


        /*
        |--------------------------------------------------------------------------
        | CHECK FUNDS USER
        |--------------------------------------------------------------------------
        */

        $fundStmt =
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


        $fundStmt->execute([
            ':username' =>
            $username
        ]);


        $fundUser =
            $fundStmt->fetch(
                PDO::FETCH_ASSOC
            );


        /*
        |--------------------------------------------------------------------------
        | PREVENT AMBIGUOUS USERNAMES
        |--------------------------------------------------------------------------
        */

        if (
            $accountingUser &&
            $fundUser
        ) {

            throw new Exception(
                'This username exists in more than one system. Please use a unique username.'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | FUNDS LOGIN
        |--------------------------------------------------------------------------
        */

        if ($fundUser) {

            if (
                (int) $fundUser['is_active']
                !== 1
            ) {

                throw new Exception(
                    'This account is inactive.'
                );
            }


            if (
                !password_verify(
                    $password,
                    $fundUser['password']
                )
            ) {

                throw new Exception(
                    'Invalid username or password.'
                );
            }


            session_regenerate_id(true);


            /*
             * Remove old Accounting state.
             */

            unset(
                $_SESSION['user_id'],
                $_SESSION['company_id'],
                $_SESSION['company_name'],
                $_SESSION['company_code'],
                $_SESSION['username'],
                $_SESSION['role'],
                $_SESSION['full_name'],
                $_SESSION['logo'],
                $_SESSION['company_role']
            );


            /*
             * Funds state.
             */

            $_SESSION['portal'] =
                'funds';

            $_SESSION['fund_user_id'] =
                (int) $fundUser['id'];

            $_SESSION['fund_username'] =
                $fundUser['username'];

            $_SESSION['fund_full_name'] =
                $fundUser['full_name'];

            $_SESSION['fund_role'] =
                $fundUser['role'];


            return [

                'portal' =>
                'funds',

                'user' => [

                    'id' =>
                    (int) $fundUser['id'],

                    'username' =>
                    $fundUser['username'],

                    'full_name' =>
                    $fundUser['full_name'],

                    'role' =>
                    $fundUser['role'],

                    'portal' =>
                    'funds'

                ],

                'companies' =>
                [],

                'active_company_id' =>
                null,

                'active_company' =>
                null

            ];
        }


        /*
        |--------------------------------------------------------------------------
        | ACCOUNTING LOGIN
        |--------------------------------------------------------------------------
        */

        if (!$accountingUser) {

            throw new Exception(
                'Invalid username or password.'
            );
        }


        if (
            !password_verify(
                $password,
                $accountingUser['password']
            )
        ) {

            throw new Exception(
                'Invalid username or password.'
            );
        }


        $companies =
            $this->userModel
            ->getUserCompanies(
                (int) $accountingUser['id']
            );


        if (empty($companies)) {

            throw new Exception(
                'No company access is assigned to this user.'
            );
        }


        $activeCompany =
            $companies[0];


        foreach (
            $companies
            as $company
        ) {

            if (
                (int) $company['is_default']
                === 1
            ) {

                $activeCompany =
                    $company;

                break;
            }
        }


        session_regenerate_id(true);


        /*
         * Remove previous Funds state.
         */

        unset(
            $_SESSION['fund_user_id'],
            $_SESSION['fund_username'],
            $_SESSION['fund_full_name'],
            $_SESSION['fund_role']
        );


        /*
         * Accounting state.
         */

        $_SESSION['portal'] =
            'accounting';

        $_SESSION['user_id'] =
            (int) $accountingUser['id'];

        $_SESSION['company_id'] =
            (int) $activeCompany['company_id'];

        $_SESSION['company_name'] =
            $activeCompany['company_name'];

        $_SESSION['company_code'] =
            $activeCompany['company_code'];

        $_SESSION['username'] =
            $accountingUser['username'];

        $_SESSION['role'] =
            $activeCompany['role'];

        $_SESSION['full_name'] =
            $accountingUser['full_name'];

        $_SESSION['logo'] =
            $activeCompany['logo'];

        $_SESSION['company_role'] =
            $activeCompany['role'];


        return [

            'portal' =>
            'accounting',

            'user' => [

                'id' =>
                (int) $accountingUser['id'],

                'username' =>
                $accountingUser['username'],

                'full_name' =>
                $accountingUser['full_name'],

                'role' =>
                $activeCompany['role'],

                'portal' =>
                'accounting'

            ],

            'companies' =>
            $companies,

            'active_company_id' =>
            (int) $activeCompany['company_id'],

            'active_company' =>
            $activeCompany

        ];
    }
}
