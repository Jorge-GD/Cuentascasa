import { NextResponse } from 'next/server'
import { budgetTracker } from '@/lib/budgets/tracker'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    const fecha = searchParams.get('fecha')

    const fechaRef = fecha ? new Date(fecha) : new Date()
    const alertas = await budgetTracker.getBudgetAlerts(cuentaId || undefined, fechaRef)

    return NextResponse.json({
      success: true,
      data: alertas
    })

  } catch (error) {
    console.error('Error fetching budget alerts:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener alertas de presupuesto' },
      { status: 500 }
    )
  }
}