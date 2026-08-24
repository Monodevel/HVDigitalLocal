#!/usr/bin/env python3
import argparse
import json
import os
import re
import sqlite3
import sys
import tempfile
from pathlib import Path

import pymysql

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = [
    "002_catalogos_normativos.sql",
    "003_grados_calidades.sql",
    "004_factores_normativos.sql",
    "005_catalogo_anotaciones.sql",
    "006_motor_plantillas_anotacion.sql",
    "007_puntajes_y_efectos_anotaciones.sql",
    "008_personas_hojas_vida_anotaciones.sql",
    "009_vincular_borrador_anotacion.sql",
    "011_configuracion_inicial.sql",
    "012_designaciones_expedientes.sql",
    "013_panel_periodo.sql",
    "014_expediente_detalle.sql",
    "015_hoja_vida_operativa.sql",
    "016_evint.sql",
    "018_formato_oficial_evint.sql",
    "020_corregir_escala_calculo_evint.sql",
    "021_hoja_vida_cronologica.sql",
    "022_resoluciones_anotaciones_libres.sql",
    "023_resoluciones_documentales.sql",
    "024_vinculo_resolucion_documental_anotacion.sql",
    "025_hc2_calificaciones.sql",
    "026_hc1_ham_hapsem.sql",
    "027_fotografia_calificados.sql",
]

