import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsCache } from '@/lib/redis/analytics-cache'

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

    const años = await AnalyticsCache.getAvailableYears(cuentaId)

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