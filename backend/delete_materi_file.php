<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(); }

include "connection.php";
requireRole($conn, "admin");

$data = json_decode(file_get_contents("php://input"), true);
$filename = $data["filename"] ?? "";

if (!$filename) {
    echo json_encode(["status" => "error", "message" => "Nama file diperlukan."]);
    exit();
}

// Security: no directory traversal
if (strpos($filename, "..") !== false || strpos($filename, "/") !== false || strpos($filename, "\\") !== false) {
    echo json_encode(["status" => "error", "message" => "Nama file tidak valid."]);
    exit();
}

$extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
if (!in_array($extension, ['pdf', 'pptx', 'docx'], true) || str_starts_with($filename, '.')) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Jenis berkas tidak diizinkan."]);
    exit();
}

$materiDir = __DIR__ . "/../Materi/";
$filepath  = $materiDir . $filename;

if (!file_exists($filepath)) {
    echo json_encode(["status" => "error", "message" => "File tidak ditemukan."]);
    exit();
}

if (unlink($filepath)) {
    logActivity($conn, "admin_materi", "Admin menghapus berkas materi '$filename'.");
    echo json_encode(["status" => "success", "message" => "File berhasil dihapus."]);
} else {
    echo json_encode(["status" => "error", "message" => "Gagal menghapus file."]);
}
