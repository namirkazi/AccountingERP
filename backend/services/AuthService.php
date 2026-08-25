<?php

require_once __DIR__ . '/../models/User.php';

class AuthService
{
    private User $userModel;

    public function __construct(PDO $db)
    {
        $this->userModel = new User($db);
    }

    public function login(string $username, string $password): array
    {
        $user = $this->userModel->findByUsername($username);

        if (!$user) {
            throw new Exception('Invalid username or password.');
        }

        if (!password_verify($password, $user['password'])) {
            throw new Exception('Invalid username or password.');
        }
        $companies = $this->userModel->getUserCompanies((int) $user['id']);
        if (empty($companies)) {
            throw new Exception(
                'No company access is assigned to this user.'
            );
        }
        $activeCompany = $companies[0];

        foreach ($companies as $company) {
            if ((int) $company['is_default'] === 1) {
                $activeCompany = $company;
                break;
            }
        }
        session_regenerate_id(true);

        $_SESSION['user_id'] =
            (int) $user['id'];

        $_SESSION['company_id'] =
            (int) $activeCompany['company_id'];

        $_SESSION['company_name'] =
            $activeCompany['company_name'];

        $_SESSION['company_code'] =
            $activeCompany['company_code'];

        $_SESSION['username'] =
            $user['username'];

        $_SESSION['role'] =
            $activeCompany['role'];

        $_SESSION['full_name'] =
            $user['full_name'];

        $_SESSION['logo'] =
            $activeCompany['logo'];

        $_SESSION['company_role'] =
            $activeCompany['role'];

        return [
            'user' => [
                'id' =>
                (int) $user['id'],

                'username' =>
                $user['username'],

                'full_name' =>
                $user['full_name'],

                'role' =>
                $activeCompany['role']
            ],

            'companies' =>
            $companies,

            'active_company_id' =>
            (int) $activeCompany['company_id'],

            'active_company' =>
            $activeCompany
        ];
    }

    public function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();

            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
    }
}
