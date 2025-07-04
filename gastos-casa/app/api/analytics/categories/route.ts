import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsCache } from '@/lib/redis/analytics-cache'

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

    // Para el cache necesitamos año y mes
    const now = new Date()
    const year = now.getFullYear()
    const month = periodo === 'mes' ? now.getMonth() + 1 : undefined

    const categories = await AnalyticsCache.getCategoryAnalytics(cuentaId, year, month)

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