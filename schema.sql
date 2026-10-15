-- =====================================================================
-- CV Matcher - esquema completo de la base de datos (MySQL / MariaDB)
-- Instalación desde cero:   mysql -u root -p < schema.sql
-- Es idempotente (CREATE ... IF NOT EXISTS), pero NO modifica tablas que
-- ya existan: para una BD existente usa el bloque "MIGRACIÓN" del final.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS cv_matcher_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cv_matcher_db;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_resets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_user (user_id),
  CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cvs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  title      VARCHAR(255) NOT NULL DEFAULT 'Mi CV',
  full_name  VARCHAR(255) NOT NULL DEFAULT '',
  email      VARCHAR(255) NOT NULL DEFAULT '',
  phone      VARCHAR(50)  NOT NULL DEFAULT '',
  summary    TEXT NULL,
  photo      MEDIUMTEXT NULL,               -- imagen en base64 (hasta ~16 MB)
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  template   VARCHAR(20) NOT NULL DEFAULT 'modern',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cvs_user (user_id),
  CONSTRAINT fk_cvs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cv_experiences (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cv_id      INT NOT NULL,
  company    VARCHAR(255) NOT NULL,
  position   VARCHAR(255) NOT NULL,
  start_date DATE NULL,
  end_date   DATE NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_exp_cv (cv_id),
  CONSTRAINT fk_exp_cv FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cv_education (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  cv_id       INT NOT NULL,
  institution VARCHAR(255) NOT NULL,
  degree      VARCHAR(255) NOT NULL,
  start_date  DATE NULL,
  end_date    DATE NULL,
  is_current  TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_edu_cv (cv_id),
  CONSTRAINT fk_edu_cv FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cv_skills (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cv_id      INT NOT NULL,
  skill_name VARCHAR(255) NOT NULL,
  level      VARCHAR(50)  NOT NULL DEFAULT 'Básico',
  INDEX idx_skills_cv (cv_id),
  CONSTRAINT fk_skills_cv FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- cv_id admite NULL: si borras un CV, sus candidaturas se conservan.
CREATE TABLE IF NOT EXISTS job_applications (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  cv_id            INT NULL,
  company_name     VARCHAR(255) NOT NULL,
  job_title        VARCHAR(255) NOT NULL,
  job_description  TEXT NOT NULL,
  match_percentage INT NOT NULL DEFAULT 0,
  slug             VARCHAR(255) NOT NULL UNIQUE,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ja_user (user_id),
  CONSTRAINT fk_ja_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ja_cv   FOREIGN KEY (cv_id)   REFERENCES cvs(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- NOTA: tu base de datos actual también tiene la tabla `application_views`,
-- que el código no usa todavía. Para incluirla aquí ejecuta
--   SHOW CREATE TABLE application_views;
-- y pega el resultado en este archivo.

-- =====================================================================
-- MIGRACIÓN para una base de datos YA existente (ejecutar una sola vez)
-- =====================================================================
-- 1) La foto en base64 puede superar los 64 KB de un TEXT normal:
--      ALTER TABLE cvs MODIFY photo MEDIUMTEXT NULL;
-- 2) Para que borrar un CV conserve sus candidaturas:
--      ALTER TABLE job_applications MODIFY cv_id INT NULL;
