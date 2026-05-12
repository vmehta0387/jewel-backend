#!/usr/bin/env bash
set -euo pipefail

# Railway -> EC2 MySQL migration helper
# Usage:
#   chmod +x scripts/migrate-railway-to-ec2.sh
#   SOURCE_DB_HOST=... SOURCE_DB_PORT=... SOURCE_DB_USER=... SOURCE_DB_PASSWORD=... SOURCE_DB_NAME=railway \
#   TARGET_DB_HOST=127.0.0.1 TARGET_DB_PORT=3306 TARGET_DB_USER=root TARGET_DB_PASSWORD=... TARGET_DB_NAME=blitznyc \
#   ./scripts/migrate-railway-to-ec2.sh

load_env_file() {
  local file="$1"
  if [ -f "$file" ]; then
    # shellcheck disable=SC1090
    set -a; source "$file"; set +a
  fi
}

# Auto-load env file if present (keeps CLI usage simple on EC2)
load_env_file "./scripts/migration.env"

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "[ERROR] Missing required env var: $name" >&2
    exit 1
  fi
}

require_var SOURCE_DB_HOST
require_var SOURCE_DB_PORT
require_var SOURCE_DB_USER
require_var SOURCE_DB_PASSWORD
require_var SOURCE_DB_NAME
require_var TARGET_DB_HOST
require_var TARGET_DB_PORT
require_var TARGET_DB_USER
require_var TARGET_DB_PASSWORD
require_var TARGET_DB_NAME

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "[ERROR] mysqldump not found. Install mysql-client first." >&2
  echo "Ubuntu: sudo apt-get update && sudo apt-get install -y mysql-client" >&2
  exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "[ERROR] mysql client not found. Install mysql-client first." >&2
  echo "Ubuntu: sudo apt-get update && sudo apt-get install -y mysql-client" >&2
  exit 1
fi

TS="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${MIGRATION_OUT_DIR:-./migration_artifacts}"
mkdir -p "$OUT_DIR"

SOURCE_DUMP="$OUT_DIR/source_${SOURCE_DB_NAME}_${TS}.sql"
TARGET_BACKUP="$OUT_DIR/target_backup_${TARGET_DB_NAME}_${TS}.sql"
FINAL_DUMP="$OUT_DIR/final_import_${TARGET_DB_NAME}_${TS}.sql"

MYSQL_SOURCE=(
  --host="$SOURCE_DB_HOST"
  --port="$SOURCE_DB_PORT"
  --user="$SOURCE_DB_USER"
  --password="$SOURCE_DB_PASSWORD"
  --default-character-set=utf8mb4
)

MYSQL_TARGET=(
  --host="$TARGET_DB_HOST"
  --port="$TARGET_DB_PORT"
  --user="$TARGET_DB_USER"
  --password="$TARGET_DB_PASSWORD"
  --default-character-set=utf8mb4
)

echo "[1/6] Checking source connectivity..."
mysql "${MYSQL_SOURCE[@]}" -e "SELECT 1" "$SOURCE_DB_NAME" >/dev/null

echo "[2/6] Checking target connectivity..."
mysql "${MYSQL_TARGET[@]}" -e "SELECT 1" >/dev/null

echo "[3/6] Ensuring target database exists: $TARGET_DB_NAME"
mysql "${MYSQL_TARGET[@]}" -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "[4/6] Backing up current target database to: $TARGET_BACKUP"
mysqldump "${MYSQL_TARGET[@]}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --set-gtid-purged=OFF \
  "$TARGET_DB_NAME" > "$TARGET_BACKUP"

echo "[5/6] Exporting source database from Railway to: $SOURCE_DUMP"
mysqldump "${MYSQL_SOURCE[@]}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --set-gtid-purged=OFF \
  "$SOURCE_DB_NAME" > "$SOURCE_DUMP"

# Remove DEFINER clauses to avoid privilege issues on target server.
sed -E 's/DEFINER=`[^`]+`@`[^`]+`//g' "$SOURCE_DUMP" > "$FINAL_DUMP"

echo "[6/6] Importing into target database: $TARGET_DB_NAME"
mysql "${MYSQL_TARGET[@]}" "$TARGET_DB_NAME" < "$FINAL_DUMP"

echo ""
echo "Migration completed successfully."
echo "Artifacts:"
echo "  - Target backup: $TARGET_BACKUP"
echo "  - Source dump:   $SOURCE_DUMP"
echo "  - Imported SQL:  $FINAL_DUMP"
