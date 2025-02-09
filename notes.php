<?php
// notes.php
session_start();
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$action  = $_POST['action'] ?? '';

if ($action == 'fetch') {
    $stmt = $pdo->prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC");
    $stmt->execute([$user_id]);
    $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'notes' => $notes]);
    exit;
}

if ($action == 'create') {
    $content = $_POST['content'] ?? 'New note...';
    $stmt = $pdo->prepare("INSERT INTO notes (user_id, content) VALUES (?, ?)");
    $stmt->execute([$user_id, $content]);
    echo json_encode(['success' => true, 'note_id' => $pdo->lastInsertId()]);
    exit;
}

if ($action == 'update') {
    $note_id = $_POST['note_id'] ?? 0;
    $content = $_POST['content'] ?? '';
    $stmt = $pdo->prepare("UPDATE notes SET content = ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$content, $note_id, $user_id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($action == 'delete') {
    $note_id = $_POST['note_id'] ?? 0;
    $stmt = $pdo->prepare("DELETE FROM notes WHERE id = ? AND user_id = ?");
    $stmt->execute([$note_id, $user_id]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action.']);
?>
