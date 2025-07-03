import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'

export interface BudgetAlert {
  id: string
  categoria: string
  tipo: 'warning' | 'exceeded' | 'projected_exceeded'
  presupuesto: number
  gastoActual: number
  porcentajeUsado: number
  proyeccion?: number
  mensaje: string
  severidad: 'info' | 'warning' | 'error'
}

export interface BudgetSummary {
  totalPresupuesto: number
  totalGastado: number
  totalRestante: number
  porcentajeGlobalUsado: number
  categoriasExcedidas: number
  categoriasEnRiesgo: number
  alertas: BudgetAlert[]
}

export class BudgetTracker {
  async getBudgetAlerts(cuentaId?: string, fecha: Date = new Date()): Promise<BudgetAlert[]> {
    const inicioMes = startOfMonth(fecha)
    const finMes = endOfMonth(fecha)
    const diasEnMes = getDaysInMonth(fecha)
    const diaActual = fecha.getDate()

    // Obtener categorías con presupuesto
    const categorias = await prisma.categoria.findMany({
      where: {
        presupuesto: {
          gt: 0
        }
      }
    })

    const alertas: BudgetAlert[] = []

    for (const categoria of categorias) {
      const gastoActual = await prisma.movimiento.aggregate({
        where: {
          categoria: categoria.nombre,
          fecha: {
            gte: inicioMes,
            lte: finMes
          },
          importe: {
            lt: 0
          },
          ...(cuentaId && { cuentaId })
        },
        _sum: {
          importe: true
        }
      })

      const gastoTotal = Math.abs(gastoActual._sum.importe || 0)
      const presupuesto = categoria.presupuesto!
      const porcentajeUsado = (gastoTotal / presupuesto) * 100
      
      // Calcular proyección
      const gastoDiario = gastoTotal / diaActual
      const proyeccion = gastoDiario * diasEnMes

      // Generar alertas según el estado
      if (porcentajeUsado > 100) {
        alertas.push({
          id: `exceeded-${categoria.id}`,
          categoria: categoria.nombre,
          tipo: 'exceeded',
          presupuesto,
          gastoActual: gastoTotal,
          porcentajeUsado,
          mensaje: `Has excedido el presupuesto de ${categoria.nombre} en un ${(porcentajeUsado - 100).toFixed(1)}%`,
          severidad: 'error'
        })
      } else if (proyeccion > presupuesto && porcentajeUsado > 50) {
        alertas.push({
          id: `projected-${categoria.id}`,
          categoria: categoria.nombre,
          tipo: 'projected_exceeded',
          presupuesto,
          gastoActual: gastoTotal,
          porcentajeUsado,
          proyeccion,
          mensaje: `Al ritmo actual, excederás el presupuesto de ${categoria.nombre} para fin de mes`,
          severidad: 'warning'
        })
      } else if (porcentajeUsado > 80) {
        alertas.push({
          id: `warning-${categoria.id}`,
          categoria: categoria.nombre,
          tipo: 'warning',
          presupuesto,
          gastoActual: gastoTotal,
          porcentajeUsado,
          mensaje: `Has usado el ${porcentajeUsado.toFixed(1)}% del presupuesto de ${categoria.nombre}`,
          severidad: 'warning'
        })
      }
    }

    // Ordenar por severidad y porcentaje usado
    return alertas.sort((a, b) => {
      const severityOrder = { error: 3, warning: 2, info: 1 }
      if (severityOrder[a.severidad] !== severityOrder[b.severidad]) {
        return severityOrder[b.severidad] - severityOrder[a.severidad]
      }
      return b.porcentajeUsado - a.porcentajeUsado
    })
  }

