import { format, differenceInDays, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export interface MovimientoSimple {
  fecha: Date
  importe: number
  categoria: string
}

export interface CategoryBreakdown {
  categoria: string
  total: number
  porcentaje: number
  transacciones: number
  promedio: number
  color?: string
}

export interface MonthlyProjection {
  gastoActual: number
  gastoProyectado: number
  diasTranscurridos: number
  diasRestantes: number
  gastoDiarioPromedio: number
  confianza: number
}

export interface SpendingPattern {
  categoria: string
  tendencia: 'creciente' | 'estable' | 'decreciente'
  variacion: number
  esRecurrente: boolean
  frecuencia?: 'diaria' | 'semanal' | 'mensual'
}

/**
 * Calcula el desglose de gastos por categoría
 */
export function calculateCategoryBreakdown(movimientos: MovimientoSimple[]): CategoryBreakdown[] {
  const gastos = movimientos.filter(m => m.importe < 0)
  const totalGastos = Math.abs(gastos.reduce((sum, m) => sum + m.importe, 0))

  const categoriaStats = gastos.reduce((acc, mov) => {
    const categoria = mov.categoria
    if (!acc[categoria]) {
      acc[categoria] = { total: 0, count: 0 }
    }
    acc[categoria].total += Math.abs(mov.importe)
    acc[categoria].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  return Object.entries(categoriaStats)
    .map(([categoria, stats]) => ({
      categoria,
      total: stats.total,
      porcentaje: totalGastos > 0 ? (stats.total / totalGastos) * 100 : 0,
      transacciones: stats.count,
      promedio: stats.count > 0 ? stats.total / stats.count : 0
    }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Calcula la proyección de gastos para fin de mes
 */
export function calculateMonthlyProjection(
  movimientos: MovimientoSimple[],
  fechaReferencia: Date = new Date()
): MonthlyProjection {
  const inicioMes = startOfMonth(fechaReferencia)
  const finMes = endOfMonth(fechaReferencia)
  
  const gastos = movimientos.filter(m => m.importe < 0 && m.fecha >= inicioMes)
  const gastoActual = Math.abs(gastos.reduce((sum, m) => sum + m.importe, 0))
  
  const diasTranscurridos = differenceInDays(fechaReferencia, inicioMes) + 1
  const diasTotales = differenceInDays(finMes, inicioMes) + 1
  const diasRestantes = diasTotales - diasTranscurridos
  
  const gastoDiarioPromedio = diasTranscurridos > 0 ? gastoActual / diasTranscurridos : 0
  const gastoProyectado = gastoDiarioPromedio * diasTotales
  
  // Calcular confianza basada en días transcurridos
  const confianza = Math.min(100, (diasTranscurridos / diasTotales) * 100)

  return {
    gastoActual,
    gastoProyectado,
    diasTranscurridos,
    diasRestantes,
    gastoDiarioPromedio,
    confianza
  }
}

/**
 * Detecta patrones de gasto en las categorías
 */
export function detectSpendingPatterns(
  movimientosActuales: MovimientoSimple[],
  movimientosAnteriores: MovimientoSimple[]
): SpendingPattern[] {
  const categoriasActuales = calculateCategoryBreakdown(movimientosActuales)
  const categoriasAnteriores = calculateCategoryBreakdown(movimientosAnteriores)

  return categoriasActuales.map(catActual => {
    const catAnterior = categoriasAnteriores.find(c => c.categoria === catActual.categoria)
    
    let tendencia: 'creciente' | 'estable' | 'decreciente' = 'estable'
    let variacion = 0

    if (catAnterior) {
      variacion = catAnterior.total > 0 
        ? ((catActual.total - catAnterior.total) / catAnterior.total) * 100
        : 0

      if (variacion > 10) tendencia = 'creciente'
      else if (variacion < -10) tendencia = 'decreciente'
    } else if (catActual.total > 0) {
      tendencia = 'creciente'
      variacion = 100
    }

    // Detectar si es recurrente (simplificado)
    const esRecurrente = catActual.transacciones >= 3 && catActual.promedio > 0

    return {
      categoria: catActual.categoria,
      tendencia,
      variacion,
      esRecurrente,
      frecuencia: esRecurrente 
        ? catActual.transacciones > 20 ? 'diaria' 
          : catActual.transacciones > 8 ? 'semanal' 
          : 'mensual'
        : undefined
    }
  })
}

/**
 * Calcula métricas de comparación entre períodos
 */
export function calculatePeriodComparison(
  movimientosActuales: MovimientoSimple[],
  movimientosAnteriores: MovimientoSimple[]
) {
  const gastosActuales = Math.abs(movimientosActuales
    .filter(m => m.importe < 0)
    .reduce((sum, m) => sum + m.importe, 0))
  
  const ingresosActuales = movimientosActuales
    .filter(m => m.importe > 0)
    .reduce((sum, m) => sum + m.importe, 0)

  const gastosAnteriores = Math.abs(movimientosAnteriores
    .filter(m => m.importe < 0)
    .reduce((sum, m) => sum + m.importe, 0))
  
  const ingresosAnteriores = movimientosAnteriores
    .filter(m => m.importe > 0)
    .reduce((sum, m) => sum + m.importe, 0)

  const variacionGastos = gastosAnteriores > 0 
    ? ((gastosActuales - gastosAnteriores) / gastosAnteriores) * 100 
    : 0

  const variacionIngresos = ingresosAnteriores > 0
    ? ((ingresosActuales - ingresosAnteriores) / ingresosAnteriores) * 100
    : 0

  return {
    gastosActuales,
    gastosAnteriores,
    ingresosActuales,
    ingresosAnteriores,
    variacionGastos,
    variacionIngresos,
    balanceActual: ingresosActuales - gastosActuales,
    balanceAnterior: ingresosAnteriores - gastosAnteriores
  }
}

/**
 * Formatea números como moneda
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

/**
 * Formatea porcentajes
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * Calcula el color basado en el tipo de variación
 */
export function getVariationColor(variation: number, isExpense: boolean = true): string {
  if (Math.abs(variation) < 5) return 'text-gray-600' // Estable
  
  if (isExpense) {
    return variation > 0 ? 'text-red-600' : 'text-green-600' // Más gastos = rojo, menos = verde
  } else {
    return variation > 0 ? 'text-green-600' : 'text-red-600' // Más ingresos = verde, menos = rojo
  }
}

/**
 * Genera colores para categorías
 */
export function generateCategoryColors(categories: string[]): Record<string, string> {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#f59e0b',
    '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16'
  ]

  const colorMap: Record<string, string> = {}
  categories.forEach((category, index) => {
    colorMap[category] = colors[index % colors.length]
  })

  return colorMap
}

/**
 * Calcula estadísticas agregadas para múltiples cuentas
 */
export function calculateAggregatedStats(
  cuentasData: Array<{
    nombre: string
    gastos: number
    ingresos: number
    transacciones: number
  }>
) {
  const totales = cuentasData.reduce(
    (acc, cuenta) => ({
      gastos: acc.gastos + cuenta.gastos,
      ingresos: acc.ingresos + cuenta.ingresos,
      transacciones: acc.transacciones + cuenta.transacciones
    }),
    { gastos: 0, ingresos: 0, transacciones: 0 }
  )

  const promedios = {
    gastos: cuentasData.length > 0 ? totales.gastos / cuentasData.length : 0,
    ingresos: cuentasData.length > 0 ? totales.ingresos / cuentasData.length : 0,
    transacciones: cuentasData.length > 0 ? totales.transacciones / cuentasData.length : 0
  }

  return { totales, promedios }
}