use tauri::{
    Emitter,
    menu::{MenuBuilder, SubmenuBuilder},
};
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "crear_tablas_iniciales",
            sql: r#"
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS configuracion (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    unidad_nombre TEXT NOT NULL,
                    unidad_sigla TEXT NOT NULL,
                    responsable TEXT NOT NULL,
                    periodo_activo_id INTEGER NULL,
                    configurado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS periodos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    anio INTEGER NOT NULL,
                    fecha_inicio TEXT NOT NULL,
                    fecha_termino TEXT NOT NULL,
                    estado TEXT NOT NULL DEFAULT 'abierto'
                        CHECK (estado IN ('abierto', 'cerrado')),
                    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE UNIQUE INDEX IF NOT EXISTS
                    ux_periodos_anio
                ON periodos(anio);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "crear_catalogos_normativos",
            sql: include_str!("../migrations/002_catalogos_normativos.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "crear_catalogo_grados_y_calidades",
            sql: include_str!("../migrations/003_grados_calidades.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "crear_factores_normativos",
            sql: include_str!("../migrations/004_factores_normativos.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "crear_catalogo_anotaciones",
            sql: include_str!("../migrations/005_catalogo_anotaciones.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "crear_motor_plantillas_anotacion",
            sql: include_str!("../migrations/006_motor_plantillas_anotacion.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "crear_puntajes_y_efectos_anotaciones",
            sql: include_str!("../migrations/007_puntajes_y_efectos_anotaciones.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "crear_personas_hojas_vida_y_anotaciones",
            sql: include_str!("../migrations/008_personas_hojas_vida_anotaciones.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "vincular_borrador_con_anotacion",
            sql: include_str!("../migrations/009_vincular_borrador_anotacion.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "crear_configuracion_inicial",
            sql: include_str!("../migrations/011_configuracion_inicial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "crear_designaciones_expedientes_instrumentos",
            sql: include_str!("../migrations/012_designaciones_expedientes.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "crear_panel_periodo",
            sql: include_str!("../migrations/013_panel_periodo.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "crear_vista_expediente_detalle",
            sql: include_str!("../migrations/014_expediente_detalle.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "crear_hoja_vida_operativa",
            sql: include_str!("../migrations/015_hoja_vida_operativa.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "crear_evint",
            sql: include_str!("../migrations/016_evint.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "crear_formato_oficial_evint",
            sql: include_str!("../migrations/018_formato_oficial_evint.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "corregir_escala_y_calculo_evint",
            sql: include_str!("../migrations/020_corregir_escala_calculo_evint.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "crear_hoja_vida_cronologica",
            sql: include_str!("../migrations/021_hoja_vida_cronologica.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "crear_resoluciones_anotaciones_libres",
            sql: include_str!("../migrations/022_resoluciones_anotaciones_libres.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "crear_resoluciones_documentales",
            sql: include_str!("../migrations/023_resoluciones_documentales.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "crear_resoluciones_documentales",
            sql: include_str!("../migrations/024_vinculo_resolucion_documental_anotacion.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 24,
            description: "hc2_calificaciones",
            sql: include_str!("../migrations/025_hc2_calificaciones.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 25,
            description: "hc1_ham_hapsem",
            sql: include_str!("../migrations/026_hc1_ham_hapsem.sql"),
            kind: MigrationKind::Up,
        },

    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:hvdigital.db", migrations)
                .build(),
        )
        .setup(|app| {
            let menu_aplicacion = SubmenuBuilder::new(app, "HVDigital")
                .text("menu_acerca", "Acerca de HVDigital")
                .separator()
                .text("menu_salir", "Salir de HVDigital")
                .build()?;
            let menu_archivo = SubmenuBuilder::new(app, "Archivo")
                .text("menu_panel", "Panel principal")
                .separator()
                .text("menu_agregar_calificado", "Agregar calificado")
                .separator()
                .text("menu_salir_archivo", "Salir")
                .build()?;

            let menu_expediente = SubmenuBuilder::new(app, "Expediente")
                .text("menu_expediente_actual", "Abrir expediente actual")
                .text("menu_hoja_vida", "Hoja de Vida")
                .separator()
                .text("menu_evint_1", "EVINT 1")
                .text("menu_evint_2", "EVINT 2")
                .separator()
                .text("menu_hc1", "HC1")
                .text("menu_hc2", "HC2")
                .text("menu_ham", "HAM")
                .text("menu_hapsem", "HAPSEM")
                .build()?;

            let menu_anotaciones = SubmenuBuilder::new(app, "Anotaciones")
                .text("menu_nueva_anotacion", "Nueva anotación")
                .text("menu_ver_hoja_vida", "Ver anotaciones")
                .build()?;
            let menu_resoluciones = SubmenuBuilder::new(app, "Resoluciones")
                .text("menu_resoluciones", "Ver resoluciones")
                .text("menu_nueva_resolucion", "Nueva resolución")
                .separator()
                .text("menu_resoluciones_borrador", "Borradores")
                .text("menu_resoluciones_emitidas", "Emitidas")
                .build()?;

            let menu_herramientas = SubmenuBuilder::new(app, "Herramientas")
                .text("menu_configuracion", "Configuración")
                .separator()
                .text("menu_catalogos", "Catálogos normativos")
                .separator()
                .text("menu_respaldo", "Crear respaldo")
                .text("menu_restaurar", "Restaurar respaldo")
                .build()?;

            let menu_ayuda = SubmenuBuilder::new(app, "Ayuda")
                .text("menu_manual", "Manual de usuario")
                .text("menu_licencia", "Acuerdo de licencia")
                .separator()
                .text("menu_acerca_ayuda", "Acerca de HVDigital")
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[
                    &menu_aplicacion,
                    &menu_archivo,
                    &menu_expediente,
                    &menu_anotaciones,
                    &menu_resoluciones,
                    &menu_herramientas,
                    &menu_ayuda,
                ])
                .build()?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                let menu_id = event.id().as_ref();

                match menu_id {
                    "menu_salir" | "menu_salir_archivo" => {
                        app_handle.exit(0);
                    }

                    /*
                     * El resto se envía a Vue.
                     */
                    _ => {
                        if let Err(error) = app_handle.emit("hvdigital-menu", menu_id.to_string()) {
                            eprintln!("No fue posible emitir el evento del menú: {error}");
                        }
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("No fue posible iniciar HVDigital.");
}
