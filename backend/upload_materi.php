<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
include 'connection.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

requireRole($conn, 'admin');

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Pilih berkas PDF yang valid.']);
    exit;
}

$file = $_FILES['file'];
$maxBytes = 15 * 1024 * 1024;
if ((int) $file['size'] > $maxBytes) {
    http_response_code(413);
    echo json_encode(['status' => 'error', 'message' => 'Ukuran PDF maksimal 15 MB.']);
    exit;
}

$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$mime = function_exists('mime_content_type') ? mime_content_type($file['tmp_name']) : 'application/pdf';
if ($extension !== 'pdf' || !in_array($mime, ['application/pdf', 'application/x-pdf'], true)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Hanya berkas PDF yang diizinkan.']);
    exit;
}

$rawTitle = trim((string) ($_POST['title'] ?? pathinfo($file['name'], PATHINFO_FILENAME)));
$safeTitle = preg_replace('/[^\p{L}\p{N}\s._-]+/u', '', $rawTitle);
$safeTitle = preg_replace('/\s+/', '_', trim($safeTitle));
$directory = realpath(__DIR__ . '/../Materi');
$targetName = $safeTitle . '.pdf';
$target = $directory . DIRECTORY_SEPARATOR . $targetName;

if (!$directory || $safeTitle === '') {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Nama materi tidak valid.']);
    exit;
}
if (is_file($target)) {
    http_response_code(409);
    echo json_encode(['status' => 'error', 'message' => 'Materi dengan nama tersebut sudah tersedia.']);
    exit;
}
if (!move_uploaded_file($file['tmp_name'], $target)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Berkas gagal disimpan.']);
    exit;
}

logActivity($conn, 'admin_materi', "Admin mengunggah materi '$targetName'.");
echo json_encode(['status' => 'success', 'filename' => $targetName]);
?>
