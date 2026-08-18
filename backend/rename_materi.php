<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
include 'connection.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

requireRole($conn, 'admin');

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$filename = basename((string) ($data['filename'] ?? ''));
$newTitle = trim((string) ($data['newtitle'] ?? ''));

if ($filename === '' || $newTitle === '') {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Nama berkas dan judul baru wajib diisi.']);
    exit;
}

$extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
if (!in_array($extension, ['pdf', 'pptx', 'docx'], true) || str_starts_with($filename, '.')) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Jenis berkas tidak diizinkan.']);
    exit;
}
$safeTitle = preg_replace('/[^\p{L}\p{N}\s._-]+/u', '', $newTitle);
$safeTitle = preg_replace('/\s+/', '_', trim($safeTitle));
if ($safeTitle === '') {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Judul baru tidak valid.']);
    exit;
}

$directory = realpath(__DIR__ . '/../Materi');
$source = $directory . DIRECTORY_SEPARATOR . $filename;
$targetName = $safeTitle . '.' . $extension;
$target = $directory . DIRECTORY_SEPARATOR . $targetName;

if (!$directory || !is_file($source)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Berkas materi tidak ditemukan.']);
    exit;
}
if (is_file($target) && strcasecmp($source, $target) !== 0) {
    http_response_code(409);
    echo json_encode(['status' => 'error', 'message' => 'Nama berkas tersebut sudah digunakan.']);
    exit;
}

if (!rename($source, $target)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Berkas gagal diubah namanya.']);
    exit;
}

logActivity($conn, 'admin_materi', "Admin mengubah nama materi '$filename' menjadi '$targetName'.");
echo json_encode(['status' => 'success', 'filename' => $targetName]);
?>
