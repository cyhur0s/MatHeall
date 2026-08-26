<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');
include 'connection.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

requireRole($conn, 'admin');

$userActivityTypes = "'user_register','user_login','user_logout','materi','kuis','ask','profile_update'";

$result = mysqli_query($conn, "SELECT
    COUNT(*) AS total,
    COUNT(DISTINCT a.tipe) AS types,
    COUNT(DISTINCT a.user_id) AS active_users,
    SUM(CASE WHEN a.tipe = 'kuis' THEN 1 ELSE 0 END) AS quiz_total,
    SUM(CASE WHEN a.tipe = 'materi' THEN 1 ELSE 0 END) AS material_total
  FROM ai_aktivitas a
  LEFT JOIN users u ON u.id = a.user_id
  WHERE a.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    AND a.tipe IN ($userActivityTypes)
    AND (a.user_id IS NULL OR COALESCE(u.role, 'user') = 'user')");
$row = $result ? mysqli_fetch_assoc($result) : [];

$daily = [];
for ($offset = 6; $offset >= 0; $offset--) {
    $key = date('Y-m-d', strtotime("-$offset days"));
    $daily[$key] = 0;
}
$dailyResult = mysqli_query($conn, "SELECT DATE(a.created_at) AS activity_date, COUNT(*) AS total
  FROM ai_aktivitas a
  LEFT JOIN users u ON u.id = a.user_id
  WHERE a.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    AND a.tipe IN ($userActivityTypes)
    AND (a.user_id IS NULL OR COALESCE(u.role, 'user') = 'user')
  GROUP BY DATE(a.created_at)");
if ($dailyResult) {
    while ($day = mysqli_fetch_assoc($dailyResult)) {
        if (isset($daily[$day['activity_date']])) $daily[$day['activity_date']] = (int) $day['total'];
    }
}

$dailyRows = [];
foreach ($daily as $date => $total) $dailyRows[] = ['date' => $date, 'count' => $total];

$recentActivities = [];
$recentResult = mysqli_query($conn, "SELECT a.id, a.user_id, a.tipe, a.deskripsi, a.created_at, u.username
  FROM ai_aktivitas a
  LEFT JOIN users u ON u.id = a.user_id
  WHERE a.tipe IN ($userActivityTypes)
    AND (a.user_id IS NULL OR COALESCE(u.role, 'user') = 'user')
  ORDER BY a.id DESC
  LIMIT 20");
if ($recentResult) {
    while ($activity = mysqli_fetch_assoc($recentResult)) {
        $timestamp = strtotime($activity['created_at']);
        $difference = max(0, time() - $timestamp);
        $relativeTime = 'Baru saja';
        if ($difference >= 86400) $relativeTime = floor($difference / 86400) . ' hari lalu';
        elseif ($difference >= 3600) $relativeTime = floor($difference / 3600) . ' jam lalu';
        elseif ($difference >= 60) $relativeTime = floor($difference / 60) . ' menit lalu';

        $recentActivities[] = [
            'id' => (int) $activity['id'],
            'user_id' => (int) $activity['user_id'],
            'username' => $activity['username'] ?: 'User',
            'tipe' => $activity['tipe'],
            'deskripsi' => $activity['deskripsi'],
            'waktu' => $relativeTime,
            'created_at' => $activity['created_at'],
        ];
    }
}

echo json_encode([
    'status' => 'success',
    'activities' => (int) ($row['total'] ?? 0),
    'types' => (int) ($row['types'] ?? 0),
    'active_users' => (int) ($row['active_users'] ?? 0),
    'quiz_total' => (int) ($row['quiz_total'] ?? 0),
    'material_total' => (int) ($row['material_total'] ?? 0),
    'daily' => $dailyRows,
    'recent' => $recentActivities,
    'since' => date('Y-m-d', strtotime('-6 days')),
    'generated_at' => date(DATE_ATOM),
]);
?>
