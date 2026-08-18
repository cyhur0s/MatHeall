<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit();

include "connection.php";
include_once __DIR__ . "/lib/question_validation.php";
requireRole($conn, "admin");
$data = json_decode(file_get_contents("php://input"), true);

$id_materi     = filter_var($data['id_materi'] ?? null, FILTER_VALIDATE_INT);
$pertanyaan    = $data['pertanyaan']    ?? '';
$kunci_jawaban = $data['kunci_jawaban'] ?? $data['jawaban_akhir'] ?? '';
$tingkat       = $data['tingkat']       ?? $data['level'] ?? 'mudah';
$tipe          = $data['tipe']          ?? 'esai';   // pg | esai | tf
$opsi_raw      = $data['opsi']          ?? null;     // array opsi untuk PG

// Validasi tipe
$valid_tipe = ['pg', 'esai', 'tf'];
if (!in_array($tipe, $valid_tipe)) $tipe = 'esai';

if (!$pertanyaan || !$id_materi || $id_materi < 1) {
    echo json_encode(["status" => "error", "message" => "Materi dan Pertanyaan wajib diisi"]);
    exit;
}

$validationError = validateQuestionPayload($tipe, $pertanyaan, $kunci_jawaban, $opsi_raw);
if ($validationError) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => $validationError]);
    exit;
}

// Encode opsi ke JSON jika ada (untuk soal PG)
$opsi_json = null;
if ($tipe === 'pg' && is_array($opsi_raw) && count($opsi_raw) === 4) {
    $opsi_json = json_encode($opsi_raw, JSON_UNESCAPED_UNICODE);
}

$stmt = mysqli_prepare($conn, "INSERT INTO ai_soal (id_materi, pertanyaan, kunci_jawaban, tingkat, tipe, opsi) VALUES (?, ?, ?, ?, ?, ?)");
mysqli_stmt_bind_param($stmt, 'isssss', $id_materi, $pertanyaan, $kunci_jawaban, $tingkat, $tipe, $opsi_json);
if (mysqli_stmt_execute($stmt)) {
    logActivity($conn, 'admin_soal', "Admin menambahkan soal baru (tipe: $tipe) untuk materi ID: $id_materi.");
    echo json_encode(["status" => "success"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Soal gagal disimpan."]);
}
mysqli_stmt_close($stmt);
?>
