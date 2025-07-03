import { NextRequest, NextResponse } from 'next/server'
import { getMovimientos, createMovimiento } from '@/lib/db/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')
    const limit = searchParams.get('limit')

    const movimientos = await getMovimientos(
      cuentaId || undefined,
      limit ? parseInt(limit) : undefined
    )

    return NextResponse.json({
      success: true,
      data: movimientos
    })

  } catch (error) {
    console.error('Error fetching movimientos:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['fecha', 'descripcion', 'importe', 'categoria', 'cuentaId']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: `Faltan campos requeridos: ${missingFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate data types
    if (isNaN(parseFloat(body.importe))) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El importe debe ser un número válido'
        },
        { status: 400 }
      )
    }

    if (body.saldo && isNaN(parseFloat(body.saldo))) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El saldo debe ser un número válido'
        },
        { status: 400 }
      )
    }

    // Validate date
    const fecha = new Date(body.fecha)
    if (isNaN(fecha.getTime())) {
      return NextResponse.json(
        { 
          success: false,
          error: 'La fecha debe ser válida'
        },
        { status: 400 }
      )
    }

    const newMovimiento = await createMovimiento({
      fecha,
      descripcion: body.descripcion.trim(),
      importe: parseFloat(body.importe),
      saldo: body.saldo ? parseFloat(body.saldo) : null,
      categoriaING: body.categoriaING || null,
      subcategoriaING: body.subcategoriaING || null,
      categoria: body.categoria,
      subcategoria: body.subcategoria || null,
      esManual: body.esManual !== undefined ? body.esManual : true,
      cuenta: {
        connect: { id: body.cuentaId }
      }
    })

    return NextResponse.json({
      success: true,
      data: newMovimiento
    })

  } catch (error) {
    console.error('Error creating movimiento:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}