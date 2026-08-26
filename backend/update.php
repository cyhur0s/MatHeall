<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

require_once __DIR__ . '/connection.php';
$actor = requireRole($conn, 'admin');
$data = json_decode(file_get_contents('php://input'), true) ?: [];

$id = (int) ($data['id'] ?? 0);
$username = trim((string) ($data['username'] ?? ''));
$password = (string) ($data['password'] ?? '');
$role = ($data['role'] ?? 'user') === 'admin' ? 'admin' : 'user';

if ($id <= 0 || $username === '') {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'ID dan username wajib diisi.']);
    exit;
}
if (strlen($username) < 3 || strlen($username) > 100 || !preg_match('/^[\p{L}\p{N}_.-]+$/u', $username)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Username tidak valid.']);
    exit;
}
if ($password !== '' && strlen($password) < 8) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Password baru minimal 8 karakter.']);
    exit;
}

$currentStmt = mysqli_prepare($conn, "SELECT id, username, COALESCE(role, 'user') AS role, COALESCE(is_active, 1) AS is_active FROM users WHERE id = ? LIMIT 1");
mysqli_stmt_bind_param($currentStmt, 'i', $id);
mysqli_stmt_execute($currentStmt);
$target = mysqli_fetch_assoc(mysqli_stmt_get_result($currentStmt));
mysqli_stmt_close($currentStmt);
if (!$target) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Pengguna tidak ditemukan.']);
    exit;
}

$parsedStatus = array_key_exists('is_active', $data)
    ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
    : null;
$isActive = $parsedStatus === null ? (bool) $target['is_active'] : $parsedStatus;

// Admin yang sedang dipakai tidak boleh kehilangan aksesnya sendiri.
if ($id === (int) $actor['id'] && ($role !== 'admin' || !$isActive)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Admin yang sedang digunakan tidak dapat dinonaktifkan atau diubah menjadi user.']);
    exit;
}

// Selalu sisakan satu akun admin aktif agar sistem tidak terkunci.
if ($target['role'] === 'admin' && ($role !== 'admin' || !$isActive)) {
    $adminCount = mysqli_query($conn, "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND COALESCE(is_active, 1) = 1 AND id <> " . $id);
    $otherActiveAdmin = (int) (mysqli_fetch_assoc($adminCount)['total'] ?? 0);
    if ($otherActiveAdmin < 1) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'Sistem harus memiliki minimal satu admin aktif.']);
        exit;
    }
}

$duplicateStmt = mysqli_prepare($conn, 'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
mysqli_stmt_bind_param($duplicateStmt, 'si', $username, $id);
mysqli_stmt_execute($duplicateStmt);
$usernameTaken = mysqli_num_rows(mysqli_stmt_get_result($duplicateStmt)) > 0;
mysqli_stmt_close($duplicateStmt);
if ($usernameTaken) {
    http_response_code(409);
    echo json_encode(['status' => 'error', 'message' => 'Username sudah digunakan oleh akun lain.']);
    exit;
}

$activeValue = $isActive ? 1 : 0;
if ($password !== '') {
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = mysqli_prepare($conn, 'UPDATE users SET username = ?, password = ?, role = ?, is_active = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'sssii', $username, $hashedPassword, $role, $activeValue, $id);
} else {
    $stmt = mysqli_prepare($conn, 'UPDATE users SET username = ?, role = ?, is_active = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'ssii', $username, $role, $activeValue, $id);
}
$result = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if (!$result) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Data pengguna gagal diperbarui.']);
    exit;
}

$changes = [];
if ($target['username'] !== $username) $changes[] = "username menjadi '$username'";
if ($target['role'] !== $role) $changes[] = "role menjadi '$role'";
if ((bool) $target['is_active'] !== $isActive) $changes[] = $isActive ? 'akun diaktifkan' : 'akun dinonaktifkan';
if ($password !== '') {
    $changes[] = 'password direset';
    $resetStmt = mysqli_prepare($conn, "UPDATE ai_password_reset_requests SET status='resolved', resolved_at=CURRENT_TIMESTAMP WHERE username=? AND status='pending'");
    mysqli_stmt_bind_param($resetStmt, 's', $username);
    mysqli_stmt_execute($resetStmt);
    mysqli_stmt_close($resetStmt);
}
if ($changes) {
    logActivity($conn, 'admin_user_update', "Admin '{$actor['username']}' memperbarui akun '{$target['username']}': " . implode(', ', $changes) . '.', (int) $actor['id']);
}

echo json_encode(['status' => 'success', 'message' => 'Data pengguna berhasil diperbarui.']);
?>
