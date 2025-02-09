<?php
// public_note.php
require_once 'config.php';

$token = $_GET['token'] ?? '';
if (!$token) {
    echo "Invalid public note link.";
    exit;
}

$stmt = $pdo->prepare("SELECT n.*, u.username FROM notes n JOIN users u ON n.user_id = u.id WHERE n.public_token = ? AND n.is_public = 1");
$stmt->execute([$token]);
$note = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$note) {
    echo "Note not found or not public.";
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Public Note - <?php echo htmlspecialchars($note['username']); ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #9975e5;
            color: #2b1063;
            padding: 20px;
        }
        .note {
            background: white;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 20px auto;
        }
        .note-header {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="note">
        <div class="note-header">
            <strong>Note by <?php echo htmlspecialchars($note['username']); ?></strong>
            <span><?php echo date("F j, Y, g:i a", strtotime($note['updated_at'])); ?></span>
        </div>
        <div class="note-content">
            <?php echo nl2br(htmlspecialchars($note['content'])); ?>
        </div>
    </div>
</body>
</html>
