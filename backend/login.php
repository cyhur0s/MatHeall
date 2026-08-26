<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit();
}

include "connection.php";
enforceRateLimit($conn, 'login', 10, 900);

$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data["username"] ?? "");
$password = $data["password"] ?? "";

if ($username == "" || $password == "") {
    echo json_encode([
        "status"  => "error",
        "message" => "Username dan password wajib diisi"
    ]);
    exit();
}

$stmt = mysqli_prepare($conn, "SELECT id, username, password, COALESCE(role, 'user') AS role, COALESCE(is_active, 1) AS is_active, created_at FROM users WHERE username = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, "s", $username);
mysqli_stmt_execute($stmt);
$user = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if ($user && password_verify($password, $user["password"])) {
    if (!(int) $user['is_active']) {
        http_response_code(403);
        echo json_encode([
            "status" => "error",
            "message" => "Akun ini sedang dinonaktifkan. Hubungi administrator."
        ]);
        exit;
    }
    $auth = issueAuthToken($conn, (int) $user["id"]);
    if ($user["role"] === "admin") {
        logActivity($conn, "admin_login", "Admin '" . $user["username"] . "' masuk ke dashboard.", $user["id"]);
    } else {
        logActivity($conn, "user_login", "User '" . $user["username"] . "' masuk ke aplikasi.", $user["id"]);
    }
    echo json_encode([
        "status"  => "success",
        "message" => "Login berhasil",
        "token" => $auth["token"],
        "expires_at" => $auth["expires_at"],
        "user"    => [
            "id"       => $user["id"],
            "username" => $user["username"],
            "role"     => $user["role"],
            "joined_year" => !empty($user["created_at"]) ? date("Y", strtotime($user["created_at"])) : date("Y")
        ]
    ]);
} else {
    echo json_encode([
        "status"  => "error",
        "message" => "Akun belum terdaftar atau password salah"
    ]);
}
?>
