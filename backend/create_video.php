<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once "connection.php";
requireRole($conn, "admin");

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

$data = json_decode(file_get_contents("php://input"), true);

$judul     = $data['judul']     ?? '';
$deskripsi = $data['deskripsi'] ?? '';
$url_video = $data['url_video'] ?? '';
$thumbnail = $data['thumbnail'] ?? '';
$kategori  = $data['kategori']  ?? 'Umum';

if (!$judul || !$url_video) {
    echo json_encode(["status" => "error", "message" => "Judul dan URL video wajib diisi"]);
    exit;
}

$stmt = mysqli_prepare($conn, "INSERT INTO video_tutor (judul, deskripsi, url_video, thumbnail, kategori) VALUES (?, ?, ?, ?, ?)");
mysqli_stmt_bind_param($stmt, "sssss", $judul, $deskripsi, $url_video, $thumbnail, $kategori);

if (mysqli_stmt_execute($stmt)) {
    logActivity($conn, 'admin_video', "Admin menambahkan video tutor baru: '$judul'.");
    echo json_encode(["status" => "success", "message" => "Video berhasil ditambahkan"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}
?>
