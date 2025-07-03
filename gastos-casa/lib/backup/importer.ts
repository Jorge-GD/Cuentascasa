import { prisma } from '@/lib/db/prisma'
import type { BackupData } from './exporter'

export interface ImportOptions {
  overwrite?: boolean // Si debe sobrescribir datos existentes
  mergeMode?: 'skip' | 'update' | 'replace' // Cómo manejar duplicados
  validateIntegrity?: boolean // Si debe validar integridad antes de importar
  preserveIds?: boolean // Si debe preservar los IDs originales
}

export interface ImportResult {
  success: boolean
  summary: {
    cuentasImportadas: number
    movimientosImportados: number
    categoriasImportadas: number
    subcategoriasImportadas: number
    reglasImportadas: number
    etiquetasImportadas: number
  }
  errors: string[]
  warnings: string[]
  skipped: {
    cuentas: string[]
    movimientos: string[]
    categorias: string[]
    reglas: string[]
  }
}

export class BackupImporter {
  /**
   * Importa un backup completo
   */
  static async importComplete(backupData: BackupData, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      summary: {
        cuentasImportadas: 0,
        movimientosImportados: 0,
        categoriasImportadas: 0,
        subcategoriasImportadas: 0,
        reglasImportadas: 0,
        etiquetasImportadas: 0
      },
      errors: [],
      warnings: [],
      skipped: {
        cuentas: [],
        movimientos: [],
        categorias: [],
        reglas: []
      }
    }

