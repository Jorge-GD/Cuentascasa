import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsCache } from '@/lib/redis/analytics-cache'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaIds = searchParams.get('cuentaIds')?.split(',') || []
    const tipo = (searchParams.get('tipo') || 'gastos') as 'gastos' | 'ingresos'
    const categoriaIds = searchParams.get('categoriaIds')?.split(',') || []
    const subcategoriaIds = searchParams.get('subcategoriaIds')?.split(',') || []
    const añosParam = searchParams.get('años')

    if (!cuentaIds.length) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos una cuenta' },
        { status: 400 }
      )
    }

    // Convertir años si se proporcionan
    const años = añosParam ? añosParam.split(',').map(Number) : undefined

    const response = await AnalyticsCache.getComparativeAnalysis(
      cuentaIds,
      tipo,
      categoriaIds,
      subcategoriaIds,
      años
    )

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error en análisis comparativo:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al generar análisis comparativo' 
      },
      { status: 500 }
    )
  }
}

