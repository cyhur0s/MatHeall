<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once "connection.php";
requireRole($conn, "admin");

$data = json_decode(file_get_contents("php://input"), true);
$id_video = $data['id_video'] ?? '';

if (!$id_video) {
    echo json_encode(["status" => "error", "message" => "ID video tidak ditemukan"]);
    exit;
}

$stmt = mysqli_prepare($conn, "DELETE FROM video_tutor WHERE id_video=?");
mysqli_stmt_bind_param($stmt, "i", $id_video);

if (mysqli_stmt_execute($stmt)) {
    logActivity($conn, 'admin_video', "Admin menghapus video tutor ID: $id_video.");
    echo json_encode(["status" => "success", "message" => "Video berhasil dihapus"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}
?>
