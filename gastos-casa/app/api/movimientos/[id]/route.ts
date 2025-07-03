import { NextRequest, NextResponse } from 'next/server'
import { getMovimientoById, updateMovimiento, deleteMovimiento } from '@/lib/db/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const movimiento = await getMovimientoById(id)
    
    if (!movimiento) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Movimiento no encontrado'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: movimiento
    })

  } catch (error) {
    console.error('Error fetching movimiento:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    
    // Verify movement exists
    const existingMovimiento = await getMovimientoById(id)
    if (!existingMovimiento) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Movimiento no encontrado'
        },
        { status: 404 }
      )
    }

    // Validate data if provided
    if (body.importe !== undefined && isNaN(parseFloat(body.importe))) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El importe debe ser un número válido'
        },
        { status: 400 }
      )
    }

    if (body.saldo !== undefined && body.saldo !== null && isNaN(parseFloat(body.saldo))) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El saldo debe ser un número válido'
        },
        { status: 400 }
      )
    }

    // Validate date if provided
    if (body.fecha) {
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
    }

    // Prepare update data
    const updateData: any = {}
    
    if (body.fecha) updateData.fecha = new Date(body.fecha)
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion.trim()
    if (body.importe !== undefined) updateData.importe = parseFloat(body.importe)
    if (body.saldo !== undefined) updateData.saldo = body.saldo ? parseFloat(body.saldo) : null
    if (body.categoria !== undefined) updateData.categoria = body.categoria
    if (body.subcategoria !== undefined) updateData.subcategoria = body.subcategoria || null
    if (body.categoriaING !== undefined) updateData.categoriaING = body.categoriaING || null
    if (body.subcategoriaING !== undefined) updateData.subcategoriaING = body.subcategoriaING || null
    if (body.esManual !== undefined) updateData.esManual = body.esManual

    const updatedMovimiento = await updateMovimiento(id, updateData)

    return NextResponse.json({
      success: true,
      data: updatedMovimiento
    })

  } catch (error) {
    console.error('Error updating movimiento:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Verify movement exists
    const existingMovimiento = await getMovimientoById(id)
    if (!existingMovimiento) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Movimiento no encontrado'
        },
        { status: 404 }
      )
    }

    await deleteMovimiento(id)

    return NextResponse.json({
      success: true,
      message: 'Movimiento eliminado correctamente'
    })

  } catch (error) {
    console.error('Error deleting movimiento:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}