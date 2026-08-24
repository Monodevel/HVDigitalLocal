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

apt-get update
apt-get install -y ca-certificates curl git nginx build-essential pkg-config libssl-dev

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

rm -rf "$SRC_DIR"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$SRC_DIR"
cd "$SRC_DIR"

npm install
npm run build
cargo build --release --manifest-path server/Cargo.toml

mkdir -p "$APP_DIR/bin" "$APP_DIR/web" "$DATA_DIR/backups"
cp server/target/release/hvdigital-web-server "$APP_DIR/bin/"
rm -rf "$APP_DIR/web"/*
cp -a dist/. "$APP_DIR/web/"
cp deploy/hvdigital-web.service /etc/systemd/system/hvdigital-web.service
cp deploy/nginx-hvdigital.conf /etc/nginx/sites-available/hvdigital
ln -sfn /etc/nginx/sites-available/hvdigital /etc/nginx/sites-enabled/hvdigital
rm -f /etc/nginx/sites-enabled/default

chown -R hvdigital:hvdigital "$DATA_DIR"
chmod 750 "$DATA_DIR"
chmod 755 "$APP_DIR/bin/hvdigital-web-server"

systemctl daemon-reload
systemctl enable --now hvdigital-web
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo
echo "HVDigital Web instalado."
echo "API: http://127.0.0.1:8080/api/health"
echo "Web: http://IP_DEL_LXC/"
echo "Usuario inicial: calificador"
echo "Cambie la contraseña inicial desde Configuración después del primer acceso."
