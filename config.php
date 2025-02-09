<?php
// config.php
// Adjust these values as needed:
$host    = "localhost";
$dbname  = "nota_app";
$dbuser  = "root";    // Replace with your DB username
$dbpass  = "";    // Replace with your DB password

try {
    // Try connecting to the database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $dbuser, $dbpass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    // If the database doesn't exist, create it
    if (strpos($e->getMessage(), "Unknown database") !== false) {
        $pdo_temp = new PDO("mysql:host=$host", $dbuser, $dbpass);
        $pdo_temp->exec("CREATE DATABASE IF NOT EXISTS $dbname CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo = new PDO("mysql:host=$host;dbname=$dbname", $dbuser, $dbpass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } else {
        die("Could not connect to the database: " . $e->getMessage());
    }
}

// Create the 'users' table if it does not exist
$pdo->exec("
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    security_question VARCHAR(255) NOT NULL,
    security_answer VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
");

// Create the 'notes' table if it does not exist
$pdo->exec("
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
");
?>
