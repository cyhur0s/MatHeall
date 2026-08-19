<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Healthcheck Railway hanya memastikan Apache dan PHP telah siap menerima
// permintaan. Koneksi database dikonfigurasi sesudah service aktif, sehingga
// tidak boleh membuat container gagal berulang saat proses startup.
http_response_code(200);
echo json_encode([
    'status' => 'ok',
    'service' => 'matheal-php-api',
    'time' => gmdate('c'),
]);
?>
