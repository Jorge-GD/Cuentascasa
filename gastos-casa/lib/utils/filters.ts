import type { Movimiento } from '@/lib/types/database'

export interface MovimientoFilters {
  fechaInicio?: string
  fechaFin?: string
  categorias?: string[]
  tipoMovimiento?: 'todos' | 'ingresos' | 'gastos'
  importeMin?: number
  importeMax?: number
  descripcion?: string
  esManual?: boolean | null
}

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export class MovimientoFilterManager {
  private movimientos: Movimiento[]

  constructor(movimientos: Movimiento[]) {
    this.movimientos = movimientos
  }

  /**
   * Aplica filtros a la lista de movimientos
   */
  applyFilters(filters: MovimientoFilters): Movimiento[] {
    let filtered = [...this.movimientos]

    // Filtro por fecha de inicio
    if (filters.fechaInicio) {
      const fechaInicio = new Date(filters.fechaInicio)
      filtered = filtered.filter(movimiento => 
        new Date(movimiento.fecha) >= fechaInicio
      )
    }

    // Filtro por fecha de fin
    if (filters.fechaFin) {
      const fechaFin = new Date(filters.fechaFin)
      fechaFin.setHours(23, 59, 59, 999) // Incluir todo el día
      filtered = filtered.filter(movimiento => 
        new Date(movimiento.fecha) <= fechaFin
      )
    }

    // Filtro por categorías
    if (filters.categorias && filters.categorias.length > 0) {
      filtered = filtered.filter(movimiento =>
        filters.categorias!.includes(movimiento.categoria)
      )
    }

    // Filtro por tipo de movimiento
    if (filters.tipoMovimiento && filters.tipoMovimiento !== 'todos') {
      if (filters.tipoMovimiento === 'ingresos') {
        filtered = filtered.filter(movimiento => movimiento.importe > 0)
      } else if (filters.tipoMovimiento === 'gastos') {
        filtered = filtered.filter(movimiento => movimiento.importe < 0)
      }
    }

    // Filtro por importe mínimo
    if (filters.importeMin !== undefined) {
      filtered = filtered.filter(movimiento => 
        Math.abs(movimiento.importe) >= filters.importeMin!
      )
    }

    // Filtro por importe máximo
    if (filters.importeMax !== undefined) {
      filtered = filtered.filter(movimiento => 
        Math.abs(movimiento.importe) <= filters.importeMax!
      )
    }

    // Filtro por descripción
    if (filters.descripcion && filters.descripcion.trim()) {
      const searchTerm = filters.descripcion.toLowerCase().trim()
      filtered = filtered.filter(movimiento =>
        movimiento.descripcion.toLowerCase().includes(searchTerm)
      )
    }

    // Filtro por origen (manual vs importado)
    if (filters.esManual !== null && filters.esManual !== undefined) {
      filtered = filtered.filter(movimiento => 
        movimiento.esManual === filters.esManual
      )
    }

    return filtered
  }

  /**
   * Obtiene las opciones disponibles para cada filtro
   */
  getFilterOptions(): {
    categorias: FilterOption[]
    subcategorias: FilterOption[]
    rangos: {
      fechaMin: string
      fechaMax: string
      importeMin: number
      importeMax: number
    }
  } {
    // Obtener categorías únicas con conteo
    const categoriaMap = new Map<string, number>()
    const subcategoriaMap = new Map<string, number>()
    
    this.movimientos.forEach(movimiento => {
      // Contar categorías
      const categoria = movimiento.categoria
      categoriaMap.set(categoria, (categoriaMap.get(categoria) || 0) + 1)
      
      // Contar subcategorías
      if (movimiento.subcategoria) {
        const subcategoria = `${categoria} > ${movimiento.subcategoria}`
        subcategoriaMap.set(subcategoria, (subcategoriaMap.get(subcategoria) || 0) + 1)
      }
    })

    // Convertir a arrays ordenados
    const categorias: FilterOption[] = Array.from(categoriaMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label))

    const subcategorias: FilterOption[] = Array.from(subcategoriaMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label))

    // Calcular rangos
    const fechas = this.movimientos.map(m => new Date(m.fecha))
    const importes = this.movimientos.map(m => Math.abs(m.importe))

    const rangos = {
      fechaMin: fechas.length > 0 ? 
        new Date(Math.min(...fechas.map(f => f.getTime()))).toISOString().split('T')[0] : '',
      fechaMax: fechas.length > 0 ? 
        new Date(Math.max(...fechas.map(f => f.getTime()))).toISOString().split('T')[0] : '',
      importeMin: importes.length > 0 ? Math.min(...importes) : 0,
      importeMax: importes.length > 0 ? Math.max(...importes) : 0
    }

    return {
      categorias,
      subcategorias,
      rangos
    }
  }

  /**
   * Obtiene estadísticas de los movimientos filtrados
   */
  getStatistics(movimientos: Movimiento[] = this.movimientos) {
    const ingresos = movimientos.filter(m => m.importe > 0)
    const gastos = movimientos.filter(m => m.importe < 0)
    
    const totalIngresos = ingresos.reduce((sum, m) => sum + m.importe, 0)
    const totalGastos = Math.abs(gastos.reduce((sum, m) => sum + m.importe, 0))
    const balance = totalIngresos - totalGastos

    // Agrupar por categoría
    const porCategoria = new Map<string, { ingresos: number; gastos: number; count: number }>()
    
    movimientos.forEach(movimiento => {
      const categoria = movimiento.categoria
      const existing = porCategoria.get(categoria) || { ingresos: 0, gastos: 0, count: 0 }
      
      if (movimiento.importe > 0) {
        existing.ingresos += movimiento.importe
      } else {
        existing.gastos += Math.abs(movimiento.importe)
      }
      existing.count += 1
      
      porCategoria.set(categoria, existing)
    })

    // Agrupar por mes
    const porMes = new Map<string, { ingresos: number; gastos: number; count: number }>()
    
    movimientos.forEach(movimiento => {
      const fecha = new Date(movimiento.fecha)
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      const existing = porMes.get(mesKey) || { ingresos: 0, gastos: 0, count: 0 }
      
      if (movimiento.importe > 0) {
        existing.ingresos += movimiento.importe
      } else {
        existing.gastos += Math.abs(movimiento.importe)
      }
      existing.count += 1
      
      porMes.set(mesKey, existing)
    })

    return {
      total: movimientos.length,
      totalIngresos,
      totalGastos,
      balance,
      promedioImporte: movimientos.length > 0 ? 
        movimientos.reduce((sum, m) => sum + Math.abs(m.importe), 0) / movimientos.length : 0,
      porCategoria: Object.fromEntries(porCategoria),
      porMes: Object.fromEntries(
        Array.from(porMes.entries()).sort(([a], [b]) => a.localeCompare(b))
      )
    }
  }

  /**
   * Exporta los movimientos filtrados a diferentes formatos
   */
  exportToCSV(movimientos: Movimiento[]): string {
    const headers = [
      'Fecha',
      'Descripción',
      'Importe',
      'Saldo',
      'Categoría',
      'Subcategoría',
      'Categoría ING',
      'Subcategoría ING',
      'Es Manual',
      'Fecha Importación'
    ]

    const rows = movimientos.map(movimiento => [
      new Date(movimiento.fecha).toLocaleDateString('es-ES'),
      `"${movimiento.descripcion.replace(/"/g, '""')}"`,
      movimiento.importe.toString().replace('.', ','),
      (movimiento.saldo || 0).toString().replace('.', ','),
      `"${movimiento.categoria}"`,
      `"${movimiento.subcategoria || ''}"`,
      `"${movimiento.categoriaING || ''}"`,
      `"${movimiento.subcategoriaING || ''}"`,
      movimiento.esManual ? 'Sí' : 'No',
      new Date(movimiento.fechaImportacion).toLocaleDateString('es-ES')
    ])

    return [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n')
  }

  /**
   * Valida que los filtros tengan valores válidos
   */
  validateFilters(filters: MovimientoFilters): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validar fechas
    if (filters.fechaInicio && filters.fechaFin) {
      const inicio = new Date(filters.fechaInicio)
      const fin = new Date(filters.fechaFin)
      
      if (inicio > fin) {
        errors.push('La fecha de inicio no puede ser posterior a la fecha de fin')
      }
    }

    // Validar importes
    if (filters.importeMin !== undefined && filters.importeMax !== undefined) {
      if (filters.importeMin > filters.importeMax) {
        errors.push('El importe mínimo no puede ser mayor que el importe máximo')
      }
    }

    if (filters.importeMin !== undefined && filters.importeMin < 0) {
      errors.push('El importe mínimo no puede ser negativo')
    }

    if (filters.importeMax !== undefined && filters.importeMax < 0) {
      errors.push('El importe máximo no puede ser negativo')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Función de conveniencia para aplicar filtros rápidamente
 */
export function filterMovimientos(
  movimientos: Movimiento[], 
  filters: MovimientoFilters
): Movimiento[] {
  const manager = new MovimientoFilterManager(movimientos)
  return manager.applyFilters(filters)
}

/**
 * Función para obtener filtros predefinidos comunes
 */
export function getPresetFilters(): Record<string, MovimientoFilters> {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
  const hace30dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
  const hace90dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000)

  return {
    'este-mes': {
      fechaInicio: inicioMes.toISOString().split('T')[0],
      fechaFin: finMes.toISOString().split('T')[0]
    },
    'ultimos-30-dias': {
      fechaInicio: hace30dias.toISOString().split('T')[0],
      fechaFin: ahora.toISOString().split('T')[0]
    },
    'ultimos-90-dias': {
      fechaInicio: hace90dias.toISOString().split('T')[0],
      fechaFin: ahora.toISOString().split('T')[0]
    },
    'solo-ingresos': {
      tipoMovimiento: 'ingresos'
    },
    'solo-gastos': {
      tipoMovimiento: 'gastos'
    },
    'movimientos-manuales': {
      esManual: true
    },
    'movimientos-importados': {
      esManual: false
    }
  }
}