CORE_SQL = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS configuracion (
 id INTEGER PRIMARY KEY CHECK (id = 1), unidad_nombre TEXT NOT NULL,
 unidad_sigla TEXT NOT NULL, responsable TEXT NOT NULL,
 periodo_activo_id INTEGER NULL, configurado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS periodos (
 id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, anio INTEGER NOT NULL,
 fecha_inicio TEXT NOT NULL, fecha_termino TEXT NOT NULL,
 estado TEXT NOT NULL DEFAULT 'abierto', creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_periodos_anio ON periodos(anio);
"""


def build_sqlite_schema() -> Path:
    fd, name = tempfile.mkstemp(prefix="hvdigital-bootstrap-", suffix=".db")
    os.close(fd)
    path = Path(name)
    db = sqlite3.connect(path)
    try:
        db.executescript(CORE_SQL)
        for filename in MIGRATIONS:
            migration = ROOT / "src-tauri" / "migrations" / filename
            if not migration.exists():
                print(f"[WARN] Migración no encontrada: {filename}")
                continue
            try:
                db.executescript(migration.read_text(encoding="utf-8"))
                db.commit()
                print(f"[OK] SQLite base: {filename}")
            except sqlite3.DatabaseError as exc:
                db.rollback()
                print(f"[WARN] {filename}: {exc}")
        return path
    finally:
        db.close()


def mysql_conn():
    return pymysql.connect(
        host=os.environ.get("HVDIGITAL_DB_HOST", "127.0.0.1"),
        port=int(os.environ.get("HVDIGITAL_DB_PORT", "3306")),
        user=os.environ.get("HVDIGITAL_DB_USER", "hvdigital"),
        password=os.environ.get("HVDIGITAL_DB_PASSWORD", "hvdigital"),
        database=os.environ.get("HVDIGITAL_DB_NAME", "hvdigital"),
        charset="utf8mb4",
        autocommit=False,
    )


def q(name: str) -> str:
    return "`" + name.replace("`", "``") + "`"


def default_sql(value):
    if value is None:
        return ""
    raw = str(value).strip()
    upper = raw.upper()
    if upper in {"CURRENT_TIMESTAMP", "CURRENT_DATE", "CURRENT_TIME", "NULL"}:
        return f" DEFAULT {upper}"
    if re.fullmatch(r"[-+]?\d+(\.\d+)?", raw):
        return f" DEFAULT {raw}"
    if (raw.startswith("'") and raw.endswith("'")) or (raw.startswith('"') and raw.endswith('"')):
        content = raw[1:-1].replace("'", "''")
        return f" DEFAULT '{content}'"
    return ""


def table_metadata(src, table):
    cols = src.execute(f"PRAGMA table_info({q(table)})").fetchall()
    indexes = src.execute(f"PRAGMA index_list({q(table)})").fetchall()
    indexed = set()
    unique_defs = []
    for idx in indexes:
        idx_name = idx[1]
        is_unique = bool(idx[2])
        idx_cols = [r[2] for r in src.execute(f"PRAGMA index_info({q(idx_name)})").fetchall()]
        indexed.update(idx_cols)
        if is_unique and idx_cols:
            unique_defs.append((idx_name, idx_cols))
    return cols, indexed, unique_defs


def map_type(sqlite_type: str, keyed: bool, pk: bool):
    t = (sqlite_type or "TEXT").upper()
    if "INT" in t:
        return "BIGINT"
    if any(x in t for x in ("REAL", "FLOA", "DOUB", "NUMERIC", "DECIMAL")):
        return "DOUBLE"
    if "BLOB" in t:
        return "LONGBLOB"
    if any(x in t for x in ("DATE", "TIME")):
        return "VARCHAR(64)"
    if keyed or pk:
        return "VARCHAR(255)"
    return "LONGTEXT"


def create_table(src, dst, table):
    cols, indexed, unique_defs = table_metadata(src, table)
    pk_cols = [row[1] for row in sorted(cols, key=lambda r: r[5]) if row[5]]
    single_int_pk = False
    if len(pk_cols) == 1:
        row = next(r for r in cols if r[1] == pk_cols[0])
        single_int_pk = "INT" in (row[2] or "").upper()

    defs = []
    for _, name, coltype, notnull, default, pk_order in cols:
        is_pk = bool(pk_order)
        typ = map_type(coltype, name in indexed, is_pk)
        part = f"{q(name)} {typ}"
        if single_int_pk and is_pk:
            part += " AUTO_INCREMENT"
        if notnull or is_pk:
            part += " NOT NULL"
        part += default_sql(default)
        defs.append(part)
    if pk_cols:
        defs.append("PRIMARY KEY (" + ",".join(q(c) for c in pk_cols) + ")")

    sql = (
        f"CREATE TABLE IF NOT EXISTS {q(table)} (" + ",".join(defs) + ") "
        "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    )
    dst.execute(sql)

    for idx_name, idx_cols in unique_defs:
        if set(idx_cols) == set(pk_cols):
            continue
        try:
            dst.execute(
                f"CREATE UNIQUE INDEX {q(idx_name)} ON {q(table)} (" + ",".join(q(c) for c in idx_cols) + ")"
            )
        except pymysql.MySQLError as exc:
            if exc.args and exc.args[0] not in (1061, 1062):
                print(f"[WARN] índice {idx_name}: {exc}")


def copy_rows(src, dst, table):
    columns = [r[1] for r in src.execute(f"PRAGMA table_info({q(table)})").fetchall()]
    if not columns:
        return 0
    rows = src.execute(f"SELECT * FROM {q(table)}").fetchall()
    if not rows:
        return 0
    placeholders = ",".join(["%s"] * len(columns))
    sql = f"INSERT INTO {q(table)} (" + ",".join(q(c) for c in columns) + f") VALUES ({placeholders})"
    count = 0
    for row in rows:
        values = []
        for value in row:
            if isinstance(value, bool):
                value = int(value)
            values.append(value)
        try:
            dst.execute(sql, values)
            count += 1
        except pymysql.MySQLError as exc:
            print(f"[WARN] {table} fila omitida: {exc}")
    return count


def translate_view(sql: str) -> str:
    out = re.sub(r"CREATE\s+VIEW", "CREATE OR REPLACE VIEW", sql, count=1, flags=re.I)
    out = out.replace("||", " CONCAT ") if False else out
    out = re.sub(r"\bCAST\((.*?)\s+AS\s+TEXT\)", r"CAST(\1 AS CHAR)", out, flags=re.I | re.S)
    out = re.sub(r"\bdatetime\('now'\)", "NOW()", out, flags=re.I)
    out = re.sub(r"\bdate\('now'\)", "CURDATE()", out, flags=re.I)
    return out


def migrate(source: Path, drop_existing: bool):
    src = sqlite3.connect(source)
    src.row_factory = sqlite3.Row
    dst = mysql_conn()
    try:
        with dst.cursor() as cur:
            cur.execute("SET FOREIGN_KEY_CHECKS=0")
            tables = [r[0] for r in src.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            ).fetchall()]

            if drop_existing:
                cur.execute("SHOW FULL TABLES WHERE Table_type='BASE TABLE'")
                for row in cur.fetchall():
                    cur.execute(f"DROP TABLE IF EXISTS {q(row[0])}")

            for table in tables:
                try:
                    create_table(src, cur, table)
                    cur.execute(f"DELETE FROM {q(table)}")
                    copied = copy_rows(src, cur, table)
                    print(f"[OK] {table}: {copied} filas")
                except Exception as exc:
                    print(f"[ERROR] tabla {table}: {exc}")
                    raise

            views = src.execute(
                "SELECT name, sql FROM sqlite_master WHERE type='view' AND sql IS NOT NULL ORDER BY name"
            ).fetchall()
            for name, sql in views:
                try:
                    cur.execute(f"DROP VIEW IF EXISTS {q(name)}")
                    cur.execute(translate_view(sql))
                    print(f"[OK] vista {name}")
                except Exception as exc:
                    print(f"[WARN] vista {name} no migrada: {exc}")

            cur.execute("SET FOREIGN_KEY_CHECKS=1")
        dst.commit()
    except Exception:
        dst.rollback()
        raise
    finally:
        src.close()
        dst.close()


def main():
    parser = argparse.ArgumentParser(description="Bootstrap de HVDigital SQLite -> MariaDB")
    parser.add_argument("--source", help="hvdigital.db existente a importar")
    parser.add_argument("--drop-existing", action="store_true", help="recrear tablas MariaDB")
    args = parser.parse_args()

    generated = None
    if args.source:
        source = Path(args.source).resolve()
        if not source.exists():
            print(f"No existe {source}", file=sys.stderr)
            return 2
    else:
        generated = build_sqlite_schema()
        source = generated

    print(f"Origen SQLite: {source}")
    migrate(source, args.drop_existing)
    if generated:
        generated.unlink(missing_ok=True)
    print("Bootstrap MariaDB finalizado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
