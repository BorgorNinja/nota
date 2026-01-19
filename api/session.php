<?php
require_once __DIR__ . '/../includes/bootstrap.php';

$authenticated = isset($_SESSION['user_id']);

json_success([
    'authenticated' => $authenticated,
    'username' => $authenticated ? ($_SESSION['username'] ?? null) : null,
    'csrf_token' => csrf_get_token()
]);
