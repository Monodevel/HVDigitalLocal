from pathlib import Path
import re

root = Path("src")

def read(path: str) -> str:
    return (root / path).read_text(encoding="utf-8")

def write(path: str, text: str) -> None:
    (root / path).write_text(text, encoding="utf-8")

# 1) Corregir types/hojaVida.ts
path = "types/hojaVida.ts"
text = read(path)

# Eliminar duplicados consecutivos de puntaje_centecimas
text = re.sub(
    r"(  puntaje_centecimas: number \| null\n){2,}",
    "  puntaje_centecimas: number | null\n",
    text,
)

# Asegurar nombre_completo y persona_nombre_completo en HojaVidaAbierta
match = re.search(
    r"export interface HojaVidaAbierta \{(?P<body>.*?)\n\}",
    text,
    flags=re.S,
)

if match:
    body = match.group("body")

    if "persona_nombre_completo:" not in body:
        body = body.replace(
            "  periodo_nombre: string\n",
            "  periodo_nombre: string\n\n  persona_nombre_completo: string\n",
        )

    if "nombre_completo:" not in body:
        body = body.replace(
            "  persona_nombre_completo: string\n",
            "  persona_nombre_completo: string\n  nombre_completo: string\n",
        )

    new_block = "export interface HojaVidaAbierta {" + body + "\n}"
    text = text[:match.start()] + new_block + text[match.end():]

write(path, text)

# 2) Corregir retorno de listarHojasVidaAbiertasPorPersona en services/hojaVida.ts
path = "services/hojaVida.ts"
text = read(path)

# Agregar nombre_completo en el objeto retornado, junto a persona_nombre_completo
text = text.replace(
"""      persona_nombre_completo:
        nombreCompleto,

      etiqueta:""",
"""      persona_nombre_completo:
        nombreCompleto,

      nombre_completo:
        nombreCompleto,

      etiqueta:""",
)

write(path, text)

# 3) Asegurar tipo_efecto_codigo en types/anotaciones.ts
path = "types/anotaciones.ts"
if (root / path).exists():
    text = read(path)

    match = re.search(
        r"export interface PlantillaAnotacion \{(?P<body>.*?)\n\}",
        text,
        flags=re.S,
    )

    if match:
        body = match.group("body")

        if "tipo_efecto_codigo:" not in body:
            body = body.replace(
                "  requiere_puntaje: number\n",
                "  requiere_puntaje: number\n  tipo_efecto_codigo: 'NEUTRA' | 'MERITO' | 'DEMERITO' | null\n",
            )

        new_block = "export interface PlantillaAnotacion {" + body + "\n}"
        text = text[:match.start()] + new_block + text[match.end():]

    write(path, text)

# 4) Corregir tipado excesivo en CatalogoAnotacionesView.vue
path = "views/Anotaciones/CatalogoAnotacionesView.vue"
if (root / path).exists():
    text = read(path)

    # La lista de categorías no es PlantillaAnotacion.
    text = text.replace(
        "(item: PlantillaAnotacion) =>\n        item.id ===",
        "item =>\n        item.id ===",
    )

    text = text.replace(
        "(item: PlantillaAnotacion) => item.id ===",
        "item => item.id ===",
    )

    write(path, text)

print("Parche 2 aplicado correctamente.")