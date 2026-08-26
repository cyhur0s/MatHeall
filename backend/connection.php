<?php
/**
 * Konfigurasi bersama backend MatHeal.
 * Nilai produksi dibaca dari environment server atau backend/.env.
 */
function loadLocalEnv($path) {
    if (!is_file($path) || !is_readable($path)) return;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
        list($key, $value) = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"'");
        if ($key !== '' && getenv($key) === false) putenv($key . '=' . $value);
    }
}

loadLocalEnv(__DIR__ . '/.env');

function envValue($key, $default = null) {
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

$appEnv = envValue('APP_ENV', 'production');
$displayErrors = $appEnv === 'development';
ini_set('display_errors', $displayErrors ? '1' : '0');
error_reporting(E_ALL);

$allowedOrigin = envValue('APP_ALLOWED_ORIGIN', '*');
header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// Jawab preflight sebelum autentikasi dan koneksi database dijalankan.
// Permintaan ber-token dari Vite selalu melalui OPTIONS terlebih dahulu.
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$host = envValue('DB_HOST', 'localhost');
$user = envValue('DB_USER', 'matheal');
$pass = envValue('DB_PASSWORD', '');
$db = envValue('DB_NAME', 'matheal');
$port = (int) envValue('DB_PORT', '3307');

mysqli_report(MYSQLI_REPORT_OFF);
$conn = mysqli_connect($host, $user, $pass, $db, $port);

if (!$conn) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => $displayErrors ? ('Koneksi database gagal: ' . mysqli_connect_error()) : 'Layanan database belum tersedia.'
    ]);
    exit;
}

