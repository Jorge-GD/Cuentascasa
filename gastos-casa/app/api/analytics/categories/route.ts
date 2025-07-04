import { NextRequest, NextResponse } from 'next/server'
import { getDetailedCategoryAnalysis } from '@/lib/analytics/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    const periodo = searchParams.get('periodo') || 'mes'

    if (!cuentaId) {
      return NextResponse.json(
        { success: false, error: 'cuentaId es requerido' },
        { status: 400 }
      )
    }

    const categories = await getDetailedCategoryAnalysis(cuentaId, periodo)

    return NextResponse.json({
      success: true,
      data: categories
    })

  } catch (error) {
    console.error('Error fetching detailed category analysis:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener análisis detallado de categorías' 
      },
      { status: 500 }
    )
  }
}