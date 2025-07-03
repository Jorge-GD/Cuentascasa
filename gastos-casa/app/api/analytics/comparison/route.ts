import { NextRequest, NextResponse } from 'next/server'
import { getAccountComparison } from '@/lib/analytics/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaIds = searchParams.get('cuentaIds')?.split(',') || []
    const periodo = searchParams.get('periodo') || 'mes'
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')
    
    if (cuentaIds.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Al menos un ID de cuenta es requerido'
        },
        { status: 400 }
      )
    }

    const comparison = await getAccountComparison(
      cuentaIds, 
      periodo,
      fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin ? new Date(fechaFin) : undefined
    )

    return NextResponse.json({
      success: true,
      data: comparison
    })

  } catch (error) {
    console.error('Error fetching account comparison:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}