import { prisma } from '@/lib/db/prisma'
import { format } from 'date-fns'

export interface BackupData {
  version: string
  timestamp: string
  cuentas: any[]
  movimientos: any[]
  categorias: any[]
  subcategorias: any[]
  reglas: any[]
  etiquetas: any[]
  metadata: {
    totalRecords: number
    exportedBy: string
    exportDate: string
  }
}

export interface ExportOptions {
  includeCuentas?: boolean
  includeMovimientos?: boolean
  includeCategorias?: boolean
  includeReglas?: boolean
  includeEtiquetas?: boolean
  cuentaIds?: string[]
  fechaInicio?: Date
  fechaFin?: Date
}

export class BackupExporter {
  private static readonly BACKUP_VERSION = '1.0.0'

  /**
   * Exporta todos los datos de la base de datos
   */
  static async exportComplete(): Promise<BackupData> {
    try {
      const [cuentas, movimientos, categorias, subcategorias, reglas, etiquetas] = await Promise.all([
        prisma.cuenta.findMany({
          orderBy: { createdAt: 'asc' }
        }),
        prisma.movimiento.findMany({
          orderBy: { fecha: 'asc' }
        }),
        prisma.categoria.findMany({
          orderBy: { nombre: 'asc' }
        }),
        prisma.subcategoria.findMany({
          include: { categoria: true },
          orderBy: { nombre: 'asc' }
        }),
        prisma.reglaCategorizacion.findMany({
          orderBy: { prioridad: 'desc' }
        }),
        prisma.etiqueta.findMany({
          orderBy: { nombre: 'asc' }
        })
      ])

      const totalRecords = cuentas.length + movimientos.length + categorias.length + 
                          subcategorias.length + reglas.length + etiquetas.length

      return {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        cuentas,
        movimientos,
        categorias,
        subcategorias,
        reglas,
        etiquetas,
        metadata: {
          totalRecords,
          exportedBy: 'Gastos Casa App',
          exportDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        }
      }
    } catch (error) {
      throw new Error(`Error al exportar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Exporta datos con opciones específicas
   */
  static async exportWithOptions(options: ExportOptions): Promise<BackupData> {
    try {
      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        cuentas: [],
        movimientos: [],
        categorias: [],
        subcategorias: [],
        reglas: [],
        etiquetas: [],
        metadata: {
          totalRecords: 0,
          exportedBy: 'Gastos Casa App',
          exportDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        }
      }

      // Exportar cuentas
      if (options.includeCuentas !== false) {
        const whereClause = options.cuentaIds ? { id: { in: options.cuentaIds } } : {}
        backupData.cuentas = await prisma.cuenta.findMany({
          where: whereClause,
          orderBy: { createdAt: 'asc' }
        })
      }

      // Exportar movimientos
      if (options.includeMovimientos !== false) {
        const whereClause: any = {}
        
        if (options.cuentaIds) {
          whereClause.cuentaId = { in: options.cuentaIds }
        }
        
        if (options.fechaInicio || options.fechaFin) {
          whereClause.fecha = {}
          if (options.fechaInicio) {
            whereClause.fecha.gte = options.fechaInicio
          }
          if (options.fechaFin) {
            whereClause.fecha.lte = options.fechaFin
          }
        }

        backupData.movimientos = await prisma.movimiento.findMany({
          where: whereClause,
          orderBy: { fecha: 'asc' }
        })
      }

      // Exportar categorías
      if (options.includeCategorias !== false) {
        backupData.categorias = await prisma.categoria.findMany({
          orderBy: { nombre: 'asc' }
        })

        backupData.subcategorias = await prisma.subcategoria.findMany({
          include: { categoria: true },
          orderBy: { nombre: 'asc' }
        })
      }

      // Exportar reglas
      if (options.includeReglas !== false) {
        const whereClause = options.cuentaIds ? 
          { OR: [{ cuentaId: { in: options.cuentaIds } }, { cuentaId: null }] } : {}
        
        backupData.reglas = await prisma.reglaCategorizacion.findMany({
          where: whereClause,
          orderBy: { prioridad: 'desc' }
        })
      }

      // Exportar etiquetas
      if (options.includeEtiquetas !== false) {
        backupData.etiquetas = await prisma.etiqueta.findMany({
          orderBy: { nombre: 'asc' }
        })
      }

      // Calcular total de registros
      backupData.metadata.totalRecords = 
        backupData.cuentas.length + 
        backupData.movimientos.length + 
        backupData.categorias.length + 
        backupData.subcategorias.length + 
        backupData.reglas.length + 
        backupData.etiquetas.length

      return backupData
    } catch (error) {
      throw new Error(`Error al exportar datos con opciones: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Exporta solo los datos de una cuenta específica
   */
  static async exportCuenta(cuentaId: string): Promise<BackupData> {
    return this.exportWithOptions({
      cuentaIds: [cuentaId],
      includeReglas: true, // Incluir reglas que pueden ser globales
      includeEtiquetas: true // Incluir etiquetas relacionadas
    })
  }

  /**
   * Exporta datos en un rango de fechas
   */
  static async exportPeriodo(fechaInicio: Date, fechaFin: Date, cuentaIds?: string[]): Promise<BackupData> {
    return this.exportWithOptions({
      fechaInicio,
      fechaFin,
      cuentaIds,
      includeCategorias: true, // Incluir categorías para contexto
      includeReglas: true // Incluir reglas para recategorización
    })
  }

  /**
   * Valida la integridad de los datos de backup
   */
  static validateBackupData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validar estructura básica
    if (!data.version) {
      errors.push('Falta la versión del backup')
    }

    if (!data.timestamp) {
      errors.push('Falta la marca de tiempo del backup')
    }

    if (!data.metadata) {
      errors.push('Faltan los metadatos del backup')
    }

    // Validar arrays requeridos
    const requiredArrays = ['cuentas', 'movimientos', 'categorias', 'subcategorias', 'reglas', 'etiquetas']
    for (const arrayName of requiredArrays) {
      if (!Array.isArray(data[arrayName])) {
        errors.push(`${arrayName} debe ser un array`)
      }
    }

    // Validar relaciones básicas
    if (Array.isArray(data.movimientos) && Array.isArray(data.cuentas)) {
      const cuentaIds = new Set(data.cuentas.map((c: any) => c.id))
      const movimientosSinCuenta = data.movimientos.filter((m: any) => !cuentaIds.has(m.cuentaId))
      
      if (movimientosSinCuenta.length > 0) {
        errors.push(`${movimientosSinCuenta.length} movimientos sin cuenta asociada`)
      }
    }

    // Validar subcategorías
    if (Array.isArray(data.subcategorias) && Array.isArray(data.categorias)) {
      const categoriaIds = new Set(data.categorias.map((c: any) => c.id))
      const subcategoriasSinCategoria = data.subcategorias.filter((s: any) => !categoriaIds.has(s.categoriaId))
      
      if (subcategoriasSinCategoria.length > 0) {
        errors.push(`${subcategoriasSinCategoria.length} subcategorías sin categoría asociada`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Genera un nombre de archivo para el backup
   */
  static generateBackupFilename(tipo: string = 'completo', fecha?: Date): string {
    const timestamp = format(fecha || new Date(), 'yyyy-MM-dd_HH-mm-ss')
    return `gastos-casa-backup-${tipo}-${timestamp}.json`
  }
}