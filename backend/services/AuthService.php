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

        session_regenerate_id(true);

        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['company_id'] = (int) $user['company_id'];
        $_SESSION['company_name'] = $user['company_name'];
        $_SESSION['company_code'] = $user['company_code'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['logo'] = $user['logo'];

        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'company_id' => (int) $user['company_id'],
            'company_name' => $user['company_name'],
            'company_code' => $user['company_code'],
            'logo' => $user['logo']
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