<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once "connection.php";

// Buat tabel jika belum ada
$createTable = "CREATE TABLE IF NOT EXISTS video_tutor (
    id_video INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    url_video VARCHAR(500) NOT NULL,
    thumbnail VARCHAR(500),
    kategori VARCHAR(100) DEFAULT 'Umum',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";
mysqli_query($conn, $createTable);

$result = mysqli_query($conn, "SELECT * FROM video_tutor ORDER BY created_at DESC");

$videos = [];
while ($row = mysqli_fetch_assoc($result)) {
    $videos[] = $row;
}

echo json_encode($videos);
?>
