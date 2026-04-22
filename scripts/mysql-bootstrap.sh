#!/usr/bin/env bash
# MySQL bootstrap for OduDoc — run on the VPS as root.
# Creates database, app user, schema, and configures MySQL to accept
# remote TLS connections.
#
# Outputs: DATABASE_URL string to paste into Vercel env vars.

set -euo pipefail

DB_NAME="odudoc"
DB_USER="odudoc_app"
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"

echo "==> Generated app password"

# --- 1. Percona sanity check ------------------------------------------------
if ! command -v mysql >/dev/null; then
  echo "mysql client not found — is Percona installed?" >&2
  exit 1
fi

# The VPS install uses socket auth for root. If that fails, the user will be
# prompted for the root password.
MYSQL_ROOT="mysql"
if ! $MYSQL_ROOT -e "SELECT 1;" >/dev/null 2>&1; then
  echo "Enter MySQL root password when prompted."
  MYSQL_ROOT="mysql -uroot -p"
fi

# --- 2. Database + user -----------------------------------------------------
$MYSQL_ROOT <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Drop user if exists (idempotent re-run)
DROP USER IF EXISTS '${DB_USER}'@'%';
CREATE USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}' REQUIRE SSL;
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "==> Database + user created"

# --- 3. Schema --------------------------------------------------------------
$MYSQL_ROOT "${DB_NAME}" <<'SQL'
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(32)  DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) DEFAULT NULL,
  role          ENUM('patient','doctor','admin') NOT NULL DEFAULT 'patient',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_applications (
  id                   VARCHAR(64)  NOT NULL PRIMARY KEY,
  job_id               VARCHAR(64)  NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  email                VARCHAR(255) NOT NULL,
  phone                VARCHAR(32)  DEFAULT NULL,
  cover_letter         TEXT,
  cv_original_name     VARCHAR(255) DEFAULT NULL,
  cv_stored_filename   VARCHAR(255) DEFAULT NULL,
  status               ENUM('new','reviewing','shortlisted','rejected','hired') NOT NULL DEFAULT 'new',
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (job_id),
  INDEX (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prescriptions (
  id             VARCHAR(64)  NOT NULL PRIMARY KEY,
  doctor_email   VARCHAR(255) NOT NULL,
  patient_email  VARCHAR(255) NOT NULL,
  template_id    VARCHAR(64)  NOT NULL,
  data_json      JSON         NOT NULL,
  status         ENUM('active','cancelled') NOT NULL DEFAULT 'active',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (doctor_email),
  INDEX (patient_email),
  INDEX (created_at)
) ENGINE=InnoDB;
SQL

echo "==> Schema applied"

# --- 4. Bind to all interfaces (for Cloudflare DNS-only hostname) ----------
CONF="/etc/mysql/mysql.conf.d/mysqld.cnf"
if [ ! -f "$CONF" ]; then
  CONF="/etc/mysql/my.cnf"
fi

if grep -qE '^\s*bind-address' "$CONF"; then
  sed -i 's/^\s*bind-address.*/bind-address = 0.0.0.0/' "$CONF"
else
  echo -e "\n[mysqld]\nbind-address = 0.0.0.0" >> "$CONF"
fi

echo "==> bind-address set to 0.0.0.0 in $CONF"

# --- 5. Firewall: allow 3306 from anywhere (TLS + password protect it) -----
if command -v ufw >/dev/null; then
  ufw allow 3306/tcp || true
  echo "==> UFW: allowed 3306/tcp"
fi

# --- 6. Restart MySQL -------------------------------------------------------
systemctl restart mysql
echo "==> MySQL restarted"

# --- 7. Summary -------------------------------------------------------------
VPS_IP="$(curl -s ifconfig.me || echo 'YOUR.VPS.IP')"

echo ""
echo "============================================================"
echo " MySQL bootstrap complete"
echo "============================================================"
echo "Database:   ${DB_NAME}"
echo "User:       ${DB_USER}"
echo "Password:   ${DB_PASS}"
echo ""
echo "Add this to Vercel env + E:\\odudoc\\.env.local:"
echo ""
echo "DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@db.odudoc.com:3306/${DB_NAME}?ssl={\"rejectUnauthorized\":false}"
echo ""
echo "Next step in Cloudflare DNS panel:"
echo "  Type: A"
echo "  Name: db"
echo "  Content: ${VPS_IP}"
echo "  Proxy:  DNS only (grey cloud)"
echo "============================================================"
