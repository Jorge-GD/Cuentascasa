import { NextRequest, NextResponse } from 'next/server'
import { createSubcategoria } from '@/lib/db/queries'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['nombre', 'categoriaId']
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

    const newSubcategoria = await createSubcategoria({
      nombre: body.nombre.trim(),
      categoriaId: body.categoriaId
    })

    return NextResponse.json({
      success: true,
      data: newSubcategoria
    })

  } catch (error) {
    console.error('Error creating subcategoria:', error)
    
    // Handle unique constraint violation (if exists)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ya existe una subcategoría con ese nombre en esta categoría'
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