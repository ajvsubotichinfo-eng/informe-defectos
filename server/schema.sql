-- ════════════════════════════════════════════════════════
-- Schema: Informe de Daños Preexistentes
-- Ejecutar UNA VEZ contra la base de datos de Hostinger
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS damages (
  id          BIGINT          PRIMARY KEY,
  area        VARCHAR(100)    NOT NULL,
  subarea     VARCHAR(150)    DEFAULT NULL,
  title       VARCHAR(255)    NOT NULL,
  description TEXT            DEFAULT NULL,
  severity    ENUM('leve','moderado','grave') DEFAULT NULL,
  videos      JSON            DEFAULT NULL,
  date        VARCHAR(20)     DEFAULT NULL,
  created_by  VARCHAR(100)    NOT NULL,
  created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_severity (severity),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS damage_photos (
  id          BIGINT          AUTO_INCREMENT PRIMARY KEY,
  damage_id   BIGINT          NOT NULL,
  url         VARCHAR(500)    NOT NULL,
  uploaded_at TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (damage_id) REFERENCES damages(id) ON DELETE CASCADE,
  INDEX idx_damage (damage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
