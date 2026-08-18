<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

include "connection.php";

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS ai_developers (
  id varchar(64) NOT NULL,
  name varchar(120) NOT NULL,
  role varchar(120) NOT NULL,
  photo longtext NULL,
  color varchar(20) NOT NULL DEFAULT '#397582',
  github varchar(255) NULL,
  linkedin varchar(255) NULL,
  email varchar(190) NULL,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS ai_developer_meta (
  id tinyint NOT NULL DEFAULT 1,
  configured tinyint(1) NOT NULL DEFAULT 0,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$configured = false;
$metaResult = mysqli_query($conn, "SELECT configured FROM ai_developer_meta WHERE id = 1 LIMIT 1");
if ($metaResult && ($meta = mysqli_fetch_assoc($metaResult))) {
    $configured = (bool) $meta["configured"];
}

$developers = [];
$result = mysqli_query($conn, "SELECT id, name, role, photo, color, github, linkedin, email FROM ai_developers ORDER BY sort_order ASC, name ASC");
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $developers[] = $row;
    }
}

echo json_encode([
    "status" => "success",
    "configured" => $configured,
    "data" => $developers
]);
?>
