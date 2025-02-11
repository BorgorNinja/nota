<?php
header("Content-Type: application/json");
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$action  = $_POST['action'] ?? '';

try {
    if ($action === 'fetch') {
        $stmt = $pdo->prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC");
        $stmt->execute([$user_id]);
        $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'notes' => $notes]);
        exit;
    }

    if ($action === 'create') {
        $content = $_POST['content'] ?? 'New note...';
        $stmt = $pdo->prepare("INSERT INTO notes (user_id, content) VALUES (?, ?)");
        $stmt->execute([$user_id, $content]);
        echo json_encode(['success' => true, 'note_id' => $pdo->lastInsertId()]);
        exit;
    }

    if ($action === 'update') {
        $note_id = $_POST['note_id'] ?? 0;
        $content = $_POST['content'] ?? '';
        $stmt = $pdo->prepare("UPDATE notes SET content = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$content, $note_id, $user_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'delete') {
        $note_id = $_POST['note_id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM notes WHERE id = ? AND user_id = ?");
        $stmt->execute([$note_id, $user_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'toggle_public') {
        $note_id = $_POST['note_id'] ?? 0;
        $public = (int)($_POST['public'] ?? 0);
        
        if ($public === 1) {
            try {
                $token = bin2hex(random_bytes(5));
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Token generation failed.']);
                exit;
            }
            $stmt = $pdo->prepare("UPDATE notes SET is_public = 1, public_token = ? WHERE id = ? AND user_id = ?");
            $stmt->execute([$token, $note_id, $user_id]);
        } else {
            $stmt = $pdo->prepare("UPDATE notes SET is_public = 0, public_token = NULL WHERE id = ? AND user_id = ?");
            $stmt->execute([$note_id, $user_id]);
        }
        $stmt = $pdo->prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?");
        $stmt->execute([$note_id, $user_id]);
        $updatedNote = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'note' => $updatedNote]);
        exit;
    }
    
    echo json_encode(['success' => false, 'message' => 'Invalid action.']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
