import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'

export interface PresupuestoAnalysis {
  categoriaId: string
  categoria: string
  presupuestoMensual: number
  gastoActual: number
  porcentajeUsado: number
  diasRestantes: number
  proyeccionFinMes: number
  estado: 'ok' | 'warning' | 'exceeded'
}

export async function calculatePresupuestosAnalysis(
  cuentaId?: string,
  fecha?: string
): Promise<PresupuestoAnalysis[]> {
  const fechaRef = fecha ? new Date(fecha) : new Date()
  const inicioMes = startOfMonth(fechaRef)
  const finMes = endOfMonth(fechaRef)
  const diasEnMes = getDaysInMonth(fechaRef)
  const diaActual = fechaRef.getDate()
  const diasRestantes = diasEnMes - diaActual

  // Obtener categorías con presupuesto
  const categorias = await prisma.categoria.findMany({
    where: {
      presupuesto: {
        gt: 0
      }
    }
  })

  const presupuestosData: PresupuestoAnalysis[] = []

  for (const categoria of categorias) {
    // Calcular gasto actual de la categoría en el mes
    const gastoActual = await prisma.movimiento.aggregate({
      where: {
        categoria: categoria.nombre,
        fecha: {
          gte: inicioMes,
          lte: finMes
        },
        importe: {
          lt: 0 // Solo gastos
        },
        ...(cuentaId && { cuentaId })
      },
      _sum: {
        importe: true
      }
    })

    const gastoTotal = Math.abs(gastoActual._sum.importe || 0)
    const presupuestoMensual = categoria.presupuesto || 0
    const porcentajeUsado = presupuestoMensual > 0 ? (gastoTotal / presupuestoMensual) * 100 : 0
    
    // Calcular proyección para fin de mes
    const gastoDiario = gastoTotal / diaActual
    const proyeccionFinMes = gastoDiario * diasEnMes

    // Determinar estado
    let estado: 'ok' | 'warning' | 'exceeded' = 'ok'
    if (porcentajeUsado > 100) {
      estado = 'exceeded'
    } else if (porcentajeUsado > 80 || proyeccionFinMes > presupuestoMensual) {
      estado = 'warning'
    }

    presupuestosData.push({
      categoriaId: categoria.id,
      categoria: categoria.nombre,
      presupuestoMensual,
      gastoActual: gastoTotal,
      porcentajeUsado,
      diasRestantes,
      proyeccionFinMes,
      estado
    })
  }

  // Ordenar por porcentaje usado (más críticos primero)
  presupuestosData.sort((a, b) => b.porcentajeUsado - a.porcentajeUsado)

  return presupuestosData
}