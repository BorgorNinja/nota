<?php
// config.php

// Set session cookie parameters BEFORE starting the session.
$cookie_lifetime = 86400; // 24 hours
session_set_cookie_params([
    'lifetime' => $cookie_lifetime,
    'path'     => '/',        // Available throughout the domain
    'domain'   => '',         // Current domain
    'secure'   => false,      // Set to true if using HTTPS
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

$host   = 'localhost';
$dbname = 'nota_app';
$dbuser = 'root';    // <-- change this to your DB username
$dbpass = '';    // <-- change this to your DB password

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

// Create the users table if it does not exist.
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    security_question VARCHAR(255) NOT NULL,
    security_answer VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB");

// Create the notes table if it does not exist (with the new columns included).
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

// Helper function to check if a column exists in a table.
function columnExists($pdo, $table, $column) {
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
    $stmt->execute([$column]);
    return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
}

// If the 'notes' table exists but is missing 'is_public', add it.
if (!columnExists($pdo, 'notes', 'is_public')) {
    $pdo->exec("ALTER TABLE notes ADD COLUMN is_public TINYINT(1) DEFAULT 0 AFTER content");
}

// If the 'notes' table exists but is missing 'public_token', add it.
if (!columnExists($pdo, 'notes', 'public_token')) {
    $pdo->exec("ALTER TABLE notes ADD COLUMN public_token VARCHAR(255) DEFAULT NULL AFTER is_public");
}
?>
