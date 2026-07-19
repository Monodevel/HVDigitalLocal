import { obtenerBaseDatos } from './database'

export interface FotografiaCalificado {
  personaId: number
  dataUrl: string | null
  actualizadaEn: string | null
}

interface FilaFotografia {
  persona_id: number
  foto_data_url: string | null
  foto_actualizada_en: string | null
}

export async function obtenerFotografiaPorExpediente(expedienteId: number): Promise<FotografiaCalificado | null> {
  const db = await obtenerBaseDatos()
  const filas = await db.select<FilaFotografia[]>(
    'SELECT p.id AS persona_id, p.foto_data_url, p.foto_actualizada_en FROM expedientes_calificacion e INNER JOIN personas p ON p.id = e.persona_id WHERE e.id = $1 LIMIT 1',
    [expedienteId],
  )

  const fila = filas[0]
  if (!fila) return null

  return {
    personaId: fila.persona_id,
    dataUrl: fila.foto_data_url,
    actualizadaEn: fila.foto_actualizada_en,
  }
}

export async function guardarFotografiaCalificado(personaId: number, dataUrl: string): Promise<void> {
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(dataUrl)) {
    throw new Error('La imagen procesada no tiene un formato válido.')
  }
  if (dataUrl.length > 1500000) {
    throw new Error('La fotografía es demasiado grande después de optimizarla.')
  }

  const db = await obtenerBaseDatos()
  await db.execute(
    'UPDATE personas SET foto_data_url = $1, foto_actualizada_en = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
    [dataUrl, personaId],
  )
}

export async function eliminarFotografiaCalificado(personaId: number): Promise<void> {
  const db = await obtenerBaseDatos()
  await db.execute(
    'UPDATE personas SET foto_data_url = NULL, foto_actualizada_en = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1',
    [personaId],
  )
}
