<?php
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

csrf_validate_request();

$username        = trim($_POST['username'] ?? '');
$security_answer = trim($_POST['security_answer'] ?? '');
$new_password    = $_POST['new_password'] ?? '';

if (!$username || !$security_answer || !$new_password) {
    json_error('All fields are required.');
}

if (strlen($new_password) < 8) {
    json_error('New password must be at least 8 characters.');
}

$stmt = $pdo->prepare('SELECT id, security_answer FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user) {
    json_error('User not found.', 404);
}

if (!password_verify($security_answer, $user['security_answer'])) {
    json_error('Security answer is incorrect.', 401);
}

$hashed_new_password = password_hash($new_password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
$stmt->execute([$hashed_new_password, (int)$user['id']]);

json_success(['message' => 'Password updated successfully.']);
