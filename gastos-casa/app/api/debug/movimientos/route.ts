import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    
    if (!cuentaId) {
      return NextResponse.json(
        { error: 'cuentaId es requerido' },
        { status: 400 }
      )
    }

    // Obtener movimientos de la cuenta
    const movimientos = await prisma.movimiento.findMany({
      where: {
        cuentaId: cuentaId
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 20 // Solo los últimos 20
    })

    // Obtener información de la cuenta
    const cuenta = await prisma.cuenta.findUnique({
      where: { id: cuentaId }
    })

    return NextResponse.json({
      success: true,
      data: {
        cuenta: cuenta,
        totalMovimientos: movimientos.length,
        movimientos: movimientos.map(mov => ({
          id: mov.id,
          fecha: mov.fecha,
          descripcion: mov.descripcion,
          importe: mov.importe,
          saldo: mov.saldo,
          categoria: mov.categoria,
          hash: mov.hash
        }))
      }
    })

  } catch (error) {
    console.error('Error in debug endpoint:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}