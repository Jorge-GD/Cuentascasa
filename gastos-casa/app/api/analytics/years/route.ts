import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')

    if (!cuentaId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere cuentaId' },
        { status: 400 }
      )
    }

    // Obtener el rango de años con datos
    const movimientosRange = await prisma.movimiento.aggregate({
      where: {
        cuentaId: cuentaId
      },
      _min: { fecha: true },
      _max: { fecha: true }
    })

    if (!movimientosRange._min?.fecha || !movimientosRange._max?.fecha) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const añoMinimo = movimientosRange._min.fecha.getFullYear()
    const añoMaximo = movimientosRange._max.fecha.getFullYear()

    // Generar lista de años disponibles (del más reciente al más antiguo)
    const años = []
    for (let año = añoMaximo; año >= añoMinimo; año--) {
      años.push(año)
    }

    return NextResponse.json({
      success: true,
      data: años
    })

  } catch (error) {
    console.error('Error obteniendo años disponibles:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}