<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Metode tidak diizinkan.']);
    exit;
}

require_once __DIR__ . '/connection.php';
$currentUser = requireRole($conn, 'user');
$data = json_decode(file_get_contents('php://input'), true) ?: [];

$username = trim((string) ($data['username'] ?? ''));
$avatarChanged = !empty($data['avatar_changed']);

if ($username === '' || strlen($username) < 3 || strlen($username) > 100 || !preg_match('/^[\p{L}\p{N}_.-]+$/u', $username)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Username harus terdiri dari 3–100 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.']);
    exit;
}

$oldUsername = $currentUser['username'];
$usernameChanged = $username !== $oldUsername;

if ($usernameChanged) {
    $exists = mysqli_prepare($conn, 'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
    mysqli_stmt_bind_param($exists, 'si', $username, $currentUser['id']);
    mysqli_stmt_execute($exists);
    $isTaken = mysqli_num_rows(mysqli_stmt_get_result($exists)) > 0;
    mysqli_stmt_close($exists);

    if ($isTaken) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Username tersebut sudah digunakan.']);
        exit;
    }

    $update = mysqli_prepare($conn, 'UPDATE users SET username = ? WHERE id = ?');
    mysqli_stmt_bind_param($update, 'si', $username, $currentUser['id']);
    $updated = mysqli_stmt_execute($update);
    mysqli_stmt_close($update);
    if (!$updated) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Profil gagal diperbarui.']);
        exit;
    }
}

if ($usernameChanged) {
    logActivity($conn, 'profile_update', "User '$oldUsername' mengubah username menjadi '$username'.", $currentUser['id']);
} elseif ($avatarChanged) {
    logActivity($conn, 'profile_update', "User '$oldUsername' memperbarui foto profil.", $currentUser['id']);
}

echo json_encode([
    'status' => 'success',
    'message' => 'Profil berhasil diperbarui.',
    'user' => ['username' => $username],
]);
?>
