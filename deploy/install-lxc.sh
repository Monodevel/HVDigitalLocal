#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Ejecute este script como root." >&2
  exit 1
fi

REPO_URL="${REPO_URL:-https://github.com/Monodevel/HVDigitalLocal.git}"
BRANCH="${BRANCH:-feature/remote-database}"
APP_DIR="/opt/hvdigital"
SRC_DIR="/opt/hvdigital-src"
DATA_DIR="/var/lib/hvdigital"
CONF_DIR="/etc/hvdigital"
DB_NAME="${HVDIGITAL_DB_NAME:-hvdigital}"
DB_USER="${HVDIGITAL_DB_USER:-hvdigital}"
DB_HOST="${HVDIGITAL_DB_HOST:-127.0.0.1}"
DB_PORT="${HVDIGITAL_DB_PORT:-3306}"
DB_PASSWORD="${HVDIGITAL_DB_PASSWORD:-$(openssl rand -hex 24 2>/dev/null || tr -dc A-Za-z0-9 </dev/urandom | head -c 48)}"
LEGACY_DB="${HVDIGITAL_LEGACY_DB:-}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  ca-certificates curl git nginx build-essential pkg-config libssl-dev \
  mariadb-server mariadb-client python3 python3-pymysql openssl

systemctl enable --now mariadb

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'Number(process.versions.node.split(`.`)[0])' 2>/dev/null || echo 0)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v cargo >/dev/null 2>&1; then
  curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal
  source /root/.cargo/env
fi

if ! id hvdigital >/dev/null 2>&1; then
  useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin hvdigital
fi

mkdir -p "$DATA_DIR/backups" "$CONF_DIR"
chown -R hvdigital:hvdigital "$DATA_DIR"
chmod 750 "$DATA_DIR"

if [[ "$DB_HOST" == "127.0.0.1" || "$DB_HOST" == "localhost" ]]; then
  mariadb --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
fi

cat > "$CONF_DIR/hvdigital.env" <<EOF
DATABASE_URL=mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
HVDIGITAL_DB_HOST=$DB_HOST
HVDIGITAL_DB_PORT=$DB_PORT
HVDIGITAL_DB_USER=$DB_USER
HVDIGITAL_DB_PASSWORD=$DB_PASSWORD
HVDIGITAL_DB_NAME=$DB_NAME
EOF
chown root:hvdigital "$CONF_DIR/hvdigital.env"
chmod 640 "$CONF_DIR/hvdigital.env"

rm -rf "$SRC_DIR"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$SRC_DIR"
cd "$SRC_DIR"

export HVDIGITAL_DB_HOST="$DB_HOST"
export HVDIGITAL_DB_PORT="$DB_PORT"
export HVDIGITAL_DB_USER="$DB_USER"
export HVDIGITAL_DB_PASSWORD="$DB_PASSWORD"
export HVDIGITAL_DB_NAME="$DB_NAME"

if [[ -n "$LEGACY_DB" ]]; then
  python3 deploy/bootstrap_mariadb.py --source "$LEGACY_DB" --drop-existing
else
  python3 deploy/bootstrap_mariadb.py --drop-existing
fi

npm install
npm run build
cargo build --release --manifest-path server/Cargo.toml

mkdir -p "$APP_DIR/bin" "$APP_DIR/web"
cp server/target/release/hvdigital-web-server "$APP_DIR/bin/"
rm -rf "$APP_DIR/web"/*
cp -a dist/. "$APP_DIR/web/"
cp deploy/hvdigital-web.service /etc/systemd/system/hvdigital-web.service
cp deploy/nginx-hvdigital.conf /etc/nginx/sites-available/hvdigital
ln -sfn /etc/nginx/sites-available/hvdigital /etc/nginx/sites-enabled/hvdigital
rm -f /etc/nginx/sites-enabled/default

chmod 755 "$APP_DIR/bin/hvdigital-web-server"
systemctl daemon-reload
systemctl enable --now hvdigital-web
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo
echo "HVDigital Web + MariaDB instalado."
echo "Web: http://IP_DEL_LXC/"
echo "API local: http://127.0.0.1:8080/api/health"
echo "MariaDB: $DB_HOST:$DB_PORT / $DB_NAME"
echo "Usuario HVDigital inicial: calificador"
echo "Cambie la contraseña inicial desde Configuración después del primer acceso."
echo "Credenciales MariaDB: $CONF_DIR/hvdigital.env"
