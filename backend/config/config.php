<?php

header('Content-Type: application/json');

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();
