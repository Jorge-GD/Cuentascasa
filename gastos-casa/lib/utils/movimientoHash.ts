import crypto from 'crypto'

/**
 * Genera un hash único para un movimiento basado en sus propiedades clave
 * Esto ayuda a prevenir duplicados exactos en la base de datos
 */
export function generateMovimientoHash(
  fecha: Date | string,
  importe: number,
  descripcion: string,
  cuentaId: string
): string {
  // Normalizar fecha a formato YYYY-MM-DD
  const fechaNormalizada = typeof fecha === 'string' 
    ? fecha.split('T')[0] 
    : fecha.toISOString().split('T')[0]
  
  // Normalizar importe a 2 decimales
  const importeNormalizado = importe.toFixed(2)
  
  // Normalizar descripción: quitar espacios extra y convertir a minúsculas
  const descripcionNormalizada = descripcion
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Quitar números de referencia que pueden variar (ej: números de transacción)
    .replace(/\b\d{6,}\b/g, '')
    // Tomar solo las primeras 50 caracteres para evitar variaciones menores
    .substring(0, 50)
  
  // Crear string único
  const uniqueString = `${fechaNormalizada}|${importeNormalizado}|${descripcionNormalizada}|${cuentaId}`
  
  // Generar hash SHA-256
  return crypto
    .createHash('sha256')
    .update(uniqueString)
    .digest('hex')
    .substring(0, 16) // Usar solo los primeros 16 caracteres para ahorrar espacio
}

/**
 * Verifica si dos movimientos son probablemente el mismo
 * Útil para detectar duplicados con pequeñas variaciones
 */
export function areMovimientosSimilar(
  mov1: { fecha: Date | string; importe: number; descripcion: string },
  mov2: { fecha: Date | string; importe: number; descripcion: string }
): boolean {
  // Misma fecha
  const fecha1 = typeof mov1.fecha === 'string' ? mov1.fecha.split('T')[0] : mov1.fecha.toISOString().split('T')[0]
  const fecha2 = typeof mov2.fecha === 'string' ? mov2.fecha.split('T')[0] : mov2.fecha.toISOString().split('T')[0]
  
  if (fecha1 !== fecha2) return false
  
  // Mismo importe (con tolerancia de céntimos)
  if (Math.abs(mov1.importe - mov2.importe) > 0.01) return false
  
  // Descripción similar (primeras palabras)
  const palabras1 = mov1.descripcion.toLowerCase().split(/\s+/).slice(0, 3).join(' ')
  const palabras2 = mov2.descripcion.toLowerCase().split(/\s+/).slice(0, 3).join(' ')
  
  return palabras1 === palabras2
}