<?php
// reset_password.php
session_start();
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username        = trim($_POST['username']);
    $security_answer = trim($_POST['security_answer']);
    $new_password    = $_POST['new_password'];

    if (!$username || !$security_answer || !$new_password) {
        echo json_encode(['success' => false, 'message' => 'All fields are required.']);
        exit;
    }

    // Retrieve user record
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found.']);
        exit;
    }

    // Verify the security answer
    if (!password_verify($security_answer, $user['security_answer'])) {
        echo json_encode(['success' => false, 'message' => 'Security answer is incorrect.']);
        exit;
    }

    // Update the password
    $hashed_new_password = password_hash($new_password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashed_new_password, $user['id']]);
    echo json_encode(['success' => true, 'message' => 'Password updated successfully.']);
}
?>
