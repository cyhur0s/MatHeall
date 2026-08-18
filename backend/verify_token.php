<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/connection.php';

$configuredKey = (string) envValue('INTERNAL_API_KEY', '');
$providedKey = (string) ($_SERVER['HTTP_X_INTERNAL_KEY'] ?? '');
if ($configuredKey === '' || $providedKey === '' || !hash_equals($configuredKey, $providedKey)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Akses internal ditolak.']);
    exit;
}

$user = authenticatedUser($conn);
if (!$user) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Sesi tidak valid.']);
    exit;
}

echo json_encode([
    'status' => 'success',
    'user' => [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
    ],
]);
?>
