<?php
// ============================================================
//  import_soal.php - Import Bank Soal ke Database Matheal
//  Skrip impor manual untuk lingkungan pengembangan; akses web diblokir pada produksi.
//  HAPUS FILE INI setelah selesai import (alasan keamanan)
// ============================================================

include "connection.php";

// Baca file SQL
$sqlFile = __DIR__ . "/bank_soal.sql";
if (!file_exists($sqlFile)) {
    die("<h2 style='color:red'>❌ File bank_soal.sql tidak ditemukan di: $sqlFile</h2>");
}

// Parsing: pisahkan per statement SQL (pisahkan by ;)
$sql = file_get_contents($sqlFile);
// Hilangkan comment baris
$sql = preg_replace('/--[^\n]*\n/', "\n", $sql);
// Hilangkan comment blok
$sql = preg_replace('/\/\*.*?\*\//s', '', $sql);

$statements = array_filter(
    array_map('trim', explode(';', $sql)),
    fn($s) => !empty($s)
);

$success = 0;
$errors  = [];
$skipped = 0;

foreach ($statements as $stmt) {
    if (empty(trim($stmt))) continue;

    // Cek apakah ini INSERT dan data sudah ada (cegah duplikat)
    if (stripos($stmt, 'INSERT INTO `ai_soal`') !== false ||
        stripos($stmt, 'INSERT INTO `ai_materi`') !== false) {
        if (!mysqli_query($conn, $stmt)) {
            $errors[] = htmlspecialchars(mysqli_error($conn)) . "<br><small>" . htmlspecialchars(substr($stmt, 0, 80)) . "...</small>";
        } else {
            $success++;
        }
    } elseif (stripos($stmt, 'CREATE TABLE IF NOT EXISTS') !== false) {
        if (!mysqli_query($conn, $stmt)) {
            $errors[] = htmlspecialchars(mysqli_error($conn));
        } else {
            $skipped++;
        }
    }
}

// Hitung total soal dan materi setelah import
$totalSoal   = mysqli_fetch_row(mysqli_query($conn, "SELECT COUNT(*) FROM ai_soal"))[0];
$totalMateri = mysqli_fetch_row(mysqli_query($conn, "SELECT COUNT(*) FROM ai_materi"))[0];

// Ambil sample soal per materi
$sample = mysqli_query($conn, "
    SELECT m.nama_materi, COUNT(s.id_soal) as jumlah,
           SUM(s.tingkat='mudah') as mudah,
           SUM(s.tingkat='sedang') as sedang,
           SUM(s.tingkat='sulit') as sulit
    FROM ai_materi m
    LEFT JOIN ai_soal s ON m.id_materi = s.id_materi
    GROUP BY m.id_materi, m.nama_materi
    ORDER BY m.id_materi ASC
");
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Import Bank Soal - Matheal</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #f0f4ff; min-height: 100vh; padding: 40px 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { background: white; border-radius: 20px; padding: 32px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
        h1 { font-size: 26px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        h2 { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }
        .badge-success { display: inline-block; background: #d1fae5; color: #059669; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .badge-err { display: inline-block; background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
        .stat-box { background: #f8fafc; border-radius: 14px; padding: 20px; text-align: center; border: 1.5px solid #e5e7eb; }
        .stat-num { font-size: 36px; font-weight: 900; color: #2491ff; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #64748b; text-align: left; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; }
        td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f8fafc; }
        tr:last-child td { border-bottom: none; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; margin: 0 2px; }
        .pill-mudah  { background: #d1fae5; color: #059669; }
        .pill-sedang { background: #fef3c7; color: #d97706; }
        .pill-sulit  { background: #fee2e2; color: #dc2626; }
        .err-list { background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 12px; padding: 16px; margin-top: 16px; font-size: 13px; color: #b91c1c; }
        .warning { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 20px; font-size: 14px; color: #92400e; }
        .btn { display: inline-block; background: #2491ff; color: white; padding: 11px 24px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 20px; cursor: pointer; border: none; }
        .btn-red { background: #ef4444; }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>📚 Import Bank Soal Matheal</h1>
        <p style="color:#64748b;margin-top:8px;">Hasil import dari file <code>bank_soal.sql</code></p>

        <div class="stat-grid">
            <div class="stat-box">
                <div class="stat-num"><?= $totalSoal ?></div>
                <div class="stat-label">Total Soal di DB</div>
            </div>
            <div class="stat-box">
                <div class="stat-num"><?= $totalMateri ?></div>
                <div class="stat-label">Total Materi di DB</div>
            </div>
            <div class="stat-box">
                <div class="stat-num" style="color:<?= empty($errors) ? '#059669' : '#dc2626' ?>"><?= $success ?></div>
                <div class="stat-label">Statement Berhasil</div>
            </div>
        </div>

        <?php if (!empty($errors)): ?>
        <div class="err-list">
            <b>⚠️ Ada <?= count($errors) ?> error:</b><br><br>
            <?= implode('<br>', $errors) ?>
        </div>
        <?php else: ?>
        <p><span class="badge-success">✅ Import berhasil tanpa error!</span></p>
        <?php endif; ?>
    </div>

    <div class="card">
        <h2>📊 Distribusi Soal per Materi</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nama Materi</th>
                    <th>Total Soal</th>
                    <th>Distribusi Tingkat</th>
                </tr>
            </thead>
            <tbody>
                <?php $no = 1; while ($row = mysqli_fetch_assoc($sample)): ?>
                <tr>
                    <td style="color:#94a3b8"><?= $no++ ?></td>
                    <td style="font-weight:600"><?= htmlspecialchars($row['nama_materi']) ?></td>
                    <td style="font-weight:700;color:#2491ff"><?= $row['jumlah'] ?></td>
                    <td>
                        <?php if ($row['mudah'] > 0): ?>
                        <span class="pill pill-mudah">😊 <?= $row['mudah'] ?> Mudah</span>
                        <?php endif; ?>
                        <?php if ($row['sedang'] > 0): ?>
                        <span class="pill pill-sedang">🔥 <?= $row['sedang'] ?> Sedang</span>
                        <?php endif; ?>
                        <?php if ($row['sulit'] > 0): ?>
                        <span class="pill pill-sulit">💀 <?= $row['sulit'] ?> Sulit</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>

    <div class="card">
        <div class="warning">
            ⚠️ <b>Peringatan Keamanan:</b> Hapus atau rename file <code>import_soal.php</code> dan <code>bank_soal.sql</code> setelah selesai import agar tidak bisa diakses ulang oleh publik.
        </div>
        <br>
        <a href="http://localhost/phpmyadmin/index.php?route=/sql&db=matheal" target="_blank" class="btn">
            🗄️ Buka phpMyAdmin
        </a>
        &nbsp;
        <a href="javascript:void(0)" onclick="if(confirm('Yakin hapus file import ini?')) fetch('?hapus=1').then(()=>location.reload())" class="btn btn-red">
            🗑️ Hapus File Ini
        </a>
    </div>
</div>
</body>
</html>
<?php
// Self-delete jika diminta
if (isset($_GET['hapus'])) {
    unlink(__FILE__);
    echo "<script>alert('File import_soal.php telah dihapus.');window.location='/';</script>";
}
?>
