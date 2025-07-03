import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

export interface QueryOptions {
  cuentaId?: string
  startDate?: Date
  endDate?: Date
  categoria?: string
  limit?: number
  offset?: number
}

export class OptimizedQueries {
  // Consulta optimizada para el dashboard
  static async getDashboardMetrics(cuentaId: string, periodo: 'mes' | 'trimestre' | 'año') {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (periodo) {
      case 'mes':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'trimestre':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)
        break
      case 'año':
        startDate = startOfYear(now)
        endDate = endOfYear(now)
        break
    }

    // Usar transacción para consultas relacionadas
    const [gastos, ingresos, transacciones, categorias] = await prisma.$transaction([
      // Gastos totales
      prisma.movimiento.aggregate({
        where: {
          cuentaId,
          fecha: { gte: startDate, lte: endDate },
          importe: { lt: 0 }
        },
        _sum: { importe: true },
        _count: true
      }),
      
      // Ingresos totales
      prisma.movimiento.aggregate({
        where: {
          cuentaId,
          fecha: { gte: startDate, lte: endDate },
          importe: { gte: 0 }
        },
        _sum: { importe: true },
        _count: true
      }),
      
      // Total de transacciones
      prisma.movimiento.count({
        where: {
          cuentaId,
          fecha: { gte: startDate, lte: endDate }
        }
      }),
      
      // Top categorías (optimizado con groupBy)
      prisma.movimiento.groupBy({
        by: ['categoria'],
        where: {
          cuentaId,
          fecha: { gte: startDate, lte: endDate },
          importe: { lt: 0 }
        },
        _sum: { importe: true },
        _count: true,
        orderBy: { _sum: { importe: 'asc' } },
        take: 10
      })
    ])

