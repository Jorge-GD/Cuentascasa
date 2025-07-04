import { NextRequest, NextResponse } from 'next/server'
import { getCategorias, createCategoria } from '@/lib/db/queries'
import { CategoriesCache, CacheInvalidator } from '@/lib/redis/cache-modules'

export async function GET(request: NextRequest) {
  try {
    // 🚀 USAR CACHE REDIS - Esta línea cambia todo!
    const categorias = await CategoriesCache.getAll()

    return NextResponse.json({
      success: true,
      data: categorias,
      cached: true // Indicar que viene del cache
    })

  } catch (error) {
    console.error('Error fetching categorias:', error)
    
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
    const requiredFields = ['nombre', 'color']
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

    // Validate color format (hex color)
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

    const newCategoria = await createCategoria({
      nombre: body.nombre.trim(),
      color: body.color,
      icono: body.icono || null,
      presupuesto: body.presupuesto ? parseFloat(body.presupuesto) : null
    })

    // 🚀 INVALIDAR CACHE después de crear categoría
    await CacheInvalidator.onCategoriaChange()

    return NextResponse.json({
      success: true,
      data: newCategoria
    })

  } catch (error) {
    console.error('Error creating categoria:', error)
    
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