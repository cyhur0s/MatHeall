<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;

include "connection.php";
requireRole($conn);
$query = "SELECT s.*, m.nama_materi FROM ai_soal s LEFT JOIN ai_materi m ON s.id_materi = m.id_materi ORDER BY s.id_soal DESC";
$res = mysqli_query($conn, $query);
$data = [];
while ($row = mysqli_fetch_assoc($res)) {
    $data[] = $row;
}
echo json_encode($data);
?>
