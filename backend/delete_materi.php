<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit();

include "connection.php";
requireRole($conn, "admin");
$data = json_decode(file_get_contents("php://input"), true);
$id = filter_var($data["id_materi"] ?? null, FILTER_VALIDATE_INT);

if (!$id || $id < 1) {
    echo json_encode(["status" => "error", "message" => "ID wajib diisi"]);
    exit;
}

$stmt = mysqli_prepare($conn, "DELETE FROM ai_materi WHERE id_materi = ?");
mysqli_stmt_bind_param($stmt, 'i', $id);
if (mysqli_stmt_execute($stmt)) {
    logActivity($conn, 'admin_materi', "Admin menghapus suatu materi.");
    echo json_encode(["status" => "success"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Materi gagal dihapus."]);
}
mysqli_stmt_close($stmt);
?>
