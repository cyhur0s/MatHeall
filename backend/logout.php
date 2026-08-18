<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
include 'connection.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$token = getBearerToken();
if ($token !== '') {
    $currentUser = authenticatedUser($conn);
    if ($currentUser) {
        $isAdmin = $currentUser['role'] === 'admin';
        $activityType = $isAdmin ? 'admin_logout' : 'user_logout';
        $description = $isAdmin
            ? "Admin '" . $currentUser['username'] . "' keluar dari dashboard."
            : "User '" . $currentUser['username'] . "' keluar dari aplikasi.";
        logActivity($conn, $activityType, $description, $currentUser['id']);
    }
    $hash = hash('sha256', $token);
    $stmt = mysqli_prepare($conn, 'DELETE FROM ai_auth_tokens WHERE token_hash = ?');
    mysqli_stmt_bind_param($stmt, 's', $hash);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}
echo json_encode(['status' => 'success']);
?>
