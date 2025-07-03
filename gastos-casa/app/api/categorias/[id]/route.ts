import { NextRequest, NextResponse } from 'next/server'
import { getCategoriaById, updateCategoria, deleteCategoria } from '@/lib/db/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const categoria = await getCategoriaById(id)
    
    if (!categoria) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Categoría no encontrada'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categoria
    })

  } catch (error) {
    console.error('Error fetching categoria:', error)
    
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
    
    // Verify categoria exists
    const existingCategoria = await getCategoriaById(id)
    if (!existingCategoria) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Categoría no encontrada'
        },
        { status: 404 }
      )
    }

    // Validate color format if provided
    if (body.color) {
      const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      if (!colorPattern.test(body.color)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'El color debe ser un valor hexadecimal válido (ej: #FF0000)'
          },
          { status: 400 }
        )
      }
    }

    // Validate budget if provided
    if (body.presupuesto !== undefined && body.presupuesto !== null) {
      if (isNaN(parseFloat(body.presupuesto)) || parseFloat(body.presupuesto) < 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'El presupuesto debe ser un número positivo'
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim()
    if (body.color !== undefined) updateData.color = body.color
    if (body.icono !== undefined) updateData.icono = body.icono || null
    if (body.presupuesto !== undefined) updateData.presupuesto = body.presupuesto ? parseFloat(body.presupuesto) : null

    const updatedCategoria = await updateCategoria(id, updateData)

    return NextResponse.json({
      success: true,
      data: updatedCategoria
    })

  } catch (error) {
    console.error('Error updating categoria:', error)
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ya existe una categoría con ese nombre'
        },
        { status: 409 }
      )
    }
    
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
    // Verify categoria exists
    const existingCategoria = await getCategoriaById(id)
    if (!existingCategoria) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Categoría no encontrada'
        },
        { status: 404 }
      )
    }

    await deleteCategoria(id)

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada correctamente'
    })

  } catch (error) {
    console.error('Error deleting categoria:', error)
    
    // Handle foreign key constraint (category is being used)
    if (error instanceof Error && (
      error.message.includes('Foreign key constraint') ||
      error.message.includes('foreign key')
    )) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No se puede eliminar la categoría porque está siendo utilizada por movimientos'
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}