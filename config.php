<?php
// config.php

// Set session cookie parameters BEFORE starting the session.
$cookie_lifetime = 86400; // 24 hours
session_set_cookie_params([
    'lifetime' => $cookie_lifetime,
    'path'     => '/',        // cookie available across the entire domain
    'domain'   => '',         // current domain
    'secure'   => false,      // set to true if using HTTPS
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

$host   = 'localhost';
$dbname = 'nota_app';
$dbuser = 'root';    // <-- Change this to your DB username
$dbpass = '';    // <-- Change this to your DB password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $dbuser, $dbpass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // If the database doesn't exist, create it.
    if (strpos($e->getMessage(), 'Unknown database') !== false) {
        $pdo_temp = new PDO("mysql:host=$host", $dbuser, $dbpass);
        $pdo_temp->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo = new PDO("mysql:host=$host;dbname=$dbname", $dbuser, $dbpass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } else {
        die("Database connection failed: " . $e->getMessage());
    }
}

// Create the "users" table if it does not exist.
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    security_question VARCHAR(255) NOT NULL,
    security_answer VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB");

// Create the "notes" table if it does not exist (with share/public note columns).
$pdo->exec("CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT,
    is_public TINYINT(1) DEFAULT 0,
    public_token VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB");
?>
