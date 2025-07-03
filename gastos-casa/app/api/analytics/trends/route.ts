import { NextRequest, NextResponse } from 'next/server'
import { getTrendAnalysis } from '@/lib/analytics/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    const tipo = searchParams.get('tipo') || 'mensual' // mensual, semanal, anual
    const meses = parseInt(searchParams.get('meses') || '12')
    
    if (!cuentaId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El ID de cuenta es requerido'
        },
        { status: 400 }
      )
    }

    if (meses < 1 || meses > 24) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El período debe estar entre 1 y 24 meses'
        },
        { status: 400 }
      )
    }

    const trends = await getTrendAnalysis(cuentaId, tipo, meses)

    return NextResponse.json({
      success: true,
      data: trends
    })

  } catch (error) {
    console.error('Error fetching trend analysis:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}