<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit();
}

include "connection.php";
$actor = requireRole($conn, "admin");

$data = json_decode(file_get_contents("php://input"), true);

$id = (int) ($data["id"] ?? 0);

if ($id == "") {
    echo json_encode([
        "status" => "error",
        "message" => "ID wajib diisi"
    ]);
    exit;
}

if ($id === (int) $actor["id"]) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Akun admin yang sedang digunakan tidak dapat dihapus."]);
    exit;
}

mysqli_begin_transaction($conn);
$stmt = mysqli_prepare($conn, "DELETE FROM users WHERE id = ?");
mysqli_stmt_bind_param($stmt, "i", $id);
$result = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);
if ($result) {
    $cleanup = mysqli_prepare($conn, "DELETE FROM ai_auth_tokens WHERE user_id = ?");
    mysqli_stmt_bind_param($cleanup, "i", $id);
    mysqli_stmt_execute($cleanup);
    mysqli_stmt_close($cleanup);
    $cleanup = mysqli_prepare($conn, "DELETE FROM ai_user_progress WHERE user_id = ?");
    mysqli_stmt_bind_param($cleanup, "i", $id);
    mysqli_stmt_execute($cleanup);
    mysqli_stmt_close($cleanup);
    mysqli_commit($conn);
} else {
    mysqli_rollback($conn);
}

if ($result) {
    echo json_encode([
        "status" => "success",
        "message" => "Data berhasil dihapus"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Data gagal dihapus"
    ]);
}
?>
