<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require 'connection.php';
requireRole($conn);

$allowedLevels = ['mudah', 'sedang', 'sulit'];
$tingkat = strtolower(trim($_GET['tingkat'] ?? 'mudah'));
if (!in_array($tingkat, $allowedLevels, true)) $tingkat = 'mudah';
$materialId = max(0, (int)($_GET['id_materi'] ?? 0));

$where = "WHERE LOWER(s.tingkat)=?";
if ($materialId > 0) $where .= ' AND s.id_materi=?';
$sql = "SELECT s.id_soal, s.id_materi, s.pertanyaan, s.kunci_jawaban, s.tingkat, s.tipe, s.opsi, m.nama_materi
        FROM ai_soal s JOIN ai_materi m ON m.id_materi=s.id_materi $where ORDER BY RAND()";
$stmt = mysqli_prepare($conn, $sql);
if ($materialId > 0) mysqli_stmt_bind_param($stmt, 'si', $tingkat, $materialId);
else mysqli_stmt_bind_param($stmt, 's', $tingkat);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$groups = ['pg' => [], 'tf' => [], 'esai' => []];
while ($row = mysqli_fetch_assoc($result)) {
    $type = in_array($row['tipe'], array_keys($groups), true) ? $row['tipe'] : 'esai';
    $decoded = !empty($row['opsi']) ? json_decode($row['opsi'], true) : null;
    $row['opsi'] = is_array($decoded) ? $decoded : null;
    $groups[$type][] = $row;
}
mysqli_stmt_close($stmt);

$types = array_keys($groups);
shuffle($types);
$quota = ['pg' => 3, 'tf' => 3, 'esai' => 3];
$quota[$types[0]] = 4;
$selected = [];
foreach ($quota as $type => $limit) {
    shuffle($groups[$type]);
    $selected = array_merge($selected, array_slice($groups[$type], 0, $limit));
}
shuffle($selected);

echo json_encode([
    'tingkat' => $tingkat,
    'total' => count($selected),
    'komposisi' => array_count_values(array_column($selected, 'tipe')),
    'soal' => $selected,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
