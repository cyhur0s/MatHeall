<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit();

include "connection.php";
enforceRateLimit($conn, 'password-reset', 5, 3600);
$data = json_decode(file_get_contents("php://input"), true);
$username = trim($data["username"] ?? "");
if ($username === "") {
    echo json_encode(["status" => "error", "message" => "Username wajib diisi."]);
    exit;
}

$check = mysqli_prepare($conn, "SELECT id FROM users WHERE username = ? LIMIT 1");
mysqli_stmt_bind_param($check, "s", $username);
mysqli_stmt_execute($check);
if (mysqli_num_rows(mysqli_stmt_get_result($check)) === 0) {
    echo json_encode(["status" => "success", "message" => "Jika username terdaftar, permintaan reset akan diteruskan kepada admin."]);
    exit;
}

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS ai_password_reset_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  status ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  KEY reset_username_status (username, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pending = mysqli_prepare($conn, "SELECT id FROM ai_password_reset_requests WHERE username=? AND status='pending' LIMIT 1");
mysqli_stmt_bind_param($pending, "s", $username);
mysqli_stmt_execute($pending);
$pendingRow = mysqli_fetch_assoc(mysqli_stmt_get_result($pending));
if ($pendingRow) {
    $stmt = mysqli_prepare($conn, "UPDATE ai_password_reset_requests SET requested_at=CURRENT_TIMESTAMP WHERE id=?");
    mysqli_stmt_bind_param($stmt, "i", $pendingRow["id"]);
} else {
    $stmt = mysqli_prepare($conn, "INSERT INTO ai_password_reset_requests (username, status) VALUES (?, 'pending')");
    mysqli_stmt_bind_param($stmt, "s", $username);
}
mysqli_stmt_execute($stmt);
logActivity($conn, "password_reset", "User '{$username}' mengajukan reset password.");
echo json_encode(["status" => "success", "message" => "Jika username terdaftar, permintaan reset akan diteruskan kepada admin."]);
?>
