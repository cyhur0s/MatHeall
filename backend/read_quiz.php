<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit();

include "connection.php";
requireRole($conn);

$rawLevel = $_GET["levelId"] ?? "";
if (strpos($rawLevel, '?') !== false) {
    $rawLevel = explode('?', $rawLevel)[0];
}
$levelId = mysqli_real_escape_string($conn, trim($rawLevel));

$rawTingkat = $_GET["tingkat"] ?? "";
if (strpos($rawTingkat, '?') !== false) {
    $rawTingkat = explode('?', $rawTingkat)[0];
}
$tingkat = mysqli_real_escape_string($conn, trim($rawTingkat));

$baseQuery = "SELECT s.id_soal, s.id_materi, s.pertanyaan, s.kunci_jawaban, s.tingkat, s.tipe, s.opsi, m.nama_materi
              FROM ai_soal s
              INNER JOIN ai_materi m ON s.id_materi = m.id_materi";

$conditions = [];

if ($levelId !== "" && $levelId !== "all") {
    $cleanKey = trim($levelId);
    $conditions[] = "(
        m.nama_materi = '$cleanKey' OR 
        m.nama_materi LIKE '%$cleanKey%' OR 
        REPLACE(LOWER(m.nama_materi), ' ', '-') LIKE '%" . strtolower($cleanKey) . "%' OR
        REPLACE(LOWER(m.nama_materi), '&', 'and') LIKE '%" . strtolower($cleanKey) . "%'
    )";
}

$queryWithTingkat = $baseQuery;
$condsWithTingkat = $conditions;
if ($tingkat !== "") {
    $condsWithTingkat[] = "LOWER(s.tingkat) = LOWER('$tingkat')";
}

if (count($condsWithTingkat) > 0) {
    $queryWithTingkat .= " WHERE " . implode(" AND ", $condsWithTingkat);
}
$queryWithTingkat .= " ORDER BY RAND()";

// Coba query dengan tingkat dulu
$res = mysqli_query($conn, $queryWithTingkat);

// Jika tingkat tersebut benar-benar kosong, gunakan seluruh soal materi sebagai fallback.
if (!$res || mysqli_num_rows($res) === 0) {
    $queryFallback = $baseQuery;
    if (count($conditions) > 0) {
        $queryFallback .= " WHERE " . implode(" AND ", $conditions);
    }
    $queryFallback .= " ORDER BY RAND()";
    $res = mysqli_query($conn, $queryFallback);
}
$data = [];

if ($res && mysqli_num_rows($res) > 0) {
    while ($row = mysqli_fetch_assoc($res)) {
        $opsi_decoded = null;
        if (!empty($row["opsi"])) {
            $decoded = json_decode($row["opsi"], true);
            $opsi_decoded = is_array($decoded) ? $decoded : null;
        }

        $data[] = [
            "id_soal"      => $row["id_soal"],
            "id_materi"    => $row["id_materi"],
            "nama_materi"  => $row["nama_materi"] ?? null,
            "pertanyaan"   => $row["pertanyaan"],
            "kunci_jawaban"=> $row["kunci_jawaban"],
            "tingkat"      => $row["tingkat"],
            "tipe"         => $row["tipe"] ?: "esai",
            "opsi"         => $opsi_decoded,
        ];
    }
}

// Setiap akses menghasilkan paket baru berisi tiga tipe yang seimbang.
// Karena totalnya 10, satu tipe dipilih acak mendapat 4 soal dan dua tipe lain 3 soal.
$types = ["pg", "tf", "esai"];
shuffle($types);
$quota = ["pg" => 3, "tf" => 3, "esai" => 3];
$quota[$types[0]] = 4;
$groups = ["pg" => [], "tf" => [], "esai" => []];
foreach ($data as $item) {
    $type = in_array($item["tipe"], ["pg", "tf", "esai"], true) ? $item["tipe"] : "esai";
    $groups[$type][] = $item;
}
foreach ($groups as &$items) shuffle($items);
unset($items);
$selected = [];
$selectedIds = [];
foreach ($quota as $type => $limit) {
    foreach (array_slice($groups[$type], 0, $limit) as $item) {
        $selected[] = $item;
        $selectedIds[(string)$item["id_soal"]] = true;
    }
}
if (count($selected) < 10) {
    $remaining = array_values(array_filter($data, fn($item) => !isset($selectedIds[(string)$item["id_soal"]])));
    shuffle($remaining);
    $selected = array_merge($selected, array_slice($remaining, 0, 10 - count($selected)));
}
shuffle($selected);
echo json_encode(array_slice($selected, 0, 10), JSON_UNESCAPED_UNICODE);
?>