  async getBudgetSummary(cuentaId?: string, fecha: Date = new Date()): Promise<BudgetSummary> {
    const inicioMes = startOfMonth(fecha)
    const finMes = endOfMonth(fecha)

    // Obtener categorías con presupuesto
    const categorias = await prisma.categoria.findMany({
      where: {
        presupuesto: {
          gt: 0
        }
      }
    })

    let totalPresupuesto = 0
    let totalGastado = 0
    let categoriasExcedidas = 0
    let categoriasEnRiesgo = 0

    for (const categoria of categorias) {
      totalPresupuesto += categoria.presupuesto!

      const gastoActual = await prisma.movimiento.aggregate({
        where: {
          categoria: categoria.nombre,
          fecha: {
            gte: inicioMes,
            lte: finMes
          },
          importe: {
            lt: 0
          },
          ...(cuentaId && { cuentaId })
        },
        _sum: {
          importe: true
        }
      })

      const gastoTotal = Math.abs(gastoActual._sum.importe || 0)
      totalGastado += gastoTotal

      const porcentajeUsado = (gastoTotal / categoria.presupuesto!) * 100

      if (porcentajeUsado > 100) {
        categoriasExcedidas++
      } else if (porcentajeUsado > 80) {
        categoriasEnRiesgo++
      }
    }

    const alertas = await this.getBudgetAlerts(cuentaId, fecha)

    return {
      totalPresupuesto,
      totalGastado,
      totalRestante: totalPresupuesto - totalGastado,
      porcentajeGlobalUsado: totalPresupuesto > 0 ? (totalGastado / totalPresupuesto) * 100 : 0,
      categoriasExcedidas,
      categoriasEnRiesgo,
      alertas
    }
  }

  async checkBudgetLimits(categoriaId: string, nuevoGasto: number, cuentaId?: string): Promise<BudgetAlert | null> {
    const categoria = await prisma.categoria.findUnique({
      where: { id: categoriaId }
    })

    if (!categoria?.presupuesto) {
      return null
    }

    const fechaActual = new Date()
    const inicioMes = startOfMonth(fechaActual)
    const finMes = endOfMonth(fechaActual)

    const gastoActual = await prisma.movimiento.aggregate({
      where: {
        categoria: categoria.nombre,
        fecha: {
          gte: inicioMes,
          lte: finMes
        },
        importe: {
          lt: 0
        },
        ...(cuentaId && { cuentaId })
      },
      _sum: {
        importe: true
      }
    })

    const gastoTotal = Math.abs(gastoActual._sum.importe || 0) + Math.abs(nuevoGasto)
    const porcentajeUsado = (gastoTotal / categoria.presupuesto) * 100

    if (porcentajeUsado > 100) {
      return {
        id: `new-exceeded-${categoria.id}`,
        categoria: categoria.nombre,
        tipo: 'exceeded',
        presupuesto: categoria.presupuesto,
        gastoActual: gastoTotal,
        porcentajeUsado,
        mensaje: `Este gasto hará que excedas el presupuesto de ${categoria.nombre}`,
        severidad: 'error'
      }
    } else if (porcentajeUsado > 90) {
      return {
        id: `new-warning-${categoria.id}`,
        categoria: categoria.nombre,
        tipo: 'warning',
        presupuesto: categoria.presupuesto,
        gastoActual: gastoTotal,
        porcentajeUsado,
        mensaje: `Este gasto te llevará al ${porcentajeUsado.toFixed(1)}% del presupuesto de ${categoria.nombre}`,
        severidad: 'warning'
      }
    }

    return null
  }

  async getMonthlyBudgetTrend(cuentaId?: string, meses: number = 6): Promise<any[]> {
    const trends = []
    const fechaActual = new Date()

    for (let i = meses - 1; i >= 0; i--) {
      const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1)
      const summary = await this.getBudgetSummary(cuentaId, fecha)
      
      trends.push({
        mes: fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }),
        fecha: fecha.toISOString(),
        totalPresupuesto: summary.totalPresupuesto,
        totalGastado: summary.totalGastado,
        porcentajeUsado: summary.porcentajeGlobalUsado,
        categoriasExcedidas: summary.categoriasExcedidas,
        categoriasEnRiesgo: summary.categoriasEnRiesgo
      })
    }

    return trends
  }
}

export const budgetTracker = new BudgetTracker()