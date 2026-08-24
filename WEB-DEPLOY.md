# HVDigital Web + MariaDB

Esta rama transforma HVDigital en una aplicación web manteniendo el frontend Vue 3 + PrimeVue y sustituyendo la persistencia local de Tauri por un backend Rust/Axum conectado a MariaDB.

## Arquitectura

- Frontend: Vue 3 + PrimeVue + Vite.
- Backend: Rust + Axum.
- Acceso a datos: SQLx con pool MariaDB.
- Base central: MariaDB 10.11/11.x compatible.
- Servidor web: Nginx.
- API: `127.0.0.1:8080`, publicada únicamente mediante `/api/` en Nginx.
- Autenticación: usuario único `calificador`, contraseña Argon2id y sesión temporal.
- Respaldos: `mariadb-dump` descargable desde Configuración.
- Restauración: importación de respaldo SQL desde navegador.
- Notificaciones: Web Notifications API.

## Compatibilidad con la aplicación existente

El frontend conserva temporalmente la interfaz `Database.select/execute` utilizada por Tauri. En la edición web esa interfaz se redirige al backend Rust y el servidor adapta los placeholders y algunas construcciones SQLite a MariaDB.

Para una instalación nueva, `deploy/bootstrap_mariadb.py` aplica primero las migraciones históricas de HVDigital en una SQLite temporal y reconstruye las tablas, índices, datos de catálogo y vistas compatibles en MariaDB. Este mecanismo también permite importar una `hvdigital.db` existente.

La arquitectura definitiva debe ir sustituyendo gradualmente las consultas SQL enviadas por el frontend por endpoints de dominio específicos, especialmente antes de habilitar múltiples roles o exposición fuera de una red controlada.

## LXC recomendado

Para aplicación y MariaDB en el mismo contenedor:

- Debian 13.
- 2 vCPU mínimo; 4 vCPU recomendado.
- 4 GB RAM recomendado.
- 24-32 GB de disco mínimo.
- IP fija o reserva DHCP.

## Instalación automática con MariaDB local

```bash
apt update && apt install -y git
cd /root
git clone --branch feature/remote-database https://github.com/Monodevel/HVDigitalLocal.git
cd HVDigitalLocal
chmod +x deploy/install-lxc.sh
./deploy/install-lxc.sh
```

El instalador:

1. instala Nginx, MariaDB Server/Client, Node.js 22 y Rust;
2. genera una contraseña aleatoria para el usuario MariaDB `hvdigital`;
3. crea la base `hvdigital` con `utf8mb4`;
4. reconstruye el esquema completo desde las migraciones históricas;
5. compila Vue;
6. compila Rust/Axum;
7. instala el servicio `hvdigital-web`;
8. publica la aplicación por Nginx.

Las credenciales internas de MariaDB quedan en:

```text
/etc/hvdigital/hvdigital.env
```

con permisos restringidos a `root:hvdigital`.

## Importar la base SQLite actual

Copie primero su `hvdigital.db` al LXC, por ejemplo:

```text
/root/hvdigital.db
```

Luego ejecute la instalación indicando el archivo:

```bash
HVDIGITAL_LEGACY_DB=/root/hvdigital.db ./deploy/install-lxc.sh
```

El bootstrap crea las tablas MariaDB e importa los registros del archivo SQLite. El archivo original no se modifica.

Si HVDigital Web ya está instalado, puede ejecutar manualmente:

```bash
cd /opt/hvdigital-src
set -a
source /etc/hvdigital/hvdigital.env
set +a
export HVDIGITAL_DB_HOST HVDIGITAL_DB_PORT HVDIGITAL_DB_USER HVDIGITAL_DB_PASSWORD HVDIGITAL_DB_NAME
python3 deploy/bootstrap_mariadb.py --source /root/hvdigital.db --drop-existing
systemctl restart hvdigital-web
```

## MariaDB en otro LXC

Puede separar la aplicación y la base de datos.

Ejemplo:

```text
LXC 210  HVDigital Web    192.168.1.210
LXC 211  MariaDB          192.168.1.211
```

En el servidor MariaDB cree la base y el usuario permitiendo únicamente la IP del LXC de HVDigital:

