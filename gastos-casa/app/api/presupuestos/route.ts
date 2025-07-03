import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    const fecha = searchParams.get('fecha') || new Date().toISOString()

    const fechaRef = new Date(fecha)
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

    const presupuestosData = []

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

    return NextResponse.json({
      success: true,
      data: presupuestosData
    })

  } catch (error) {
    console.error('Error fetching budget data:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener datos de presupuestos' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { categoriaId, presupuesto } = await request.json()

    if (!categoriaId || typeof presupuesto !== 'number') {
      return NextResponse.json(
        { success: false, error: 'categoriaId y presupuesto son requeridos' },
        { status: 400 }
      )
    }

    // Actualizar el presupuesto de la categoría
    const categoria = await prisma.categoria.update({
      where: { id: categoriaId },
      data: { presupuesto: presupuesto > 0 ? presupuesto : null }
    })

    return NextResponse.json({
      success: true,
      data: categoria
    })

  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar presupuesto' },
      { status: 500 }
    )
  }
}