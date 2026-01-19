<?php
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

csrf_validate_request();

$username          = trim($_POST['username'] ?? '');
$password          = $_POST['password'] ?? '';
$security_question = trim($_POST['security_question'] ?? '');
$security_answer   = trim($_POST['security_answer'] ?? '');

if (!$username || !$password || !$security_question || !$security_answer) {
    json_error('All fields are required.');
}

// Basic username guardrails
if (!preg_match('/^[a-zA-Z0-9_\.\-]{3,50}$/', $username)) {
    json_error('Username must be 3-50 characters and contain only letters, numbers, underscore, dot, or dash.');
}

if (strlen($password) < 8) {
    json_error('Password must be at least 8 characters.');
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);
$hashed_security_answer = password_hash($security_answer, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO users (username, password, security_question, security_answer) VALUES (?, ?, ?, ?)');

try {
    $stmt->execute([$username, $hashed_password, $security_question, $hashed_security_answer]);
    json_success(['message' => 'Registration successful. You can now log in.']);
} catch (PDOException $e) {
    // 1062 = duplicate
    if (!empty($e->errorInfo[1]) && (int)$e->errorInfo[1] === 1062) {
        json_error('Username already exists.', 409);
    }

    json_error('Registration failed.', 500);
}
