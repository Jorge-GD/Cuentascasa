import { NextResponse } from 'next/server'
import { PresupuestosCache } from '@/lib/redis/analytics-cache'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    const fecha = searchParams.get('fecha')

    const presupuestosData = await PresupuestosCache.getAnalysis(
      cuentaId || undefined, 
      fecha || undefined
    )

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
    const { prisma } = await import('@/lib/db/prisma')
    const categoria = await prisma.categoria.update({
      where: { id: categoriaId },
      data: { presupuesto: presupuesto > 0 ? presupuesto : null }
    })

    // Invalidar cache de presupuestos
    await PresupuestosCache.invalidateAll()

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