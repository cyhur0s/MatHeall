<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit();

include "connection.php";
$currentUser = requireRole($conn);

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    $data = $_POST;
}

$requestedType = isset($data['tipe']) ? strtolower(trim((string) $data['tipe'])) : '';
$allowedUserTypes = ['materi', 'kuis', 'ask'];
$tipe = $currentUser['role'] === 'user' && in_array($requestedType, $allowedUserTypes, true)
    ? $requestedType
    : 'aktivitas';
$deskripsi = isset($data['deskripsi']) ? trim($data['deskripsi']) : '';

if (!empty($deskripsi)) {
    $safeDescription = mb_substr($deskripsi, 0, 255);
    $duplicateStmt = mysqli_prepare($conn, "SELECT id FROM ai_aktivitas
        WHERE user_id = ? AND tipe = ? AND deskripsi = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND)
        LIMIT 1");
    mysqli_stmt_bind_param($duplicateStmt, "iss", $currentUser['id'], $tipe, $safeDescription);
    mysqli_stmt_execute($duplicateStmt);
    $alreadyRecorded = mysqli_num_rows(mysqli_stmt_get_result($duplicateStmt)) > 0;
    mysqli_stmt_close($duplicateStmt);

    if ($alreadyRecorded) {
        echo json_encode(["status" => "success", "message" => "Aktivitas sudah tercatat", "duplicate" => true]);
        exit;
    }

    if (!logActivity($conn, $tipe, $safeDescription, $currentUser['id'])) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Aktivitas gagal disimpan"]);
        exit;
    }

    echo json_encode(["status" => "success", "message" => "Aktivitas dicatat", "duplicate" => false]);
} else {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Deskripsi tidak boleh kosong"]);
}
?>
