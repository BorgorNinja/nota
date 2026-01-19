<?php
// includes/csrf.php

function csrf_get_token(): string {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        // Session should be started by config.php, but be defensive.
        session_start();
    }

    if (empty($_SESSION['csrf_token'])) {
        try {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        } catch (Exception $e) {
            // Fallback; not ideal, but avoids hard failure on older PHP setups.
            $_SESSION['csrf_token'] = bin2hex(openssl_random_pseudo_bytes(32));
        }
    }

    return $_SESSION['csrf_token'];
}

function csrf_validate_request(): void {
    $token = '';

    // Prefer header, but allow form field for older clients.
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    if (!empty($headers['X-CSRF-Token'])) {
        $token = $headers['X-CSRF-Token'];
    } elseif (!empty($headers['x-csrf-token'])) {
        $token = $headers['x-csrf-token'];
    } elseif (!empty($_POST['csrf_token'])) {
        $token = $_POST['csrf_token'];
    }

    $expected = csrf_get_token();

    if (!$token || !hash_equals($expected, $token)) {
        require_once __DIR__ . '/response.php';
        json_error('Invalid CSRF token. Please refresh and try again.', 403);
    }
}
