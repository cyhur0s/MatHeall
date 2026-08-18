<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit();
}

include "connection.php";
requireRole($conn, "admin");

$data = json_decode(file_get_contents("php://input"), true);

$id = (int) ($data["id"] ?? 0);
$username = trim($data["username"] ?? "");
$password = $data["password"] ?? "";
$role = ($data["role"] ?? "user") === "admin" ? "admin" : "user";

if ($id == "" || $username == "") {
    echo json_encode([
        "status" => "error",
        "message" => "ID dan username wajib diisi"
    ]);
    exit;
}

if (strlen($username) < 3 || !preg_match('/^[\p{L}\p{N}_.-]+$/u', $username)) {
    echo json_encode(["status" => "error", "message" => "Username tidak valid."]);
    exit;
}
if ($password !== "" && strlen($password) < 8) {
    echo json_encode(["status" => "error", "message" => "Password baru minimal 8 karakter."]);
    exit;
}

if ($password != "") {
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = mysqli_prepare($conn, "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "sssi", $username, $hashedPassword, $role, $id);
} else {
    $stmt = mysqli_prepare($conn, "UPDATE users SET username = ?, role = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "ssi", $username, $role, $id);
}

$result = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if ($result) {
    if ($password != "") {
        $resetStmt = mysqli_prepare($conn, "UPDATE ai_password_reset_requests SET status='resolved', resolved_at=CURRENT_TIMESTAMP WHERE username=? AND status='pending'");
        mysqli_stmt_bind_param($resetStmt, "s", $username);
        mysqli_stmt_execute($resetStmt);
        mysqli_stmt_close($resetStmt);
        logActivity($conn, 'password_reset', "Admin menyelesaikan reset password untuk user '$username'.");
    }
    echo json_encode([
        "status" => "success",
        "message" => "Data berhasil diupdate"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Data gagal diupdate"
    ]);
}
?>
