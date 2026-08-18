<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit();
}

include "connection.php";
enforceRateLimit($conn, 'register', 10, 3600);

$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data["username"] ?? "");
$password = $data["password"] ?? "";
$role     = ($data["role"] ?? "user") === "admin" ? "admin" : "user";
$adminKey = $data["admin_key"] ?? "";
$actor = authenticatedUser($conn);

if ($username === "" || $password === "") {
    echo json_encode([
        "status"  => "error",
        "message" => "Username dan password wajib diisi"
    ]);
    exit();
}

$adminRegistrationKey = envValue("ADMIN_REGISTRATION_KEY", "");
$publicAdminRegistration = strtolower((string) envValue("ADMIN_REGISTRATION_ENABLED", "false")) === "true";
if ($role === "admin" && (!$actor || $actor["role"] !== "admin") && (!$publicAdminRegistration || $adminRegistrationKey === "" || !hash_equals($adminRegistrationKey, (string) $adminKey))) {
    echo json_encode([
        "status"  => "error",
        "message" => "Akses pendaftaran admin ditolak! Kunci keamanan tidak valid."
    ]);
    exit();
}

if (strlen($username) < 3 || strlen($username) > 100 || !preg_match('/^[\p{L}\p{N}_.-]+$/u', $username)) {
    echo json_encode(["status" => "error", "message" => "Username harus 3-100 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung."]);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(["status" => "error", "message" => "Password minimal 8 karakter."]);
    exit;
}

$checkStmt = mysqli_prepare($conn, "SELECT id FROM users WHERE username = ? LIMIT 1");
mysqli_stmt_bind_param($checkStmt, "s", $username);
mysqli_stmt_execute($checkStmt);
$check = mysqli_stmt_get_result($checkStmt);

if (mysqli_num_rows($check) > 0) {
    echo json_encode([
        "status"  => "error",
        "message" => "Username sudah terdaftar"
    ]);
    exit();
}
mysqli_stmt_close($checkStmt);

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = mysqli_prepare($conn, "INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
mysqli_stmt_bind_param($stmt, "sss", $username, $hashedPassword, $role);
$result = mysqli_stmt_execute($stmt);

if ($result) {
    $registeredUserId = mysqli_insert_id($conn);
    $activityType = $role === 'admin' ? 'admin_register' : 'user_register';
    logActivity($conn, $activityType, "Akun '$username' baru saja terdaftar sebagai " . ($role === 'admin' ? 'Admin' : 'User') . ".", $registeredUserId);
    echo json_encode([
        "status"  => "success",
        "message" => "Register berhasil"
    ]);
} else {
    echo json_encode([
        "status"  => "error",
        "message" => "Register gagal. Silakan coba kembali."
    ]);
}
mysqli_stmt_close($stmt);
?>
