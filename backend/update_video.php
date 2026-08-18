<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once "connection.php";
requireRole($conn, "admin");

$data = json_decode(file_get_contents("php://input"), true);

$id_video  = $data['id_video']  ?? '';
$judul     = $data['judul']     ?? '';
$deskripsi = $data['deskripsi'] ?? '';
$url_video = $data['url_video'] ?? '';
$thumbnail = $data['thumbnail'] ?? '';
$kategori  = $data['kategori']  ?? 'Umum';

if (!$id_video || !$judul || !$url_video) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

$stmt = mysqli_prepare($conn, "UPDATE video_tutor SET judul=?, deskripsi=?, url_video=?, thumbnail=?, kategori=? WHERE id_video=?");
mysqli_stmt_bind_param($stmt, "sssssi", $judul, $deskripsi, $url_video, $thumbnail, $kategori, $id_video);

if (mysqli_stmt_execute($stmt)) {
    logActivity($conn, 'admin_video', "Admin memperbarui video tutor: '$judul'.");
    echo json_encode(["status" => "success", "message" => "Video berhasil diupdate"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}
?>
