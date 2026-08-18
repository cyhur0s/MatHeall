<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;

include "connection.php";
requireRole($conn, "admin");
$query = "
    SELECT m.*, COUNT(s.id_soal) as jumlah_soal 
    FROM ai_materi m 
    LEFT JOIN ai_soal s ON m.id_materi = s.id_materi 
    GROUP BY m.id_materi 
    ORDER BY m.id_materi DESC
";
$res = mysqli_query($conn, $query);
$data = [];
while ($row = mysqli_fetch_assoc($res)) {
    $data[] = $row;
}
echo json_encode($data);
?>
