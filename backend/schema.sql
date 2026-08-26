-- Struktur database minimum MatHeal untuk server produksi.
-- Pilih database tujuan melalui panel hosting sebelum mengimpor berkas ini.

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_materi (
  id_materi INT NOT NULL AUTO_INCREMENT,
  nama_materi VARCHAR(255) NOT NULL,
  deskripsi TEXT NULL,
  isi_materi LONGTEXT NULL,
  file_materi VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  topik VARCHAR(100) DEFAULT '',
  kesulitan VARCHAR(50) DEFAULT '',
  PRIMARY KEY (id_materi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_soal (
  id_soal INT NOT NULL AUTO_INCREMENT,
  id_materi INT NOT NULL,
  pertanyaan TEXT NOT NULL,
  kunci_jawaban TEXT NULL,
  rubrik_penilaian TEXT NULL,
  tingkat ENUM('mudah','sedang','sulit') NOT NULL DEFAULT 'sedang',
  tipe ENUM('pg','esai','tf') NOT NULL DEFAULT 'esai',
  opsi LONGTEXT NULL,
  poin INT NOT NULL DEFAULT 10,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_soal),
  KEY soal_materi (id_materi),
  KEY soal_tingkat (tingkat),
  CONSTRAINT soal_materi_fk FOREIGN KEY (id_materi) REFERENCES ai_materi(id_materi) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_tutor (
  id_video INT NOT NULL AUTO_INCREMENT,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT NULL,
  url_video VARCHAR(500) NOT NULL,
  thumbnail VARCHAR(500) NULL,
  kategori VARCHAR(100) DEFAULT 'Umum',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_video)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_aktivitas (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  tipe VARCHAR(50) NOT NULL,
  deskripsi VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY aktivitas_user_id (user_id),
  KEY aktivitas_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_auth_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY auth_token_hash (token_hash),
  KEY auth_user_id (user_id),
  KEY auth_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_user_progress (
  user_id INT NOT NULL,
  data_json LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL DEFAULT 'Percakapan baru',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY chat_session_user (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  role ENUM('user','ai') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY chat_message_session (session_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_password_reset_requests (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  status ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY reset_username_status (username, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  scope_key CHAR(64) NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  window_start DATETIME NOT NULL,
  PRIMARY KEY (scope_key),
  KEY rate_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_developers (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(120) NOT NULL,
  photo LONGTEXT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#397582',
  github VARCHAR(255) NULL,
  linkedin VARCHAR(255) NULL,
  email VARCHAR(190) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_developer_meta (
  id TINYINT NOT NULL DEFAULT 1,
  configured TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
