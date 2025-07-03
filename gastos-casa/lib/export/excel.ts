import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { BackupData } from '@/lib/backup/exporter'

export interface ExcelExportOptions {
  includeCharts?: boolean
  formatDates?: boolean
  includeFormulas?: boolean
  sheetNames?: {
    movimientos?: string
    cuentas?: string
    categorias?: string
    reglas?: string
    resumen?: string
  }
}

export class ExcelExporter {
  /**
   * Exporta datos a formato Excel
   */
  static async exportToExcel(data: BackupData, options: ExcelExportOptions = {}): Promise<Buffer> {
    try {
      const workbook = XLSX.utils.book_new()

      // Configurar nombres de hojas
      const sheetNames = {
        movimientos: options.sheetNames?.movimientos || 'Movimientos',
        cuentas: options.sheetNames?.cuentas || 'Cuentas',
        categorias: options.sheetNames?.categorias || 'Categorías',
        reglas: options.sheetNames?.reglas || 'Reglas',
        resumen: options.sheetNames?.resumen || 'Resumen'
      }

      // Crear hoja de resumen
      this.createResumenSheet(workbook, data, sheetNames.resumen)

      // Crear hoja de movimientos
      if (data.movimientos?.length > 0) {
        this.createMovimientosSheet(workbook, data.movimientos, sheetNames.movimientos, options)
      }

      // Crear hoja de cuentas
      if (data.cuentas?.length > 0) {
        this.createCuentasSheet(workbook, data.cuentas, sheetNames.cuentas, options)
      }

      // Crear hoja de categorías
      if (data.categorias?.length > 0) {
        this.createCategoriasSheet(workbook, data.categorias, data.subcategorias || [], sheetNames.categorias, options)
      }

      // Crear hoja de reglas
      if (data.reglas?.length > 0) {
        this.createReglasSheet(workbook, data.reglas, sheetNames.reglas, options)
      }

      // Convertir a buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      return buffer

    } catch (error) {
      throw new Error(`Error al exportar a Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Crea la hoja de resumen
   */
  private static createResumenSheet(workbook: XLSX.WorkBook, data: BackupData, sheetName: string) {
    const resumenData = [
      ['RESUMEN DEL BACKUP'],
      [''],
      ['Fecha de exportación:', data.metadata.exportDate],
      ['Versión:', data.version],
      ['Total de registros:', data.metadata.totalRecords],
      [''],
      ['DESGLOSE POR TIPO:'],
      ['Cuentas:', data.cuentas?.length || 0],
      ['Movimientos:', data.movimientos?.length || 0],
      ['Categorías:', data.categorias?.length || 0],
      ['Subcategorías:', data.subcategorias?.length || 0],
      ['Reglas:', data.reglas?.length || 0],
      ['Etiquetas:', data.etiquetas?.length || 0],
      [''],
      ['ESTADÍSTICAS DE MOVIMIENTOS:']
    ]

    if (data.movimientos?.length > 0) {
      const totalGastos = data.movimientos
        .filter(m => m.importe < 0)
        .reduce((sum, m) => sum + Math.abs(m.importe), 0)
      
      const totalIngresos = data.movimientos
        .filter(m => m.importe > 0)
        .reduce((sum, m) => sum + m.importe, 0)

      const fechas = data.movimientos.map(m => new Date(m.fecha)).sort((a, b) => a.getTime() - b.getTime())
      const fechaInicio = fechas[0]
      const fechaFin = fechas[fechas.length - 1]

      resumenData.push(
        ['Total gastos:', `€${totalGastos.toFixed(2)}`],
        ['Total ingresos:', `€${totalIngresos.toFixed(2)}`],
        ['Balance:', `€${(totalIngresos - totalGastos).toFixed(2)}`],
        ['Período:', `${format(fechaInicio, 'dd/MM/yyyy')} - ${format(fechaFin, 'dd/MM/yyyy')}`],
        ['Días:', Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24))]
      )
    }

    const worksheet = XLSX.utils.aoa_to_sheet(resumenData)
    
    // Aplicar estilos básicos
    if (!worksheet['!cols']) worksheet['!cols'] = []
    worksheet['!cols'][0] = { width: 20 }
    worksheet['!cols'][1] = { width: 15 }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  /**
   * Crea la hoja de movimientos
   */
  private static createMovimientosSheet(workbook: XLSX.WorkBook, movimientos: any[], sheetName: string, options: ExcelExportOptions) {
    const headers = [
      'Fecha',
      'Descripción',
      'Importe',
      'Saldo',
      'Categoría',
      'Subcategoría',
      'Categoría ING',
      'Subcategoría ING',
      'Cuenta',
      'Es Manual',
      'Fecha Importación'
    ]

    const rows = movimientos.map(mov => [
      options.formatDates ? format(new Date(mov.fecha), 'dd/MM/yyyy', { locale: es }) : new Date(mov.fecha),
      mov.descripcion,
      mov.importe,
      mov.saldo || '',
      mov.categoria,
      mov.subcategoria || '',
      mov.categoriaING || '',
      mov.subcategoriaING || '',
      mov.cuentaId,
      mov.esManual ? 'Sí' : 'No',
      options.formatDates ? format(new Date(mov.fechaImportacion), 'dd/MM/yyyy HH:mm', { locale: es }) : new Date(mov.fechaImportacion)
    ])

    const worksheetData = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Configurar anchos de columna
    if (!worksheet['!cols']) worksheet['!cols'] = []
    worksheet['!cols'][0] = { width: 12 } // Fecha
    worksheet['!cols'][1] = { width: 40 } // Descripción
    worksheet['!cols'][2] = { width: 12 } // Importe
    worksheet['!cols'][3] = { width: 12 } // Saldo
    worksheet['!cols'][4] = { width: 15 } // Categoría
    worksheet['!cols'][5] = { width: 15 } // Subcategoría
    worksheet['!cols'][6] = { width: 15 } // Categoría ING
    worksheet['!cols'][7] = { width: 15 } // Subcategoría ING
    worksheet['!cols'][8] = { width: 15 } // Cuenta
    worksheet['!cols'][9] = { width: 10 } // Es Manual
    worksheet['!cols'][10] = { width: 18 } // Fecha Importación

    // Configurar formato de números para importes
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (let row = 1; row <= range.e.r; row++) {
      const cellImporte = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
      const cellSaldo = worksheet[XLSX.utils.encode_cell({ r: row, c: 3 })]
      
      if (cellImporte && typeof cellImporte.v === 'number') {
        cellImporte.z = '€#,##0.00_);[Red](€#,##0.00)'
      }
      if (cellSaldo && typeof cellSaldo.v === 'number') {
        cellSaldo.z = '€#,##0.00_);[Red](€#,##0.00)'
      }
    }

    // Añadir filtros automáticos
    worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${movimientos.length + 1}` }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  /**
   * Crea la hoja de cuentas
   */
  private static createCuentasSheet(workbook: XLSX.WorkBook, cuentas: any[], sheetName: string, options: ExcelExportOptions) {
    const headers = ['ID', 'Nombre', 'Tipo', 'Color', 'Fecha Creación']

    const rows = cuentas.map(cuenta => [
      cuenta.id,
      cuenta.nombre,
      cuenta.tipo,
      cuenta.color,
      options.formatDates ? format(new Date(cuenta.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : new Date(cuenta.createdAt)
    ])

    const worksheetData = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Configurar anchos de columna
    if (!worksheet['!cols']) worksheet['!cols'] = []
    worksheet['!cols'][0] = { width: 25 } // ID
    worksheet['!cols'][1] = { width: 20 } // Nombre
    worksheet['!cols'][2] = { width: 15 } // Tipo
    worksheet['!cols'][3] = { width: 10 } // Color
    worksheet['!cols'][4] = { width: 18 } // Fecha Creación

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  /**
   * Crea la hoja de categorías
   */
  private static createCategoriasSheet(workbook: XLSX.WorkBook, categorias: any[], subcategorias: any[], sheetName: string, options: ExcelExportOptions) {
    const headers = ['Tipo', 'ID', 'Nombre', 'Color', 'Icono', 'Presupuesto', 'Categoría Padre']

    const categoriasRows = categorias.map(cat => [
      'Categoría',
      cat.id,
      cat.nombre,
      cat.color,
      cat.icono || '',
      cat.presupuesto || '',
      ''
    ])

    const subcategoriasRows = subcategorias.map(subcat => [
      'Subcategoría',
      subcat.id,
      subcat.nombre,
      '',
      '',
      '',
      subcat.categoria?.nombre || subcat.categoriaId
    ])

    const worksheetData = [headers, ...categoriasRows, ...subcategoriasRows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Configurar anchos de columna
    if (!worksheet['!cols']) worksheet['!cols'] = []
    worksheet['!cols'][0] = { width: 12 } // Tipo
    worksheet['!cols'][1] = { width: 25 } // ID
    worksheet['!cols'][2] = { width: 20 } // Nombre
    worksheet['!cols'][3] = { width: 10 } // Color
    worksheet['!cols'][4] = { width: 10 } // Icono
    worksheet['!cols'][5] = { width: 12 } // Presupuesto
    worksheet['!cols'][6] = { width: 20 } // Categoría Padre

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  /**
   * Crea la hoja de reglas
   */
  private static createReglasSheet(workbook: XLSX.WorkBook, reglas: any[], sheetName: string, options: ExcelExportOptions) {
    const headers = ['Nombre', 'Patrón', 'Tipo Coincidencia', 'Categoría', 'Subcategoría', 'Prioridad', 'Activa', 'Cuenta']

    const rows = reglas.map(regla => [
      regla.nombre,
      regla.patron,
      regla.tipoCoincidencia,
      regla.categoria,
      regla.subcategoria || '',
      regla.prioridad,
      regla.activa ? 'Sí' : 'No',
      regla.cuentaId || 'Global'
    ])

    const worksheetData = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Configurar anchos de columna
    if (!worksheet['!cols']) worksheet['!cols'] = []
    worksheet['!cols'][0] = { width: 20 } // Nombre
    worksheet['!cols'][1] = { width: 30 } // Patrón
    worksheet['!cols'][2] = { width: 15 } // Tipo Coincidencia
    worksheet['!cols'][3] = { width: 15 } // Categoría
    worksheet['!cols'][4] = { width: 15 } // Subcategoría
    worksheet['!cols'][5] = { width: 10 } // Prioridad
    worksheet['!cols'][6] = { width: 8 } // Activa
    worksheet['!cols'][7] = { width: 15 } // Cuenta

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  /**
   * Exporta solo movimientos a Excel con análisis
   */
  static async exportMovimientosAnalisis(movimientos: any[], cuentaNombre?: string): Promise<Buffer> {
    try {
      const workbook = XLSX.utils.book_new()

      // Hoja de movimientos
      this.createMovimientosSheet(workbook, movimientos, 'Movimientos', { formatDates: true })

      // Hoja de análisis por categorías
      this.createAnalisisCategorias(workbook, movimientos)

      // Hoja de análisis mensual
      this.createAnalisisMensual(workbook, movimientos)

      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    } catch (error) {
      throw new Error(`Error al exportar análisis: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Crea análisis por categorías
   */
  private static createAnalisisCategorias(workbook: XLSX.WorkBook, movimientos: any[]) {
    const gastos = movimientos.filter(m => m.importe < 0)
    const categoriaStats = new Map<string, { total: number; transacciones: number }>()

    gastos.forEach(mov => {
      const categoria = mov.categoria || 'Sin categoría'
      const current = categoriaStats.get(categoria) || { total: 0, transacciones: 0 }
      categoriaStats.set(categoria, {
        total: current.total + Math.abs(mov.importe),
        transacciones: current.transacciones + 1
      })
    })

    const totalGastos = Array.from(categoriaStats.values()).reduce((sum, cat) => sum + cat.total, 0)

    const headers = ['Categoría', 'Total Gastado', 'Porcentaje', 'Número de Transacciones', 'Promedio por Transacción']
    const rows = Array.from(categoriaStats.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([categoria, stats]) => [
        categoria,
        stats.total,
        `${((stats.total / totalGastos) * 100).toFixed(1)}%`,
        stats.transacciones,
        stats.total / stats.transacciones
      ])

    const worksheetData = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Configurar formato
    if (!worksheet['!cols']) worksheet['!cols'] = []
    worksheet['!cols'][0] = { width: 20 }
    worksheet['!cols'][1] = { width: 15 }
    worksheet['!cols'][2] = { width: 12 }
    worksheet['!cols'][3] = { width: 20 }
    worksheet['!cols'][4] = { width: 20 }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Análisis Categorías')
  }

  /**
   * Crea análisis mensual
   */
  private static createAnalisisMensual(workbook: XLSX.WorkBook, movimientos: any[]) {
    const monthlyStats = new Map<string, { gastos: number; ingresos: number; transacciones: number }>()

    movimientos.forEach(mov => {
      const monthKey = format(new Date(mov.fecha), 'yyyy-MM')
      const current = monthlyStats.get(monthKey) || { gastos: 0, ingresos: 0, transacciones: 0 }
      
      if (mov.importe < 0) {
        current.gastos += Math.abs(mov.importe)
      } else {
        current.ingresos += mov.importe
      }
      current.transacciones += 1
      
      monthlyStats.set(monthKey, current)
    })

    const headers = ['Mes', 'Total Gastos', 'Total Ingresos', 'Balance', 'Transacciones']
    const rows = Array.from(monthlyStats.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, stats]) => [
        format(new Date(month + '-01'), 'MMMM yyyy', { locale: es }),
        stats.gastos,
        stats.ingresos,
        stats.ingresos - stats.gastos,
        stats.transacciones
      ])

    const worksheetData = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Análisis Mensual')
  }

  /**
   * Genera nombre de archivo para exportación Excel
   */
  static generateExcelFilename(tipo: string = 'backup', fecha?: Date): string {
    const timestamp = format(fecha || new Date(), 'yyyy-MM-dd_HH-mm-ss')
    return `gastos-casa-${tipo}-${timestamp}.xlsx`
  }
}