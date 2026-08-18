<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
include 'connection.php';

$currentUser = requireRole($conn, 'user');
$userId = (int) $currentUser['id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function jsonBody() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

if ($method === 'GET') {
    $sessionId = (int) ($_GET['session_id'] ?? 0);
    if ($sessionId > 0) {
        $check = mysqli_prepare($conn, 'SELECT id, title FROM ai_chat_sessions WHERE id = ? AND user_id = ? LIMIT 1');
        mysqli_stmt_bind_param($check, 'ii', $sessionId, $userId);
        mysqli_stmt_execute($check);
        $session = mysqli_fetch_assoc(mysqli_stmt_get_result($check));
        mysqli_stmt_close($check);
        if (!$session) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Percakapan tidak ditemukan.']);
            exit;
        }
        $messages = [];
        $stmt = mysqli_prepare($conn, 'SELECT id, role, message, created_at FROM ai_chat_messages WHERE session_id = ? ORDER BY id ASC');
        mysqli_stmt_bind_param($stmt, 'i', $sessionId);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        while ($row = mysqli_fetch_assoc($result)) $messages[] = $row;
        mysqli_stmt_close($stmt);
        echo json_encode(['status' => 'success', 'session' => $session, 'messages' => $messages]);
        exit;
    }

    $sessions = [];
    $stmt = mysqli_prepare($conn, "SELECT s.id, s.title, s.created_at, s.updated_at,
      (SELECT message FROM ai_chat_messages WHERE session_id = s.id ORDER BY id DESC LIMIT 1) AS preview
      FROM ai_chat_sessions s WHERE s.user_id = ? ORDER BY s.updated_at DESC LIMIT 50");
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    while ($row = mysqli_fetch_assoc($result)) $sessions[] = $row;
    mysqli_stmt_close($stmt);
    echo json_encode(['status' => 'success', 'sessions' => $sessions]);
    exit;
}

if ($method === 'POST') {
    $data = jsonBody();
    $sessionId = (int) ($data['session_id'] ?? 0);
    $role = ($data['role'] ?? '') === 'user' ? 'user' : (($data['role'] ?? '') === 'ai' ? 'ai' : '');
    $message = trim((string) ($data['message'] ?? ''));

    if ($sessionId === 0) {
        $title = mb_substr(trim((string) ($data['title'] ?? 'Percakapan baru')), 0, 120);
        if ($title === '') $title = 'Percakapan baru';
        $stmt = mysqli_prepare($conn, 'INSERT INTO ai_chat_sessions (user_id, title) VALUES (?, ?)');
        mysqli_stmt_bind_param($stmt, 'is', $userId, $title);
        mysqli_stmt_execute($stmt);
        $sessionId = (int) mysqli_insert_id($conn);
        mysqli_stmt_close($stmt);
    } else {
        $check = mysqli_prepare($conn, 'SELECT id FROM ai_chat_sessions WHERE id = ? AND user_id = ? LIMIT 1');
        mysqli_stmt_bind_param($check, 'ii', $sessionId, $userId);
        mysqli_stmt_execute($check);
        $owned = mysqli_num_rows(mysqli_stmt_get_result($check)) > 0;
        mysqli_stmt_close($check);
        if (!$owned) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Percakapan tidak ditemukan.']);
            exit;
        }
    }

    if ($role && $message !== '') {
        $safeMessage = mb_substr($message, 0, 12000);
        $stmt = mysqli_prepare($conn, 'INSERT INTO ai_chat_messages (session_id, role, message) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iss', $sessionId, $role, $safeMessage);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        mysqli_query($conn, 'UPDATE ai_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ' . $sessionId);
    }
    echo json_encode(['status' => 'success', 'session_id' => $sessionId]);
    exit;
}

if ($method === 'DELETE') {
    $sessionId = (int) ($_GET['session_id'] ?? 0);
    $check = mysqli_prepare($conn, 'SELECT id FROM ai_chat_sessions WHERE id = ? AND user_id = ? LIMIT 1');
    mysqli_stmt_bind_param($check, 'ii', $sessionId, $userId);
    mysqli_stmt_execute($check);
    $owned = mysqli_num_rows(mysqli_stmt_get_result($check)) > 0;
    mysqli_stmt_close($check);
    if (!$owned) {
        http_response_code(404);
        echo json_encode(['status' => 'error']);
        exit;
    }
    mysqli_query($conn, 'DELETE FROM ai_chat_messages WHERE session_id = ' . $sessionId);
    mysqli_query($conn, 'DELETE FROM ai_chat_sessions WHERE id = ' . $sessionId . ' AND user_id = ' . $userId);
    echo json_encode(['status' => 'success']);
    exit;
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Metode tidak didukung.']);
?>
