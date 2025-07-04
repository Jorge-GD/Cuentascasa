import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsCache } from '@/lib/redis/analytics-cache'

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

    // Extraer año y mes del periodo si es necesario
    const now = new Date()
    const year = fechaInicio ? new Date(fechaInicio).getFullYear() : now.getFullYear()
    const month = periodo === 'mes' && fechaInicio ? new Date(fechaInicio).getMonth() + 1 : undefined

    const comparison = await AnalyticsCache.getAccountComparison(cuentaIds, year, month)

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