mysqli_set_charset($conn, 'utf8mb4');

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS `ai_aktivitas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `tipe` varchar(50) NOT NULL,
  `deskripsi` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Menjaga instalasi lama tetap kompatibel tanpa migrasi manual.
$activityUserColumn = mysqli_query($conn, "SHOW COLUMNS FROM `ai_aktivitas` LIKE 'user_id'");
if ($activityUserColumn && mysqli_num_rows($activityUserColumn) === 0) {
    mysqli_query($conn, "ALTER TABLE `ai_aktivitas` ADD COLUMN `user_id` int(11) DEFAULT NULL AFTER `id`, ADD KEY `aktivitas_user_id` (`user_id`)");
}

// Instalasi lama belum selalu memiliki status akun. Migrasi ringan ini membuat
// fitur aktif/nonaktif tersedia tanpa menghapus atau mengubah data pengguna.
$userStatusColumn = mysqli_query($conn, "SHOW COLUMNS FROM `users` LIKE 'is_active'");
if ($userStatusColumn && mysqli_num_rows($userStatusColumn) === 0) {
    mysqli_query($conn, "ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`");
}

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS `ai_auth_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_token_hash` (`token_hash`),
  KEY `auth_user_id` (`user_id`),
  KEY `auth_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS `ai_user_progress` (
  `user_id` int NOT NULL,
  `data_json` longtext NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS `ai_chat_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(120) NOT NULL DEFAULT 'Percakapan baru',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `chat_session_user` (`user_id`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS `ai_chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_id` bigint unsigned NOT NULL,
  `role` enum('user','ai') NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `chat_message_session` (`session_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS `ai_rate_limits` (
  `scope_key` char(64) NOT NULL,
  `hits` int unsigned NOT NULL DEFAULT 0,
  `window_start` datetime NOT NULL,
  PRIMARY KEY (`scope_key`),
  KEY `rate_window_start` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if (!function_exists('logActivity')) {
    function logActivity($conn, $tipe, $deskripsi, $userId = null) {
        $stmt = mysqli_prepare($conn, 'INSERT INTO ai_aktivitas (user_id, tipe, deskripsi) VALUES (?, ?, ?)');
        if (!$stmt) return false;
        $safeDescription = mb_substr((string) $deskripsi, 0, 255);
        $actorId = $userId !== null ? (int) $userId : null;
        mysqli_stmt_bind_param($stmt, 'iss', $actorId, $tipe, $safeDescription);
        $result = mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        return $result;
    }
}

if (!function_exists('getBearerToken')) {
    function getBearerToken() {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!$header && function_exists('getallheaders')) {
            $headers = getallheaders();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        return preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches) ? trim($matches[1]) : '';
    }
}

if (!function_exists('enforceRateLimit')) {
    function enforceRateLimit($conn, $scope, $maxHits, $windowSeconds) {
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $scopeKey = hash('sha256', $scope . '|' . $ip);
        $maxHits = max(1, (int) $maxHits);
        $windowSeconds = max(1, (int) $windowSeconds);
        $stmt = mysqli_prepare($conn, "INSERT INTO ai_rate_limits (scope_key, hits, window_start)
          VALUES (?, 1, NOW())
          ON DUPLICATE KEY UPDATE
            hits = IF(window_start < DATE_SUB(NOW(), INTERVAL ? SECOND), 1, hits + 1),
            window_start = IF(window_start < DATE_SUB(NOW(), INTERVAL ? SECOND), NOW(), window_start)");
        mysqli_stmt_bind_param($stmt, 'sii', $scopeKey, $windowSeconds, $windowSeconds);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);

        $read = mysqli_prepare($conn, 'SELECT hits FROM ai_rate_limits WHERE scope_key = ? LIMIT 1');
        mysqli_stmt_bind_param($read, 's', $scopeKey);
        mysqli_stmt_execute($read);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($read));
        mysqli_stmt_close($read);
        if ((int) ($row['hits'] ?? 0) > $maxHits) {
            http_response_code(429);
            header('Retry-After: ' . $windowSeconds);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'error', 'message' => 'Terlalu banyak permintaan. Silakan coba kembali nanti.']);
            exit;
        }
    }
}

if (!function_exists('issueAuthToken')) {
    function issueAuthToken($conn, $userId) {
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $ttlHours = max(1, (int) envValue('AUTH_TOKEN_TTL_HOURS', '24'));
        $expires = date('Y-m-d H:i:s', time() + ($ttlHours * 3600));
        mysqli_query($conn, "DELETE FROM ai_auth_tokens WHERE expires_at < NOW()");
        $stmt = mysqli_prepare($conn, 'INSERT INTO ai_auth_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iss', $userId, $hash, $expires);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        return ['token' => $token, 'expires_at' => $expires];
    }
}

if (!function_exists('authenticatedUser')) {
    function authenticatedUser($conn) {
        $token = getBearerToken();
        if ($token === '') return null;
        $hash = hash('sha256', $token);
        $stmt = mysqli_prepare($conn, "SELECT u.id, u.username, COALESCE(u.role, 'user') AS role, COALESCE(u.is_active, 1) AS is_active
          FROM ai_auth_tokens t JOIN users u ON u.id = t.user_id
          WHERE t.token_hash = ? AND t.expires_at > NOW() LIMIT 1");
        mysqli_stmt_bind_param($stmt, 's', $hash);
        mysqli_stmt_execute($stmt);
        $user = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);
        return $user ?: null;
    }
}

if (!function_exists('requireRole')) {
    function requireRole($conn, $role = null) {
        $user = authenticatedUser($conn);
        if (!$user || !(int) ($user['is_active'] ?? 1) || ($role !== null && $user['role'] !== $role)) {
            http_response_code($user ? 403 : 401);
            header('Content-Type: application/json; charset=utf-8');
            $message = !$user
                ? 'Sesi login tidak valid atau telah berakhir.'
                : (!(int) ($user['is_active'] ?? 1) ? 'Akun ini sedang dinonaktifkan.' : 'Akses ditolak.');
            echo json_encode(['status' => 'error', 'message' => $message]);
            exit;
        }
        return $user;
    }
}
?>