    try {
      // Validar integridad si se solicita
      if (options.validateIntegrity !== false) {
        const validation = await this.validateBackupIntegrity(backupData)
        if (!validation.isValid) {
          result.errors.push(...validation.errors)
          return result
        }
      }

      // Ejecutar importación en transacción
      await prisma.$transaction(async (tx) => {
        // 1. Importar categorías primero (son referenciadas por otros)
        if (backupData.categorias?.length > 0) {
          const categoriasResult = await this.importCategorias(tx, backupData.categorias, options)
          result.summary.categoriasImportadas = categoriasResult.imported
          result.skipped.categorias = categoriasResult.skipped
          result.warnings.push(...categoriasResult.warnings)
        }

        // 2. Importar subcategorías
        if (backupData.subcategorias?.length > 0) {
          const subcategoriasResult = await this.importSubcategorias(tx, backupData.subcategorias, options)
          result.summary.subcategoriasImportadas = subcategoriasResult.imported
          result.warnings.push(...subcategoriasResult.warnings)
        }

        // 3. Importar etiquetas
        if (backupData.etiquetas?.length > 0) {
          const etiquetasResult = await this.importEtiquetas(tx, backupData.etiquetas, options)
          result.summary.etiquetasImportadas = etiquetasResult.imported
          result.warnings.push(...etiquetasResult.warnings)
        }

        // 4. Importar cuentas
        if (backupData.cuentas?.length > 0) {
          const cuentasResult = await this.importCuentas(tx, backupData.cuentas, options)
          result.summary.cuentasImportadas = cuentasResult.imported
          result.skipped.cuentas = cuentasResult.skipped
          result.warnings.push(...cuentasResult.warnings)
        }

        // 5. Importar reglas
        if (backupData.reglas?.length > 0) {
          const reglasResult = await this.importReglas(tx, backupData.reglas, options)
          result.summary.reglasImportadas = reglasResult.imported
          result.skipped.reglas = reglasResult.skipped
          result.warnings.push(...reglasResult.warnings)
        }

        // 6. Importar movimientos al final
        if (backupData.movimientos?.length > 0) {
          const movimientosResult = await this.importMovimientos(tx, backupData.movimientos, options)
          result.summary.movimientosImportados = movimientosResult.imported
          result.skipped.movimientos = movimientosResult.skipped
          result.warnings.push(...movimientosResult.warnings)
        }
      })

      result.success = true
      return result

    } catch (error) {
      result.errors.push(`Error durante la importación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return result
    }
  }

  /**
   * Importa solo cuentas del backup
   */
  private static async importCuentas(tx: any, cuentas: any[], options: ImportOptions) {
    let imported = 0
    const skipped: string[] = []
    const warnings: string[] = []

    for (const cuenta of cuentas) {
      try {
        // Verificar si ya existe
        const existing = await tx.cuenta.findFirst({
          where: { nombre: cuenta.nombre }
        })

        if (existing) {
          if (options.mergeMode === 'skip') {
            skipped.push(cuenta.nombre)
            continue
          } else if (options.mergeMode === 'update') {
            await tx.cuenta.update({
              where: { id: existing.id },
              data: {
                tipo: cuenta.tipo,
                color: cuenta.color
              }
            })
            imported++
            continue
          }
        }

        // Crear nueva cuenta
        const dataToCreate: any = {
          nombre: cuenta.nombre,
          tipo: cuenta.tipo,
          color: cuenta.color,
          createdAt: cuenta.createdAt ? new Date(cuenta.createdAt) : new Date()
        }

        if (options.preserveIds && cuenta.id && !existing) {
          dataToCreate.id = cuenta.id
        }

        await tx.cuenta.create({ data: dataToCreate })
        imported++

      } catch (error) {
        warnings.push(`Error al importar cuenta ${cuenta.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return { imported, skipped, warnings }
  }

  /**
   * Importa categorías del backup
   */
  private static async importCategorias(tx: any, categorias: any[], options: ImportOptions) {
    let imported = 0
    const skipped: string[] = []
    const warnings: string[] = []

    for (const categoria of categorias) {
      try {
        // Verificar si ya existe
        const existing = await tx.categoria.findFirst({
          where: { nombre: categoria.nombre }
        })

        if (existing) {
          if (options.mergeMode === 'skip') {
            skipped.push(categoria.nombre)
            continue
          } else if (options.mergeMode === 'update') {
            await tx.categoria.update({
              where: { id: existing.id },
              data: {
                color: categoria.color,
                icono: categoria.icono,
                presupuesto: categoria.presupuesto
              }
            })
            imported++
            continue
          }
        }

        // Crear nueva categoría
        const dataToCreate: any = {
          nombre: categoria.nombre,
          color: categoria.color,
          icono: categoria.icono,
          presupuesto: categoria.presupuesto
        }

        if (options.preserveIds && categoria.id && !existing) {
          dataToCreate.id = categoria.id
        }

        await tx.categoria.create({ data: dataToCreate })
        imported++

      } catch (error) {
        warnings.push(`Error al importar categoría ${categoria.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return { imported, skipped, warnings }
  }

  /**
   * Importa subcategorías del backup
   */
  private static async importSubcategorias(tx: any, subcategorias: any[], options: ImportOptions) {
    let imported = 0
    const warnings: string[] = []

    for (const subcategoria of subcategorias) {
      try {
        // Buscar la categoría padre
        const categoria = await tx.categoria.findFirst({
          where: { nombre: subcategoria.categoria?.nombre || '' }
        })

        if (!categoria) {
          warnings.push(`Subcategoría ${subcategoria.nombre}: categoría padre no encontrada`)
          continue
        }

        // Verificar si ya existe
        const existing = await tx.subcategoria.findFirst({
          where: { 
            nombre: subcategoria.nombre,
            categoriaId: categoria.id
          }
        })

        if (existing && options.mergeMode === 'skip') {
          continue
        }

        if (!existing) {
          const dataToCreate: any = {
            nombre: subcategoria.nombre,
            categoriaId: categoria.id
          }

          if (options.preserveIds && subcategoria.id) {
            dataToCreate.id = subcategoria.id
          }

          await tx.subcategoria.create({ data: dataToCreate })
          imported++
        }

      } catch (error) {
        warnings.push(`Error al importar subcategoría ${subcategoria.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return { imported, warnings }
  }

  /**
   * Importa etiquetas del backup
   */
  private static async importEtiquetas(tx: any, etiquetas: any[], options: ImportOptions) {
    let imported = 0
    const warnings: string[] = []

    for (const etiqueta of etiquetas) {
      try {
        // Verificar si ya existe
        const existing = await tx.etiqueta.findFirst({
          where: { nombre: etiqueta.nombre }
        })

        if (existing && options.mergeMode === 'skip') {
          continue
        }

        if (!existing) {
          const dataToCreate: any = {
            nombre: etiqueta.nombre,
            color: etiqueta.color
          }

          if (options.preserveIds && etiqueta.id) {
            dataToCreate.id = etiqueta.id
          }

          await tx.etiqueta.create({ data: dataToCreate })
          imported++
        }

      } catch (error) {
        warnings.push(`Error al importar etiqueta ${etiqueta.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return { imported, warnings }
  }

  /**
   * Importa reglas del backup
   */
  private static async importReglas(tx: any, reglas: any[], options: ImportOptions) {
    let imported = 0
    const skipped: string[] = []
    const warnings: string[] = []

    for (const regla of reglas) {
      try {
        // Buscar la cuenta asociada si existe
        let cuentaId = null
        if (regla.cuentaId) {
          const cuenta = await tx.cuenta.findFirst({
            where: { nombre: regla.cuenta?.nombre || '' }
          })
          cuentaId = cuenta?.id || null
        }

        // Verificar si ya existe
        const existing = await tx.reglaCategorizacion.findFirst({
          where: { 
            nombre: regla.nombre,
            cuentaId: cuentaId
          }
        })

        if (existing) {
          if (options.mergeMode === 'skip') {
            skipped.push(regla.nombre)
            continue
          } else if (options.mergeMode === 'update') {
            await tx.reglaCategorizacion.update({
              where: { id: existing.id },
              data: {
                patron: regla.patron,
                tipoCoincidencia: regla.tipoCoincidencia,
                categoria: regla.categoria,
                subcategoria: regla.subcategoria,
                prioridad: regla.prioridad,
                activa: regla.activa
              }
            })
            imported++
            continue
          }
        }

        // Crear nueva regla
        const dataToCreate: any = {
          nombre: regla.nombre,
          patron: regla.patron,
          tipoCoincidencia: regla.tipoCoincidencia,
          categoria: regla.categoria,
          subcategoria: regla.subcategoria,
          prioridad: regla.prioridad,
          activa: regla.activa,
          cuentaId: cuentaId
        }

        if (options.preserveIds && regla.id && !existing) {
          dataToCreate.id = regla.id
        }

        await tx.reglaCategorizacion.create({ data: dataToCreate })
        imported++

      } catch (error) {
        warnings.push(`Error al importar regla ${regla.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return { imported, skipped, warnings }
  }

  /**
   * Importa movimientos del backup
   */
  private static async importMovimientos(tx: any, movimientos: any[], options: ImportOptions) {
    let imported = 0
    const skipped: string[] = []
    const warnings: string[] = []

    for (const movimiento of movimientos) {
      try {
        // Buscar la cuenta asociada
        const cuenta = await tx.cuenta.findFirst({
          where: { id: movimiento.cuentaId }
        })

        if (!cuenta) {
          warnings.push(`Movimiento ${movimiento.descripcion}: cuenta no encontrada`)
          continue
        }

        // Verificar duplicados (misma fecha, descripción e importe en la misma cuenta)
        const existing = await tx.movimiento.findFirst({
          where: {
            fecha: new Date(movimiento.fecha),
            descripcion: movimiento.descripcion,
            importe: movimiento.importe,
            cuentaId: cuenta.id
          }
        })

        if (existing) {
          if (options.mergeMode === 'skip') {
            skipped.push(`${movimiento.descripcion} (${movimiento.fecha})`)
            continue
          }
        }

        // Crear nuevo movimiento
        const dataToCreate: any = {
          fecha: new Date(movimiento.fecha),
          descripcion: movimiento.descripcion,
          importe: movimiento.importe,
          saldo: movimiento.saldo,
          categoriaING: movimiento.categoriaING,
          subcategoriaING: movimiento.subcategoriaING,
          categoria: movimiento.categoria,
          subcategoria: movimiento.subcategoria,
          esManual: movimiento.esManual || false,
          fechaImportacion: movimiento.fechaImportacion ? new Date(movimiento.fechaImportacion) : new Date(),
          cuentaId: cuenta.id
        }

        if (options.preserveIds && movimiento.id && !existing) {
          dataToCreate.id = movimiento.id
        }

        await tx.movimiento.create({ data: dataToCreate })
        imported++

      } catch (error) {
        warnings.push(`Error al importar movimiento ${movimiento.descripcion}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return { imported, skipped, warnings }
  }

  /**
   * Valida la integridad del backup antes de importar
   */
  private static async validateBackupIntegrity(backupData: BackupData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Validar estructura básica
      if (!backupData.version) {
        errors.push('Backup sin versión')
      }

      if (!backupData.timestamp) {
        errors.push('Backup sin timestamp')
      }

      // Validar que las cuentas referenciadas en movimientos existen
      if (backupData.movimientos && backupData.cuentas) {
        const cuentaIds = new Set(backupData.cuentas.map(c => c.id))
        const movimientosSinCuenta = backupData.movimientos.filter(m => !cuentaIds.has(m.cuentaId))
        
        if (movimientosSinCuenta.length > 0) {
          errors.push(`${movimientosSinCuenta.length} movimientos referencian cuentas inexistentes`)
        }
      }

      // Validar que las categorías referenciadas en subcategorías existen
      if (backupData.subcategorias && backupData.categorias) {
        const categoriaIds = new Set(backupData.categorias.map(c => c.id))
        const subcategoriasSinCategoria = backupData.subcategorias.filter(s => !categoriaIds.has(s.categoriaId))
        
        if (subcategoriasSinCategoria.length > 0) {
          errors.push(`${subcategoriasSinCategoria.length} subcategorías referencian categorías inexistentes`)
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      }

    } catch (error) {
      errors.push(`Error al validar backup: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return { isValid: false, errors }
    }
  }

  /**
   * Limpia completamente la base de datos antes de importar
   */
  static async clearDatabase(): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Eliminar en orden para respetar las restricciones de clave foránea
      await tx.movimiento.deleteMany()
      await tx.reglaCategorizacion.deleteMany()
      await tx.subcategoria.deleteMany()
      await tx.categoria.deleteMany()
      await tx.etiqueta.deleteMany()
      await tx.cuenta.deleteMany()
    })
  }
}