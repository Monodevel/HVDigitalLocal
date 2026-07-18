# HVDigital Local

Aplicación local y monousuario para la gestión digital de procesos de calificación, desarrollada con Tauri 2, Vue 3, TypeScript, Rust y SQLite.

## Tecnologías

- Tauri 2
- Vue 3
- TypeScript
- Vite
- Tailwind CSS 4
- Rust
- SQLite mediante `tauri-plugin-sql`

## Requisitos de desarrollo

- Node.js 22 LTS o superior compatible
- npm
- Rust estable mediante Rustup
- Dependencias nativas de Tauri para el sistema operativo

En Windows se requiere además Visual Studio Build Tools con la carga de trabajo **Desarrollo para el escritorio con C++** y WebView2.

## Instalación

```powershell
npm ci
```

No se recomienda ejecutar `npm update`, `cargo update` ni eliminar los archivos `package-lock.json` y `Cargo.lock` durante la instalación inicial en un equipo nuevo.

## Ejecución en desarrollo

```powershell
npm run tauri dev
```

## Validaciones

Frontend:

```powershell
npm run build
```

Rust:

```powershell
cd src-tauri
cargo check
cd ..
```

Compilación completa:

```powershell
npm run tauri build
```

## Base de datos

La aplicación utiliza una base SQLite local cargada como:

```text
sqlite:hvdigital.db
```

Las migraciones activas se registran exclusivamente en:

```text
src-tauri/src/lib.rs
```

Los archivos cuyo nombre contenga `_OBSOLETA` o `_NO_APLICAR` se conservan solamente como referencia histórica y nunca deben registrarse en el constructor de migraciones.

## Estructura principal

```text
src/                         Interfaz Vue y servicios TypeScript
src-tauri/src/               Núcleo Rust y configuración de Tauri
src-tauri/migrations/        Migraciones SQLite
src-tauri/capabilities/      Permisos de Tauri
```

## Datos sensibles

El repositorio no debe contener:

- bases de datos reales;
- archivos `.db-wal` o `.db-shm`;
- documentos personales;
- respaldos;
- archivos `.env` con secretos;
- certificados o claves privadas.
