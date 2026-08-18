<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit();

include "connection.php";
requireRole($conn, "admin");

$nama = trim((string) ($_POST['nama_materi'] ?? ''));
$deskripsi = trim((string) ($_POST['deskripsi'] ?? ''));
$file_materi = '';

if (!$nama) {
    echo json_encode(["status" => "error", "message" => "Nama materi wajib diisi"]);
    exit;
}

if (isset($_FILES['file_materi']) && $_FILES['file_materi']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['file_materi'];
    if ((int) $file['size'] > 15 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode(["status" => "error", "message" => "Ukuran PDF maksimal 15 MB."]);
        exit;
    }
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mime = function_exists('mime_content_type') ? mime_content_type($file['tmp_name']) : '';
    if ($extension !== 'pdf' || !in_array($mime, ['application/pdf', 'application/x-pdf'], true)) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "Hanya berkas PDF yang diizinkan."]);
        exit;
    }
    $uploadDir = __DIR__ . '/uploads/materi/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename to avoid conflicts
    $fileName = bin2hex(random_bytes(8)) . '.pdf';
    $uploadPath = $uploadDir . $fileName;

    if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
        $file_materi = 'uploads/materi/' . $fileName;
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Berkas gagal disimpan."]);
        exit;
    }
}

$stmt = mysqli_prepare($conn, "INSERT INTO ai_materi (nama_materi, deskripsi, file_materi) VALUES (?, ?, ?)");
mysqli_stmt_bind_param($stmt, 'sss', $nama, $deskripsi, $file_materi);
if (mysqli_stmt_execute($stmt)) {
    logActivity($conn, 'admin_materi', "Admin menambahkan materi baru: '$nama'.");
    echo json_encode(["status" => "success"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Materi gagal disimpan."]);
}
mysqli_stmt_close($stmt);
?>
