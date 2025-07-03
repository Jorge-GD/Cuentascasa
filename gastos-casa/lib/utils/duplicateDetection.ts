import type { MovimientoRaw } from '@/lib/types/parser'
import type { Movimiento } from '@/lib/types/database'

export interface DuplicateDetectionResult {
  isDuplicate: boolean
  confidence: number
  matchedMovimiento?: Movimiento
  reason: string
}

export class DuplicateDetector {
  private existingMovimientos: Movimiento[]

  constructor(existingMovimientos: Movimiento[]) {
    this.existingMovimientos = existingMovimientos
  }

  /**
   * Detecta si un movimiento es potencialmente duplicado
   */
  detectDuplicate(newMovimiento: MovimientoRaw): DuplicateDetectionResult {
    // Buscar coincidencias exactas
    const exactMatch = this.findExactMatch(newMovimiento)
    if (exactMatch) {
      return {
        isDuplicate: true,
        confidence: 100,
        matchedMovimiento: exactMatch,
        reason: 'Coincidencia exacta: fecha, importe y descripción'
      }
    }

    // Buscar coincidencias por fecha e importe
    const dateAmountMatches = this.findDateAmountMatches(newMovimiento)
    if (dateAmountMatches.length > 0) {
      const bestMatch = dateAmountMatches[0]
      const descriptionSimilarity = this.calculateDescriptionSimilarity(
        newMovimiento.descripcion,
        bestMatch.descripcion
      )

      if (descriptionSimilarity > 0.8) {
        return {
          isDuplicate: true,
          confidence: 95,
          matchedMovimiento: bestMatch,
          reason: 'Coincidencia de fecha, importe y descripción similar'
        }
      } else if (descriptionSimilarity > 0.5) {
        return {
          isDuplicate: true,
          confidence: 70,
          matchedMovimiento: bestMatch,
          reason: 'Coincidencia de fecha e importe, descripción parcialmente similar'
        }
      }
    }

    // Buscar coincidencias similares en fechas cercanas
    const nearbyMatches = this.findNearbyMatches(newMovimiento)
    if (nearbyMatches.length > 0) {
      const bestMatch = nearbyMatches[0]
      return {
        isDuplicate: true,
        confidence: 60,
        matchedMovimiento: bestMatch,
        reason: 'Movimiento similar en fecha cercana'
      }
    }

    return {
      isDuplicate: false,
      confidence: 0,
      reason: 'No se encontraron duplicados'
    }
  }

  /**
   * Detecta duplicados en lote
   */
  detectBatchDuplicates(newMovimientos: MovimientoRaw[]): Map<number, DuplicateDetectionResult> {
    const results = new Map<number, DuplicateDetectionResult>()

    // Primero detectar duplicados contra movimientos existentes
    newMovimientos.forEach((movimiento, index) => {
      const result = this.detectDuplicate(movimiento)
      if (result.isDuplicate) {
        results.set(index, result)
      }
    })

    // Luego detectar duplicados internos en el lote
    for (let i = 0; i < newMovimientos.length; i++) {
      if (results.has(i)) continue // Ya es duplicado

      for (let j = i + 1; j < newMovimientos.length; j++) {
        if (results.has(j)) continue // Ya es duplicado

        if (this.areMovimientosIdentical(newMovimientos[i], newMovimientos[j])) {
          results.set(j, {
            isDuplicate: true,
            confidence: 100,
            reason: 'Duplicado interno en el lote importado'
          })
        }
      }
    }

    return results
  }

  private findExactMatch(movimiento: MovimientoRaw): Movimiento | null {
    return this.existingMovimientos.find(existing => 
      this.isSameDate(new Date(movimiento.fecha), existing.fecha) &&
      existing.importe === movimiento.importe &&
      existing.descripcion === movimiento.descripcion
    ) || null
  }

  private findDateAmountMatches(movimiento: MovimientoRaw): Movimiento[] {
    return this.existingMovimientos.filter(existing =>
      this.isSameDate(new Date(movimiento.fecha), existing.fecha) &&
      existing.importe === movimiento.importe
    )
  }

  private findNearbyMatches(movimiento: MovimientoRaw): Movimiento[] {
    const movimientoDate = new Date(movimiento.fecha)
    
    return this.existingMovimientos.filter(existing => {
      const daysDiff = Math.abs(
        (movimientoDate.getTime() - existing.fecha.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      return daysDiff <= 3 && // Dentro de 3 días
        Math.abs(existing.importe - movimiento.importe) < 0.01 && // Mismo importe
        this.calculateDescriptionSimilarity(movimiento.descripcion, existing.descripcion) > 0.7
    })
  }

  private areMovimientosIdentical(mov1: MovimientoRaw, mov2: MovimientoRaw): boolean {
    return this.isSameDate(new Date(mov1.fecha), new Date(mov2.fecha)) &&
      mov1.importe === mov2.importe &&
      mov1.descripcion === mov2.descripcion
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
  }

  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    // Normalizar textos
    const normalize = (text: string) => 
      text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    const norm1 = normalize(desc1)
    const norm2 = normalize(desc2)

    if (norm1 === norm2) return 1

    // Calcular similitud usando Jaccard
    const words1 = new Set(norm1.split(' '))
    const words2 = new Set(norm2.split(' '))

    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Filtra movimientos removiendo duplicados
   */
  static filterDuplicates(
    movimientos: MovimientoRaw[], 
    existingMovimientos: Movimiento[]
  ): { clean: MovimientoRaw[], duplicates: MovimientoRaw[] } {
    const detector = new DuplicateDetector(existingMovimientos)
    const duplicateResults = detector.detectBatchDuplicates(movimientos)

    const clean: MovimientoRaw[] = []
    const duplicates: MovimientoRaw[] = []

    movimientos.forEach((movimiento, index) => {
      if (duplicateResults.has(index)) {
        duplicates.push(movimiento)
      } else {
        clean.push(movimiento)
      }
    })

    return { clean, duplicates }
  }
}