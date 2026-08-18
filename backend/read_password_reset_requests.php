<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;
include "connection.php";
requireRole($conn, "admin");
mysqli_query($conn, "CREATE TABLE IF NOT EXISTS ai_password_reset_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  status ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  KEY reset_username_status (username, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$result = mysqli_query($conn, "SELECT id, username, status, requested_at FROM ai_password_reset_requests WHERE status='pending' ORDER BY requested_at DESC");
$data = [];
while ($result && $row = mysqli_fetch_assoc($result)) $data[] = $row;
echo json_encode($data);
?>
