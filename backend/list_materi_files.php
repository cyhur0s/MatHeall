<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit();
}

$materiDir = __DIR__ . "/../Materi";
$scheme = (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']))
    ? explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO'])[0]
    : ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');
$forwardedHost = !empty($_SERVER['HTTP_X_FORWARDED_HOST'])
    ? trim(explode(',', $_SERVER['HTTP_X_FORWARDED_HOST'])[0])
    : ($_SERVER['HTTP_HOST'] ?? 'localhost');
$host = preg_replace('/[^a-zA-Z0-9.\-:\[\]]/', '', $forwardedHost);
$appPath = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/backend/list_materi_files.php'))), '/');
$materiBaseUrl = $scheme . '://' . $host . ($appPath ? $appPath : '') . '/Materi/';

if (!is_dir($materiDir)) {
    echo json_encode([
        "status" => "error",
        "message" => "Folder Materi tidak ditemukan."
    ]);
    exit();
}

$files = scandir($materiDir);
$materiList = [];

function formatSize($bytes) {
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 1) . ' KB';
    } elseif ($bytes > 1) {
        return $bytes . ' bytes';
    } elseif ($bytes == 1) {
        return '1 byte';
    } else {
        return '0 bytes';
    }
}

function cleanTitle($filename) {
    $raw = pathinfo($filename, PATHINFO_FILENAME);
    // Replace underscores/dashes with spaces
    $cleaned = str_replace(['-', '_'], ' ', $raw);
    // Standardize title case
    $title = ucwords(strtolower($cleaned));
    // Re-capitalize abbreviations
    $title = preg_replace_callback('/\b(pdf|pptx|docx|limit|1|2)\b/i', function($m) {
        return strtoupper($m[0]);
    }, $title);
    return trim($title);
}

function getCategory($filename) {
    $fn = strtolower($filename);
    if (strpos($fn, 'integral') !== false || strpos($fn, 'turunan') !== false || strpos($fn, 'limit') !== false) {
        return 'Kalkulus';
    } elseif (strpos($fn, 'matriks') !== false || strpos($fn, 'aljabar') !== false || strpos($fn, 'linier') !== false) {
        return 'Aljabar & Matriks';
    } elseif (strpos($fn, 'graf') !== false || strpos($fn, 'himpunan') !== false || strpos($fn, 'biner') !== false || strpos($fn, 'rekursi') !== false || strpos($fn, 'boolean') !== false || strpos($fn, 'logika') !== false || strpos($fn, 'algoritma') !== false) {
        return 'Matematika Diskrit';
    } elseif (strpos($fn, 'geometri') !== false || strpos($fn, 'trigonometri') !== false || strpos($fn, 'kompleks') !== false || strpos($fn, 'polar') !== false) {
        return 'Geometri & Trigonometri';
    } else {
        return 'Umum';
    }
}

foreach ($files as $file) {
    if ($file === "." || $file === ".." || is_dir($materiDir . "/" . $file)) {
        continue;
    }

    $filePath = $materiDir . "/" . $file;
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!in_array($ext, ['pdf', 'pptx', 'docx'], true) || str_starts_with($file, '.')) {
        continue;
    }
    $title = cleanTitle($file);
    $category = getCategory($file);
    $sizeBytes = filesize($filePath);
    $mtime = filemtime($filePath);

    $materiList[] = [
        "id" => md5($file),
        "filename" => $file,
        "title" => $title,
        "category" => $category,
        "extension" => $ext,
        "size" => formatSize($sizeBytes),
        "sizeBytes" => $sizeBytes,
        // Versi mtime memastikan browser/iframe memuat modul terbaru setelah PDF diperbarui.
        "url" => $materiBaseUrl . rawurlencode($file) . "?v=" . $mtime,
        "relativeUrl" => ($appPath ? $appPath : '') . '/Materi/' . rawurlencode($file) . "?v=" . $mtime,
        "version" => $mtime,
        "mtime" => date("d M Y H:i", $mtime)
    ];
}

// Sort alphabetically by title (A-Z) case-insensitive
usort($materiList, function ($a, $b) {
    return strnatcasecmp($a["title"], $b["title"]);
});

echo json_encode([
    "status" => "success",
    "total" => count($materiList),
    "data" => $materiList
]);
?>