    return {
      gastoTotal: Math.abs(gastos._sum.importe || 0),
      ingresoTotal: ingresos._sum.importe || 0,
      balance: (ingresos._sum.importe || 0) + (gastos._sum.importe || 0),
      transacciones,
      topCategorias: categorias.map(cat => ({
        categoria: cat.categoria,
        total: Math.abs(cat._sum.importe || 0),
        transacciones: cat._count,
        porcentaje: 0 // Se calcula después
      }))
    }
  }

  // Movimientos con paginación optimizada
  static async getMovimientosPaginated(options: QueryOptions & { 
    orderBy?: { field: string, direction: 'asc' | 'desc' }
  }) {
    const {
      cuentaId,
      startDate,
      endDate,
      categoria,
      limit = 50,
      offset = 0,
      orderBy = { field: 'fecha', direction: 'desc' }
    } = options

    const where = {
      ...(cuentaId && { cuentaId }),
      ...(startDate && endDate && {
        fecha: { gte: startDate, lte: endDate }
      }),
      ...(categoria && { categoria })
    }

    const [movimientos, total] = await prisma.$transaction([
      prisma.movimiento.findMany({
        where,
        orderBy: { [orderBy.field]: orderBy.direction },
        take: limit,
        skip: offset,
        select: {
          id: true,
          fecha: true,
          descripcion: true,
          importe: true,
          categoria: true,
          subcategoria: true,
          esManual: true,
          cuenta: {
            select: {
              nombre: true,
              color: true
            }
          }
        }
      }),
      
      prisma.movimiento.count({ where })
    ])

    return {
      movimientos,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit
    }
  }

  // Estadísticas de categorías optimizada
  static async getCategoryStats(cuentaId: string, months = 6) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    return prisma.movimiento.groupBy({
      by: ['categoria'],
      where: {
        cuentaId,
        fecha: { gte: startDate, lte: endDate },
        importe: { lt: 0 }
      },
      _sum: { importe: true },
      _count: true,
      _avg: { importe: true },
      orderBy: { _sum: { importe: 'asc' } }
    })
  }

  // Tendencias mensuales optimizada
  static async getMonthlyTrends(cuentaId: string, months = 12) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    // Usar SQL crudo para mejor rendimiento en agregaciones complejas
    const trends = await prisma.$queryRaw<Array<{
      month: string
      year: number
      gastos: number
      ingresos: number
      transacciones: number
    }>>`
      SELECT 
        strftime('%m', fecha) as month,
        strftime('%Y', fecha) as year,
        COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) as gastos,
        COALESCE(SUM(CASE WHEN importe >= 0 THEN importe ELSE 0 END), 0) as ingresos,
        COUNT(*) as transacciones
      FROM Movimiento 
      WHERE cuentaId = ${cuentaId}
        AND fecha >= ${startDate.toISOString()}
        AND fecha <= ${endDate.toISOString()}
      GROUP BY strftime('%Y-%m', fecha)
      ORDER BY year, month
    `

    return trends
  }

  // Búsqueda de duplicados optimizada
  static async findPotentialDuplicates(
    cuentaId: string,
    fecha: Date,
    importe: number,
    descripcion: string,
    tolerance = 0.01
  ) {
    // Búsqueda en ventana de ±2 días para mejor rendimiento
    const startDate = new Date(fecha)
    startDate.setDate(startDate.getDate() - 2)
    const endDate = new Date(fecha)
    endDate.setDate(endDate.getDate() + 2)

    return prisma.movimiento.findMany({
      where: {
        cuentaId,
        fecha: { gte: startDate, lte: endDate },
        importe: {
          gte: importe - tolerance,
          lte: importe + tolerance
        },
        descripcion: {
          contains: descripcion.substring(0, 20) // Buscar por los primeros 20 caracteres
        }
      },
      take: 10 // Limitar resultados para mejor rendimiento
    })
  }

  // Estadísticas de presupuesto optimizada
  static async getBudgetStats(cuentaId?: string, fecha = new Date()) {
    const startMonth = startOfMonth(fecha)
    const endMonth = endOfMonth(fecha)

    // Obtener categorías con presupuesto y sus gastos en una sola consulta
    const categoriasConGastos = await prisma.categoria.findMany({
      where: {
        presupuesto: { gt: 0 }
      },
      select: {
        id: true,
        nombre: true,
        presupuesto: true,
        _count: {
          select: {
            subcategorias: true
          }
        }
      }
    })

    // Obtener gastos por categoría en paralelo
    const gastosPromises = categoriasConGastos.map(categoria =>
      prisma.movimiento.aggregate({
        where: {
          categoria: categoria.nombre,
          fecha: { gte: startMonth, lte: endMonth },
          importe: { lt: 0 },
          ...(cuentaId && { cuentaId })
        },
        _sum: { importe: true },
        _count: true
      }).then(result => ({
        categoriaId: categoria.id,
        categoria: categoria.nombre,
        presupuesto: categoria.presupuesto!,
        gastoActual: Math.abs(result._sum.importe || 0),
        transacciones: result._count
      }))
    )

    return Promise.all(gastosPromises)
  }

  // Limpiar datos antiguos (mantenimiento)
  static async cleanupOldData(retentionMonths = 24) {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths)

    const deleteCount = await prisma.movimiento.deleteMany({
      where: {
        fechaImportacion: { lt: cutoffDate },
        esManual: false
      }
    })

    return deleteCount.count
  }

  // Estadísticas de rendimiento de la base de datos
  static async getDatabaseStats() {
    const [
      totalMovimientos,
      totalCuentas,
      totalCategorias,
      totalReglas,
      movimientosRecientes
    ] = await prisma.$transaction([
      prisma.movimiento.count(),
      prisma.cuenta.count(),
      prisma.categoria.count(),
      prisma.reglaCategorizacion.count(),
      prisma.movimiento.count({
        where: {
          fechaImportacion: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        }
      })
    ])

    return {
      totalMovimientos,
      totalCuentas,
      totalCategorias,
      totalReglas,
      movimientosRecientes,
      databaseSize: await this.getDatabaseSize()
    }
  }

  private static async getDatabaseSize(): Promise<number> {
    try {
      // Para SQLite, esto requeriría acceso al sistema de archivos
      // Por simplicidad, calculamos basado en el número de registros
      const totalRecords = await prisma.movimiento.count()
      return totalRecords * 0.5 // Estimación: ~0.5KB por movimiento
    } catch {
      return 0
    }
  }
}