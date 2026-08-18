<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit();

include "connection.php";
requireRole($conn, "admin");

$id = filter_var($_POST['id_materi'] ?? null, FILTER_VALIDATE_INT);
$nama = trim((string) ($_POST['nama_materi'] ?? ''));
$deskripsi = trim((string) ($_POST['deskripsi'] ?? ''));

if (!$id || $id < 1 || !$nama) {
    echo json_encode(["status" => "error", "message" => "ID dan Nama wajib diisi"]);
    exit;
}

$newFilePath = null;
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
    
    $fileName = bin2hex(random_bytes(8)) . '.pdf';
    $uploadPath = $uploadDir . $fileName;

    if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
        // Cek dan hapus file lama
        $oldStmt = mysqli_prepare($conn, "SELECT file_materi FROM ai_materi WHERE id_materi=?");
        mysqli_stmt_bind_param($oldStmt, 'i', $id);
        mysqli_stmt_execute($oldStmt);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($oldStmt));
        mysqli_stmt_close($oldStmt);
        if (!empty($row['file_materi'])) {
            $oldRelative = str_replace('\\', '/', $row['file_materi']);
            $oldAbsolute = realpath(__DIR__ . '/' . $oldRelative);
            $allowedDir = realpath($uploadDir);
            if ($oldAbsolute && $allowedDir && str_starts_with($oldAbsolute, $allowedDir . DIRECTORY_SEPARATOR) && is_file($oldAbsolute)) {
                unlink($oldAbsolute);
            }
        }
        $newFilePath = 'uploads/materi/' . $fileName;
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Berkas gagal disimpan."]);
        exit;
    }
}

if ($newFilePath !== null) {
    $stmt = mysqli_prepare($conn, "UPDATE ai_materi SET nama_materi=?, deskripsi=?, file_materi=? WHERE id_materi=?");
    mysqli_stmt_bind_param($stmt, 'sssi', $nama, $deskripsi, $newFilePath, $id);
} else {
    $stmt = mysqli_prepare($conn, "UPDATE ai_materi SET nama_materi=?, deskripsi=? WHERE id_materi=?");
    mysqli_stmt_bind_param($stmt, 'ssi', $nama, $deskripsi, $id);
}
if (mysqli_stmt_execute($stmt)) {
    logActivity($conn, 'admin_materi', "Admin memperbarui materi: '$nama'.");
    echo json_encode(["status" => "success"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Materi gagal diperbarui."]);
}
mysqli_stmt_close($stmt);
?>
