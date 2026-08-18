<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
include 'connection.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = requireRole($conn);

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS ai_user_progress (
  user_id INT NOT NULL,
  data_json LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = mysqli_prepare($conn, 'SELECT data_json, updated_at FROM ai_user_progress WHERE user_id = ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'i', $user['id']);
    mysqli_stmt_execute($stmt);
    $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    echo json_encode([
        'status' => 'success',
        'data' => $row ? (json_decode($row['data_json'], true) ?: []) : [],
        'updated_at' => $row['updated_at'] ?? null,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Metode tidak didukung.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true) ?: [];
$progress = $payload['data'] ?? null;
if (!is_array($progress)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Data progres tidak valid.']);
    exit;
}

$json = json_encode($progress, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false || strlen($json) > 1048576) {
    http_response_code(413);
    echo json_encode(['status' => 'error', 'message' => 'Data progres terlalu besar.']);
    exit;
}

$stmt = mysqli_prepare($conn, "INSERT INTO ai_user_progress (user_id, data_json) VALUES (?, ?)
  ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = CURRENT_TIMESTAMP");
mysqli_stmt_bind_param($stmt, 'is', $user['id'], $json);
$success = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

echo json_encode(['status' => $success ? 'success' : 'error']);
?>
