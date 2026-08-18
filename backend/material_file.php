<?php
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$filename = basename((string) ($_GET['file'] ?? ''));
$extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

if ($filename === '' || !in_array($extension, ['pdf', 'ppt', 'pptx', 'doc', 'docx'], true)) {
    http_response_code(400);
    exit('Nama berkas materi tidak valid.');
}

$materialRoot = realpath(__DIR__ . '/../Materi');
$filePath = $materialRoot ? realpath($materialRoot . DIRECTORY_SEPARATOR . $filename) : false;

if (!$materialRoot || !$filePath || !str_starts_with($filePath, $materialRoot . DIRECTORY_SEPARATOR) || !is_file($filePath)) {
    http_response_code(404);
    exit('Berkas materi tidak ditemukan.');
}

$mimeTypes = [
    'pdf' => 'application/pdf',
    'ppt' => 'application/vnd.ms-powerpoint',
    'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
$fileSize = filesize($filePath);
$start = 0;
$end = $fileSize - 1;

header('Content-Type: ' . ($mimeTypes[$extension] ?? 'application/octet-stream'));
header('Content-Disposition: inline; filename="' . rawurlencode($filename) . '"');
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=3600');

if (!empty($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $matches)) {
    if ($matches[1] !== '') $start = (int) $matches[1];
    if ($matches[2] !== '') $end = min((int) $matches[2], $end);
    if ($start > $end || $start >= $fileSize) {
        header('Content-Range: bytes */' . $fileSize);
        http_response_code(416);
        exit;
    }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$fileSize");
}

$length = $end - $start + 1;
header('Content-Length: ' . $length);

$handle = fopen($filePath, 'rb');
if (!$handle) {
    http_response_code(500);
    exit('Berkas materi tidak dapat dibaca.');
}

fseek($handle, $start);
$remaining = $length;
while ($remaining > 0 && !feof($handle)) {
    $chunk = fread($handle, min(8192, $remaining));
    if ($chunk === false) break;
    echo $chunk;
    $remaining -= strlen($chunk);
    if (connection_aborted()) break;
}
fclose($handle);
exit;
?>
