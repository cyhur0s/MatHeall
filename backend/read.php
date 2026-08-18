<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit();
}

include "connection.php";
requireRole($conn, "admin");

// Gunakan query yang mengambil role juga
$query = "SELECT id, username, role, created_at FROM users ORDER BY id DESC";
$result = mysqli_query($conn, $query);

$users = [];

if($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        // Jika role kosong dari database, default ke 'user'
        if(empty($row['role'])) {
            $row['role'] = 'user';
        }
        $users[] = $row;
    }
}

// React AdminPage mengharapkan array langsung, bukan object
echo json_encode($users);
?>
