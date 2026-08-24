# HVDigital Web

Esta rama transforma HVDigital en una aplicación web manteniendo el frontend Vue 3 + PrimeVue y las reglas SQLite existentes. La base `hvdigital.db` reside únicamente en el servidor. El navegador accede a ella mediante una API Rust/Axum autenticada.

## Arquitectura

- Frontend: Vue 3 + PrimeVue + Vite.
- Backend: Rust + Axum.
- Persistencia: SQLite central en `/var/lib/hvdigital/hvdigital.db`.
- Servidor web: Nginx.
- API: escucha solo en `127.0.0.1:8080` y Nginx publica `/api/`.
- Autenticación: usuario único `calificador`, contraseña Argon2id y sesión temporal por token.
- Respaldos: descarga `.hvbk` desde el navegador y restauración por carga de archivo.
- Notificaciones: Web Notifications API.

## Desarrollo

Terminal 1:

```bash
cargo run --manifest-path server/Cargo.toml
```

Terminal 2:

```bash
npm install
npm run dev
```

Vite publica por defecto en `http://localhost:5173` y envía `/api` a `http://127.0.0.1:8080`.

## Build

```bash
npm install
npm run build
cargo build --release --manifest-path server/Cargo.toml
```

Resultados:

- Frontend: `dist/`
- API: `server/target/release/hvdigital-web-server`

## LXC recomendado

Debian 13 o Ubuntu 24.04, 2 vCPU, 2-4 GB RAM y 16 GB de disco como mínimo. Asigne IP fija o reserva DHCP.

### Instalación automática

```bash
apt update && apt install -y git
cd /root
git clone --branch feature/remote-database https://github.com/Monodevel/HVDigitalLocal.git
cd HVDigitalLocal
chmod +x deploy/install-lxc.sh
./deploy/install-lxc.sh
```

Al terminar, abra `http://IP_DEL_LXC/`.

### Verificación

```bash
systemctl status hvdigital-web --no-pager
systemctl status nginx --no-pager
curl http://127.0.0.1:8080/api/health
journalctl -u hvdigital-web -f
```

## Directorios instalados

```text
/opt/hvdigital/bin/hvdigital-web-server
/opt/hvdigital/web/
/var/lib/hvdigital/hvdigital.db
/var/lib/hvdigital/backups/
/etc/systemd/system/hvdigital-web.service
/etc/nginx/sites-available/hvdigital
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

## Publicación HTTPS

No exponga el puerto 8080. Mantenga la API en localhost y publique únicamente Nginx mediante HTTPS. Puede colocar HVDigital detrás de Nginx Proxy Manager o un proxy inverso existente. Para acceso desde Internet se recomienda además VPN o una política de acceso restringida.

## Migración desde Tauri

Para conservar datos existentes, detenga el servicio web y copie el `hvdigital.db` de la instalación Tauri a `/var/lib/hvdigital/hvdigital.db`. Después ajuste permisos y reinicie:

```bash
systemctl stop hvdigital-web
cp /ruta/al/hvdigital.db /var/lib/hvdigital/hvdigital.db
chown hvdigital:hvdigital /var/lib/hvdigital/hvdigital.db
chmod 600 /var/lib/hvdigital/hvdigital.db
systemctl start hvdigital-web
```

El servidor ejecuta las migraciones pendientes al iniciar.

## Consideraciones

La edición web mantiene SQLite para máxima compatibilidad con la lógica actual. Es adecuada para un número pequeño de usuarios concurrentes. Si HVDigital evoluciona a uso multiusuario intensivo, la siguiente migración recomendada es PostgreSQL con endpoints de dominio en lugar del adaptador SQL genérico de compatibilidad.
