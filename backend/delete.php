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

$targetStmt = mysqli_prepare($conn, "SELECT username, COALESCE(role, 'user') AS role FROM users WHERE id = ? LIMIT 1");
mysqli_stmt_bind_param($targetStmt, 'i', $id);
mysqli_stmt_execute($targetStmt);
$target = mysqli_fetch_assoc(mysqli_stmt_get_result($targetStmt));
mysqli_stmt_close($targetStmt);
if (!$target) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Pengguna tidak ditemukan."]);
    exit;
}
if ($target['role'] === 'admin') {
    $adminCount = mysqli_query($conn, "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND COALESCE(is_active, 1) = 1 AND id <> " . $id);
    if ((int) (mysqli_fetch_assoc($adminCount)['total'] ?? 0) < 1) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "Admin aktif terakhir tidak dapat dihapus."]);
        exit;
    }
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
    logActivity($conn, 'admin_user_delete', "Admin '{$actor['username']}' menghapus akun '{$target['username']}'.", (int) $actor['id']);
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