```sql
CREATE DATABASE hvdigital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hvdigital'@'192.168.1.210' IDENTIFIED BY 'CLAVE_LARGA_AQUI';
GRANT ALL PRIVILEGES ON hvdigital.* TO 'hvdigital'@'192.168.1.210';
FLUSH PRIVILEGES;
```

Después, en el LXC de HVDigital ejecute el instalador con las variables correspondientes:

```bash
HVDIGITAL_DB_HOST=192.168.1.211 \
HVDIGITAL_DB_PORT=3306 \
HVDIGITAL_DB_NAME=hvdigital \
HVDIGITAL_DB_USER=hvdigital \
HVDIGITAL_DB_PASSWORD='CLAVE_LARGA_AQUI' \
./deploy/install-lxc.sh
```

No publique MariaDB hacia Internet. Limite el puerto 3306 a la red interna o, idealmente, únicamente a la IP del servidor HVDigital mediante firewall.

## Desarrollo

Prepare una MariaDB local:

```sql
CREATE DATABASE hvdigital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hvdigital'@'127.0.0.1' IDENTIFIED BY 'hvdigital';
GRANT ALL PRIVILEGES ON hvdigital.* TO 'hvdigital'@'127.0.0.1';
```

Ejecute el bootstrap:

```bash
export HVDIGITAL_DB_HOST=127.0.0.1
export HVDIGITAL_DB_PORT=3306
export HVDIGITAL_DB_USER=hvdigital
export HVDIGITAL_DB_PASSWORD=hvdigital
export HVDIGITAL_DB_NAME=hvdigital
python3 deploy/bootstrap_mariadb.py --drop-existing
```

Backend:

```bash
export DATABASE_URL='mysql://hvdigital:hvdigital@127.0.0.1:3306/hvdigital'
cargo run --manifest-path server/Cargo.toml
```

Frontend:

```bash
npm install
npm run dev
```

Vite publica en `http://localhost:5173` y reenvía `/api` a `http://127.0.0.1:8080`.

## Verificación

```bash
systemctl status mariadb --no-pager
systemctl status hvdigital-web --no-pager
systemctl status nginx --no-pager
curl http://127.0.0.1:8080/api/health
journalctl -u hvdigital-web -f
```

La respuesta de salud debe indicar:

```json
{
  "ok": true,
  "service": "HVDigital Web API",
  "database": "MariaDB"
}
```

## Directorios principales

```text
/opt/hvdigital/bin/hvdigital-web-server
/opt/hvdigital/web/
/var/lib/hvdigital/backups/
/etc/hvdigital/hvdigital.env
/etc/systemd/system/hvdigital-web.service
/etc/nginx/sites-available/hvdigital
```

## Respaldos

Desde HVDigital:

```text
Configuración -> Base de datos -> Crear respaldo
```

genera una descarga SQL producida con `mariadb-dump --single-transaction`.

También puede respaldar manualmente:

```bash
set -a
source /etc/hvdigital/hvdigital.env
set +a
mariadb-dump \
  --host="$HVDIGITAL_DB_HOST" \
  --port="$HVDIGITAL_DB_PORT" \
  --user="$HVDIGITAL_DB_USER" \
  --password="$HVDIGITAL_DB_PASSWORD" \
  --single-transaction --routines --triggers --events --hex-blob \
  "$HVDIGITAL_DB_NAME" > /var/lib/hvdigital/backups/manual.sql
```

## Actualización

```bash
cd /opt/hvdigital-src
git pull origin feature/remote-database
npm install
npm run build
cargo build --release --manifest-path server/Cargo.toml
systemctl stop hvdigital-web
cp server/target/release/hvdigital-web-server /opt/hvdigital/bin/
rm -rf /opt/hvdigital/web/*
cp -a dist/. /opt/hvdigital/web/
systemctl start hvdigital-web
systemctl reload nginx
```

No ejecute `bootstrap_mariadb.py --drop-existing` durante una actualización ordinaria porque recrea el esquema. Úselo solamente para una instalación nueva o una importación controlada desde SQLite.

## HTTPS

No exponga directamente los puertos 8080 ni 3306. Publique únicamente Nginx mediante HTTPS, por ejemplo detrás de Nginx Proxy Manager. Para acceso fuera del hogar se recomienda VPN o un control de acceso adicional.
