import { createObjectCsvWriter } from 'csv-writer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { BackupData } from '@/lib/backup/exporter'

export interface CsvExportOptions {
  separator?: string // Separador CSV (por defecto: ',')
  encoding?: string // Codificación (por defecto: 'utf8')
  includeHeaders?: boolean // Incluir headers (por defecto: true)
  formatDates?: boolean // Formatear fechas (por defecto: true)
  locale?: string // Locale para fechas (por defecto: 'es')
}

export interface CsvFile {
  filename: string
  path: string
  content: Buffer
}

export class CsvExporter {
  /**
   * Exporta datos a formato CSV (múltiples archivos)
   */
  static async exportToCSV(data: BackupData, options: CsvExportOptions = {}): Promise<CsvFile[]> {
    const files: CsvFile[] = []
    const opts = {
      separator: options.separator || ',',
      encoding: options.encoding || 'utf8',
      includeHeaders: options.includeHeaders !== false,
      formatDates: options.formatDates !== false,
      locale: options.locale || 'es'
    }

    try {
      // Exportar movimientos
      if (data.movimientos?.length > 0) {
        const movimientosFile = await this.exportMovimientosCSV(data.movimientos, opts)
        files.push(movimientosFile)
      }

      // Exportar cuentas
      if (data.cuentas?.length > 0) {
        const cuentasFile = await this.exportCuentasCSV(data.cuentas, opts)
        files.push(cuentasFile)
      }

      // Exportar categorías
      if (data.categorias?.length > 0) {
        const categoriasFile = await this.exportCategoriasCSV(data.categorias, data.subcategorias || [], opts)
        files.push(categoriasFile)
      }

      // Exportar reglas
      if (data.reglas?.length > 0) {
        const reglasFile = await this.exportReglasCSV(data.reglas, opts)
        files.push(reglasFile)
      }

      // Exportar resumen
      const resumenFile = await this.exportResumenCSV(data, opts)
      files.push(resumenFile)

      return files

    } catch (error) {
      // Limpiar archivos temporales en caso de error
      for (const file of files) {
        try {
          await fs.unlink(file.path)
        } catch (cleanupError) {
          // Ignorar errores de limpieza
        }
      }
      throw new Error(`Error al exportar a CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Exporta movimientos a CSV
   */
  private static async exportMovimientosCSV(movimientos: any[], options: CsvExportOptions): Promise<CsvFile> {
    const filename = 'movimientos.csv'
    const filepath = join(tmpdir(), `gastos-casa-${Date.now()}-${filename}`)

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'fecha', title: 'Fecha' },
        { id: 'descripcion', title: 'Descripción' },
        { id: 'importe', title: 'Importe' },
        { id: 'saldo', title: 'Saldo' },
        { id: 'categoria', title: 'Categoría' },
        { id: 'subcategoria', title: 'Subcategoría' },
        { id: 'categoriaING', title: 'Categoría ING' },
        { id: 'subcategoriaING', title: 'Subcategoría ING' },
        { id: 'cuentaId', title: 'ID Cuenta' },
        { id: 'esManual', title: 'Es Manual' },
        { id: 'fechaImportacion', title: 'Fecha Importación' }
      ],
      encoding: options.encoding as BufferEncoding
    })

    const records = movimientos.map(mov => ({
      fecha: options.formatDates ? 
        format(new Date(mov.fecha), 'dd/MM/yyyy', { locale: es }) : 
        mov.fecha,
      descripcion: mov.descripcion,
      importe: mov.importe,
      saldo: mov.saldo || '',
      categoria: mov.categoria,
      subcategoria: mov.subcategoria || '',
      categoriaING: mov.categoriaING || '',
      subcategoriaING: mov.subcategoriaING || '',
      cuentaId: mov.cuentaId,
      esManual: mov.esManual ? 'Sí' : 'No',
      fechaImportacion: options.formatDates ? 
        format(new Date(mov.fechaImportacion), 'dd/MM/yyyy HH:mm', { locale: es }) : 
        mov.fechaImportacion
    }))

    await csvWriter.writeRecords(records)
    const content = await fs.readFile(filepath)

    return {
      filename,
      path: filepath,
      content
    }
  }

  /**
   * Exporta cuentas a CSV
   */
  private static async exportCuentasCSV(cuentas: any[], options: CsvExportOptions): Promise<CsvFile> {
    const filename = 'cuentas.csv'
    const filepath = join(tmpdir(), `gastos-casa-${Date.now()}-${filename}`)

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'nombre', title: 'Nombre' },
        { id: 'tipo', title: 'Tipo' },
        { id: 'color', title: 'Color' },
        { id: 'createdAt', title: 'Fecha Creación' }
      ],
      encoding: options.encoding as BufferEncoding
    })

    const records = cuentas.map(cuenta => ({
      id: cuenta.id,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      color: cuenta.color,
      createdAt: options.formatDates ? 
        format(new Date(cuenta.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 
        cuenta.createdAt
    }))

    await csvWriter.writeRecords(records)
    const content = await fs.readFile(filepath)

    return {
      filename,
      path: filepath,
      content
    }
  }

  /**
   * Exporta categorías y subcategorías a CSV
   */
  private static async exportCategoriasCSV(categorias: any[], subcategorias: any[], options: CsvExportOptions): Promise<CsvFile> {
    const filename = 'categorias.csv'
    const filepath = join(tmpdir(), `gastos-casa-${Date.now()}-${filename}`)

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'tipo', title: 'Tipo' },
        { id: 'id', title: 'ID' },
        { id: 'nombre', title: 'Nombre' },
        { id: 'color', title: 'Color' },
        { id: 'icono', title: 'Icono' },
        { id: 'presupuesto', title: 'Presupuesto' },
        { id: 'categoriaPadre', title: 'Categoría Padre' }
      ],
      encoding: options.encoding as BufferEncoding
    })

    const categoriasRecords = categorias.map(cat => ({
      tipo: 'Categoría',
      id: cat.id,
      nombre: cat.nombre,
      color: cat.color,
      icono: cat.icono || '',
      presupuesto: cat.presupuesto || '',
      categoriaPadre: ''
    }))

    const subcategoriasRecords = subcategorias.map(subcat => ({
      tipo: 'Subcategoría',
      id: subcat.id,
      nombre: subcat.nombre,
      color: '',
      icono: '',
      presupuesto: '',
      categoriaPadre: subcat.categoria?.nombre || subcat.categoriaId
    }))

    const allRecords = [...categoriasRecords, ...subcategoriasRecords]
    await csvWriter.writeRecords(allRecords)
    const content = await fs.readFile(filepath)

    return {
      filename,
      path: filepath,
      content
    }
  }

  /**
   * Exporta reglas a CSV
   */
  private static async exportReglasCSV(reglas: any[], options: CsvExportOptions): Promise<CsvFile> {
    const filename = 'reglas.csv'
    const filepath = join(tmpdir(), `gastos-casa-${Date.now()}-${filename}`)

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'nombre', title: 'Nombre' },
        { id: 'patron', title: 'Patrón' },
        { id: 'tipoCoincidencia', title: 'Tipo Coincidencia' },
        { id: 'categoria', title: 'Categoría' },
        { id: 'subcategoria', title: 'Subcategoría' },
        { id: 'prioridad', title: 'Prioridad' },
        { id: 'activa', title: 'Activa' },
        { id: 'cuentaId', title: 'ID Cuenta' }
      ],
      encoding: options.encoding as BufferEncoding
    })

    const records = reglas.map(regla => ({
      nombre: regla.nombre,
      patron: regla.patron,
      tipoCoincidencia: regla.tipoCoincidencia,
      categoria: regla.categoria,
      subcategoria: regla.subcategoria || '',
      prioridad: regla.prioridad,
      activa: regla.activa ? 'Sí' : 'No',
      cuentaId: regla.cuentaId || 'Global'
    }))

    await csvWriter.writeRecords(records)
    const content = await fs.readFile(filepath)

    return {
      filename,
      path: filepath,
      content
    }
  }

  /**
   * Exporta resumen a CSV
   */
  private static async exportResumenCSV(data: BackupData, options: CsvExportOptions): Promise<CsvFile> {
    const filename = 'resumen.csv'
    const filepath = join(tmpdir(), `gastos-casa-${Date.now()}-${filename}`)

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'concepto', title: 'Concepto' },
        { id: 'valor', title: 'Valor' }
      ],
      encoding: options.encoding as BufferEncoding
    })

    const records = [
      { concepto: 'Fecha de exportación', valor: data.metadata.exportDate },
      { concepto: 'Versión', valor: data.version },
      { concepto: 'Total de registros', valor: data.metadata.totalRecords.toString() },
      { concepto: '', valor: '' }, // Línea vacía
      { concepto: 'DESGLOSE POR TIPO', valor: '' },
      { concepto: 'Cuentas', valor: (data.cuentas?.length || 0).toString() },
      { concepto: 'Movimientos', valor: (data.movimientos?.length || 0).toString() },
      { concepto: 'Categorías', valor: (data.categorias?.length || 0).toString() },
      { concepto: 'Subcategorías', valor: (data.subcategorias?.length || 0).toString() },
      { concepto: 'Reglas', valor: (data.reglas?.length || 0).toString() },
      { concepto: 'Etiquetas', valor: (data.etiquetas?.length || 0).toString() }
    ]

    // Añadir estadísticas de movimientos si existen
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

      records.push(
        { concepto: '', valor: '' }, // Línea vacía
        { concepto: 'ESTADÍSTICAS DE MOVIMIENTOS', valor: '' },
        { concepto: 'Total gastos', valor: `€${totalGastos.toFixed(2)}` },
        { concepto: 'Total ingresos', valor: `€${totalIngresos.toFixed(2)}` },
        { concepto: 'Balance', valor: `€${(totalIngresos - totalGastos).toFixed(2)}` },
        { concepto: 'Período', valor: `${format(fechaInicio, 'dd/MM/yyyy')} - ${format(fechaFin, 'dd/MM/yyyy')}` },
        { concepto: 'Días', valor: Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)).toString() }
      )
    }

    await csvWriter.writeRecords(records)
    const content = await fs.readFile(filepath)

    return {
      filename,
      path: filepath,
      content
    }
  }

  /**
   * Exporta solo movimientos a CSV con análisis
   */
  static async exportMovimientosSimple(movimientos: any[], options: CsvExportOptions = {}): Promise<Buffer> {
    const filepath = join(tmpdir(), `gastos-casa-movimientos-${Date.now()}.csv`)

    try {
      const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
          { id: 'fecha', title: 'Fecha' },
          { id: 'descripcion', title: 'Descripción' },
          { id: 'importe', title: 'Importe' },
          { id: 'categoria', title: 'Categoría' },
          { id: 'subcategoria', title: 'Subcategoría' }
        ],
        encoding: options.encoding as BufferEncoding || 'utf8'
      })

      const records = movimientos.map(mov => ({
        fecha: options.formatDates !== false ? 
          format(new Date(mov.fecha), 'dd/MM/yyyy', { locale: es }) : 
          mov.fecha,
        descripcion: mov.descripcion,
        importe: mov.importe,
        categoria: mov.categoria,
        subcategoria: mov.subcategoria || ''
      }))

      await csvWriter.writeRecords(records)
      const content = await fs.readFile(filepath)
      
      // Limpiar archivo temporal
      await fs.unlink(filepath)
      
      return content

    } catch (error) {
      // Intentar limpiar archivo temporal
      try {
        await fs.unlink(filepath)
      } catch (cleanupError) {
        // Ignorar errores de limpieza
      }
      throw new Error(`Error al exportar movimientos a CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Exporta análisis de categorías a CSV
   */
  static async exportAnalisisCategorias(movimientos: any[], options: CsvExportOptions = {}): Promise<Buffer> {
    const filepath = join(tmpdir(), `gastos-casa-analisis-${Date.now()}.csv`)

    try {
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

      const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
          { id: 'categoria', title: 'Categoría' },
          { id: 'total', title: 'Total Gastado' },
          { id: 'porcentaje', title: 'Porcentaje' },
          { id: 'transacciones', title: 'Transacciones' },
          { id: 'promedio', title: 'Promedio por Transacción' }
        ],
        encoding: options.encoding as BufferEncoding || 'utf8'
      })

      const records = Array.from(categoriaStats.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([categoria, stats]) => ({
          categoria,
          total: stats.total.toFixed(2),
          porcentaje: `${((stats.total / totalGastos) * 100).toFixed(1)}%`,
          transacciones: stats.transacciones,
          promedio: (stats.total / stats.transacciones).toFixed(2)
        }))

      await csvWriter.writeRecords(records)
      const content = await fs.readFile(filepath)
      
      // Limpiar archivo temporal
      await fs.unlink(filepath)
      
      return content

    } catch (error) {
      // Intentar limpiar archivo temporal
      try {
        await fs.unlink(filepath)
      } catch (cleanupError) {
        // Ignorar errores de limpieza
      }
      throw new Error(`Error al exportar análisis: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Limpia archivos temporales
   */
  static async cleanupTempFiles(files: CsvFile[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file.path)
      } catch (error) {
        // Ignorar errores de limpieza
      }
    }
  }

  /**
   * Genera nombre de archivo CSV
   */
  static generateCsvFilename(tipo: string = 'backup', fecha?: Date): string {
    const timestamp = format(fecha || new Date(), 'yyyy-MM-dd_HH-mm-ss')
    return `gastos-casa-${tipo}-${timestamp}.csv`
  }
}