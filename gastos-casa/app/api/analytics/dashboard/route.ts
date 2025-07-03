import { NextRequest, NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/analytics/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    const periodo = searchParams.get('periodo') || 'mes' // mes, trimestre, año
    
    if (!cuentaId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El ID de cuenta es requerido'
        },
        { status: 400 }
      )
    }

    const metrics = await getDashboardMetrics(cuentaId, periodo)

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}