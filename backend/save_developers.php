<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metode tidak didukung."]);
    exit();
}

include "connection.php";
requireRole($conn, "admin");
$payload = json_decode(file_get_contents("php://input"), true);
$developers = $payload["developers"] ?? null;

if (!is_array($developers)) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Data developer tidak valid."]);
    exit();
}

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

mysqli_begin_transaction($conn);
try {
    if (!mysqli_query($conn, "DELETE FROM ai_developers")) {
        throw new Exception(mysqli_error($conn));
    }

    $statement = mysqli_prepare($conn, "INSERT INTO ai_developers (id, name, role, photo, color, github, linkedin, email, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$statement) throw new Exception(mysqli_error($conn));

    foreach ($developers as $index => $developer) {
        $id = (string) ($developer["id"] ?? (string) round(microtime(true) * 1000) . "-" . $index);
        $name = trim((string) ($developer["name"] ?? "Developer"));
        $role = trim((string) ($developer["role"] ?? "Developer"));
        $photo = (string) ($developer["photo"] ?? "");
        $color = (string) ($developer["color"] ?? "#397582");
        $github = trim((string) ($developer["github"] ?? ""));
        $linkedin = trim((string) ($developer["linkedin"] ?? ""));
        $email = trim((string) ($developer["email"] ?? ""));
        $sortOrder = (int) $index;
        mysqli_stmt_bind_param($statement, "ssssssssi", $id, $name, $role, $photo, $color, $github, $linkedin, $email, $sortOrder);
        if (!mysqli_stmt_execute($statement)) throw new Exception(mysqli_stmt_error($statement));
    }
    mysqli_stmt_close($statement);

    if (!mysqli_query($conn, "INSERT INTO ai_developer_meta (id, configured) VALUES (1, 1) ON DUPLICATE KEY UPDATE configured = 1")) {
        throw new Exception(mysqli_error($conn));
    }
    mysqli_commit($conn);
    logActivity($conn, "admin_developer", "Admin memperbarui data developer landing page.");
    echo json_encode(["status" => "success", "message" => "Data developer tersimpan."]);
} catch (Throwable $error) {
    mysqli_rollback($conn);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal menyimpan data developer."]);
}
?>
