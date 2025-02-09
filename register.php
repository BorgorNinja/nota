<?php
// register.php
session_start();
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the POST data
    $username          = trim($_POST['username']);
    $password          = $_POST['password'];
    $security_question = trim($_POST['security_question']);
    $security_answer   = trim($_POST['security_answer']);

    if (!$username || !$password || !$security_question || !$security_answer) {
        echo json_encode(['success' => false, 'message' => 'All fields are required.']);
        exit;
    }

    // Hash the password and security answer
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $hashed_security_answer = password_hash($security_answer, PASSWORD_DEFAULT);

    // Insert the new user into the database
    $stmt = $pdo->prepare("INSERT INTO users (username, password, security_question, security_answer) VALUES (?, ?, ?, ?)");
    try {
        $stmt->execute([$username, $hashed_password, $security_question, $hashed_security_answer]);
        echo json_encode(['success' => true, 'message' => 'Registration successful.']);

    } catch (PDOException $e) {
        // Handle duplicate username error (error code 1062)
        if ($e->errorInfo[1] == 1062) {
            echo json_encode(['success' => false, 'message' => 'Username already exists.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
        }
    }
}
?>
