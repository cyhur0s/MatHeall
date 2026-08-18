<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

include "connection.php";
requireRole($conn, "admin");

$scope = strtolower(trim($_GET['scope'] ?? 'all'));
$userActivityTypes = "'user_register','user_login','user_logout','materi','kuis'";
$userScopeFilter = $scope === 'user'
    ? "WHERE COALESCE(u.role, 'user') = 'user' AND a.user_id IS NOT NULL AND a.tipe IN ($userActivityTypes)"
    : "";

$query = "SELECT a.*, u.username
          FROM ai_aktivitas a
          LEFT JOIN users u ON u.id = a.user_id
          $userScopeFilter
          ORDER BY a.id DESC LIMIT 100";
$result = mysqli_query($conn, $query);

$data = [];
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        // Format time dynamically based on created_at
        $timestamp = strtotime($row['created_at']);
        $diff = time() - $timestamp;
        
        $time_str = "Baru saja";
        if ($diff > 86400) $time_str = floor($diff / 86400) . " hari lalu";
        elseif ($diff > 3600) $time_str = floor($diff / 3600) . " jam lalu";
        elseif ($diff > 60) $time_str = floor($diff / 60) . " menit lalu";
        
        $data[] = [
            "id" => $row['id'],
            "tipe" => $row['tipe'],
            "user_id" => isset($row['user_id']) ? (int) $row['user_id'] : null,
            "username" => $row['username'] ?? null,
            "deskripsi" => $row['deskripsi'],
            "waktu" => $time_str,
            "created_at" => $row['created_at']
        ];
    }
}

echo json_encode($data);
?>
