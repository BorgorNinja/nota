<?php
require_once __DIR__ . '/../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

if (!isset($_SESSION['user_id'])) {
    json_error('Not authenticated.', 401);
}

$user_id = (int)$_SESSION['user_id'];
$action = $_POST['action'] ?? '';

// Allow fetch without CSRF for easier caching; all state-changing actions require CSRF.
$csrf_required_actions = ['create', 'update', 'update_meta', 'delete', 'toggle_public', 'restore', 'import'];
if (in_array($action, $csrf_required_actions, true)) {
    csrf_validate_request();
}

function get_note(PDO $pdo, int $note_id, int $user_id) {
    $stmt = $pdo->prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?');
    $stmt->execute([$note_id, $user_id]);
    return $stmt->fetch();
}

function trim_versions(PDO $pdo, int $note_id, int $user_id, int $max_versions = 20): void {
    $stmt = $pdo->prepare('SELECT id FROM note_versions WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC, id DESC');
    $stmt->execute([$note_id, $user_id]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (count($ids) <= $max_versions) return;
    $to_delete = array_slice($ids, $max_versions);
    $placeholders = implode(',', array_fill(0, count($to_delete), '?'));
    $params = array_merge($to_delete);
    $pdo->prepare("DELETE FROM note_versions WHERE id IN ($placeholders)")->execute($params);
}

try {
    if ($action === 'fetch') {
        $stmt = $pdo->prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC');
        $stmt->execute([$user_id]);
        $notes = $stmt->fetchAll();
        json_success(['notes' => $notes]);
    }

    if ($action === 'create') {
        $content = $_POST['content'] ?? '';
        $title = trim($_POST['title'] ?? '');
        $tags = trim($_POST['tags'] ?? '');

        if ($title === '') {
            // Default title based on first line of content
            $firstLine = trim(strtok(str_replace("\r", "", (string)$content), "\n"));
            $title = $firstLine !== '' ? mb_substr($firstLine, 0, 80) : 'Untitled';
        }

        $stmt = $pdo->prepare('INSERT INTO notes (user_id, title, content, tags) VALUES (?, ?, ?, ?)');
        $stmt->execute([$user_id, $title, $content, $tags ?: null]);
        json_success(['note_id' => (int)$pdo->lastInsertId()]);
    }

    if ($action === 'update') {
        $note_id = (int)($_POST['note_id'] ?? 0);
        $content = $_POST['content'] ?? '';
        if (!$note_id) json_error('Invalid note id.');

        $note = get_note($pdo, $note_id, $user_id);
        if (!$note) json_error('Note not found.', 404);

        // Save a version only when content actually changes.
        if ((string)$note['content'] !== (string)$content) {
            $stmt = $pdo->prepare('INSERT INTO note_versions (note_id, user_id, content) VALUES (?, ?, ?)');
            $stmt->execute([$note_id, $user_id, $note['content']]);
            trim_versions($pdo, $note_id, $user_id);
        }

        // If the user hasn't set a title, keep it in sync with first line.
        $title = trim($_POST['title'] ?? '');
        $should_update_title = false;
        if ($title !== '') {
            $should_update_title = true;
        } elseif (empty($note['title'])) {
            $firstLine = trim(strtok(str_replace("\r", "", (string)$content), "\n"));
            $title = $firstLine !== '' ? mb_substr($firstLine, 0, 80) : 'Untitled';
            $should_update_title = true;
        }

        if ($should_update_title) {
            $stmt = $pdo->prepare('UPDATE notes SET content = ?, title = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$content, $title, $note_id, $user_id]);
        } else {
            $stmt = $pdo->prepare('UPDATE notes SET content = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$content, $note_id, $user_id]);
        }

        json_success();
    }

    if ($action === 'update_meta') {
        $note_id = (int)($_POST['note_id'] ?? 0);
        if (!$note_id) json_error('Invalid note id.');

        $title = trim($_POST['title'] ?? '');
        $tags = trim($_POST['tags'] ?? '');
        $is_pinned = isset($_POST['is_pinned']) ? (int)($_POST['is_pinned']) : null;

        // Build a dynamic update to avoid clobbering values unintentionally.
        $fields = [];
        $params = [];

        if ($title !== '') {
            $fields[] = 'title = ?';
            $params[] = $title;
        }
        if ($tags !== '') {
            $fields[] = 'tags = ?';
            $params[] = $tags;
        } elseif (array_key_exists('tags', $_POST) && $tags === '') {
            $fields[] = 'tags = NULL';
        }
        if ($is_pinned !== null) {
            $fields[] = 'is_pinned = ?';
            $params[] = $is_pinned ? 1 : 0;
        }

        if (empty($fields)) {
            json_error('No changes provided.');
        }

        $params[] = $note_id;
        $params[] = $user_id;

        $sql = 'UPDATE notes SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        json_success();
    }

    if ($action === 'delete') {
        $note_id = (int)($_POST['note_id'] ?? 0);
        if (!$note_id) json_error('Invalid note id.');

        $stmt = $pdo->prepare('DELETE FROM notes WHERE id = ? AND user_id = ?');
        $stmt->execute([$note_id, $user_id]);
        json_success();
    }

    if ($action === 'toggle_public') {
        $note_id = (int)($_POST['note_id'] ?? 0);
        $public = (int)($_POST['public'] ?? 0);
        if (!$note_id) json_error('Invalid note id.');

        if ($public === 1) {
            $token = bin2hex(random_bytes(8));
            $stmt = $pdo->prepare('UPDATE notes SET is_public = 1, public_token = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$token, $note_id, $user_id]);
        } else {
            $stmt = $pdo->prepare('UPDATE notes SET is_public = 0, public_token = NULL WHERE id = ? AND user_id = ?');
            $stmt->execute([$note_id, $user_id]);
        }

        $note = get_note($pdo, $note_id, $user_id);
        json_success(['note' => $note]);
    }

    if ($action === 'history') {
        // Read-only; does not require CSRF.
        $note_id = (int)($_POST['note_id'] ?? 0);
        if (!$note_id) json_error('Invalid note id.');

        $stmt = $pdo->prepare('SELECT id, created_at, LEFT(content, 200) AS preview FROM note_versions WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC, id DESC LIMIT 20');
        $stmt->execute([$note_id, $user_id]);
        $versions = $stmt->fetchAll();

        json_success(['versions' => $versions]);
    }

    if ($action === 'restore') {
        $note_id = (int)($_POST['note_id'] ?? 0);
        $version_id = (int)($_POST['version_id'] ?? 0);
        if (!$note_id || !$version_id) json_error('Invalid restore request.');

        $note = get_note($pdo, $note_id, $user_id);
        if (!$note) json_error('Note not found.', 404);

        $stmt = $pdo->prepare('SELECT content FROM note_versions WHERE id = ? AND note_id = ? AND user_id = ?');
        $stmt->execute([$version_id, $note_id, $user_id]);
        $ver = $stmt->fetch();
        if (!$ver) json_error('Version not found.', 404);

        // Save current content as a version before restore.
        $stmt = $pdo->prepare('INSERT INTO note_versions (note_id, user_id, content) VALUES (?, ?, ?)');
        $stmt->execute([$note_id, $user_id, $note['content']]);
        trim_versions($pdo, $note_id, $user_id);

        $stmt = $pdo->prepare('UPDATE notes SET content = ? WHERE id = ? AND user_id = ?');
        $stmt->execute([$ver['content'], $note_id, $user_id]);

        json_success();
    }

    if ($action === 'export') {
        // Read-only; does not require CSRF.
        $stmt = $pdo->prepare('SELECT id, title, content, tags, is_pinned, is_public, public_token, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC');
        $stmt->execute([$user_id]);
        $notes = $stmt->fetchAll();

        json_success([
            'exported_at' => gmdate('c'),
            'notes' => $notes
        ]);
    }

    if ($action === 'import') {
        $payload = $_POST['payload'] ?? '';
        if (!$payload) json_error('Missing payload.');

        $data = json_decode($payload, true);
        if (!is_array($data) || empty($data['notes']) || !is_array($data['notes'])) {
            json_error('Invalid import file.');
        }

        $insert = $pdo->prepare('INSERT INTO notes (user_id, title, content, tags, is_pinned, is_public, public_token) VALUES (?, ?, ?, ?, ?, 0, NULL)');
        $imported = 0;

        foreach ($data['notes'] as $n) {
            $title = trim((string)($n['title'] ?? 'Untitled'));
            $content = (string)($n['content'] ?? '');
            $tags = trim((string)($n['tags'] ?? ''));
            $is_pinned = !empty($n['is_pinned']) ? 1 : 0;

            // Basic safety: cap sizes
            if (mb_strlen($title) > 255) $title = mb_substr($title, 0, 255);
            if (mb_strlen($tags) > 255) $tags = mb_substr($tags, 0, 255);

            $insert->execute([$user_id, $title, $content, $tags ?: null, $is_pinned]);
            $imported++;

            if ($imported >= 200) break; // prevent abuse
        }

        json_success(['imported' => $imported]);
    }

    json_error('Invalid action.');
} catch (PDOException $e) {
    json_error('Server error.', 500, ['detail' => $e->getMessage()]);
} catch (Exception $e) {
    json_error('Server error.', 500, ['detail' => $e->getMessage()]);
}
