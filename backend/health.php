<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
include 'connection.php';

$checks = [];
foreach (['users', 'ai_materi', 'ai_soal', 'ai_aktivitas'] as $table) {
    $result = mysqli_query($conn, "SELECT 1 FROM `$table` LIMIT 1");
    $checks[$table] = $result !== false;
}

$healthy = !in_array(false, $checks, true);
http_response_code($healthy ? 200 : 503);
echo json_encode([
    'status' => $healthy ? 'ok' : 'degraded',
    'database' => true,
    'tables' => $checks,
    'time' => gmdate('c'),
]);
?>
