import { NextRequest, NextResponse } from 'next/server'
import { CacheInvalidator } from '@/lib/redis/cache-modules'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { prisma } = await import('@/lib/db/prisma')
    const regla = await prisma.reglaCategorizacion.findUnique({
      where: { id }
    })
    
    if (!regla) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Regla no encontrada'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: regla
    })

  } catch (error) {
    console.error('Error fetching regla:', error)
    
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
    const { prisma } = await import('@/lib/db/prisma')
    const body = await request.json()
    
    // Verify regla exists
    const existingRegla = await prisma.reglaCategorizacion.findUnique({
      where: { id }
    })
    
    if (!existingRegla) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Regla no encontrada'
        },
        { status: 404 }
      )
    }

    // Validate tipo coincidencia if provided
    if (body.tipoCoincidencia) {
      const validTypes = ['contiene', 'empieza', 'termina', 'regex', 'exacto']
      if (!validTypes.includes(body.tipoCoincidencia)) {
        return NextResponse.json(
          { 
            success: false,
            error: `Tipo de coincidencia inválido. Debe ser uno de: ${validTypes.join(', ')}`
          },
          { status: 400 }
        )
      }
    }

    // Validate regex if tipo is 'regex'
    if (body.tipoCoincidencia === 'regex' && body.patron) {
      try {
        new RegExp(body.patron)
      } catch (regexError) {
        return NextResponse.json(
          { 
            success: false,
            error: 'El patrón regex no es válido'
          },
          { status: 400 }
        )
      }
    }

    // Validate priority if provided
    if (body.prioridad !== undefined && (isNaN(parseInt(body.prioridad)) || parseInt(body.prioridad) < 1)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'La prioridad debe ser un número entero positivo'
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim()
    if (body.patron !== undefined) updateData.patron = body.patron.trim()
    if (body.tipoCoincidencia !== undefined) updateData.tipoCoincidencia = body.tipoCoincidencia
    if (body.categoria !== undefined) updateData.categoria = body.categoria
    if (body.subcategoria !== undefined) updateData.subcategoria = body.subcategoria || null
    if (body.prioridad !== undefined) updateData.prioridad = parseInt(body.prioridad)
    if (body.activa !== undefined) updateData.activa = body.activa
    if (body.cuentaId !== undefined) updateData.cuentaId = body.cuentaId || null

    const updatedRegla = await prisma.reglaCategorizacion.update({
      where: { id },
      data: updateData
    })

    // Invalidar cache después de actualizar regla
    await CacheInvalidator.onReglaChange(updatedRegla.cuentaId || undefined)

    return NextResponse.json({
      success: true,
      data: updatedRegla
    })

  } catch (error) {
    console.error('Error updating regla:', error)
    
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
    const { prisma } = await import('@/lib/db/prisma')
    
    // Verify regla exists
    const existingRegla = await prisma.reglaCategorizacion.findUnique({
      where: { id }
    })
    
    if (!existingRegla) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Regla no encontrada'
        },
        { status: 404 }
      )
    }

    await prisma.reglaCategorizacion.delete({
      where: { id }
    })

    // Invalidar cache después de eliminar regla
    await CacheInvalidator.onReglaChange(existingRegla.cuentaId || undefined)

    return NextResponse.json({
      success: true,
      message: 'Regla eliminada correctamente'
    })

  } catch (error) {
    console.error('Error deleting regla:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}