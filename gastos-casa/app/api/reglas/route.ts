import { NextRequest, NextResponse } from 'next/server'
import { getReglas, createRegla } from '@/lib/db/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaId = searchParams.get('cuentaId')

    const reglas = await getReglas(cuentaId || undefined)

    return NextResponse.json({
      success: true,
      data: reglas
    })

  } catch (error) {
    console.error('Error fetching reglas:', error)
    
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
    const requiredFields = ['nombre', 'patron', 'tipoCoincidencia', 'categoria', 'prioridad']
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

    // Validate tipo coincidencia
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

    // Validate regex if tipo is 'regex'
    if (body.tipoCoincidencia === 'regex') {
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

    // Validate priority
    if (isNaN(parseInt(body.prioridad)) || parseInt(body.prioridad) < 1) {
      return NextResponse.json(
        { 
          success: false,
          error: 'La prioridad debe ser un número entero positivo'
        },
        { status: 400 }
      )
    }

    const newRegla = await createRegla({
      nombre: body.nombre.trim(),
      patron: body.patron.trim(),
      tipoCoincidencia: body.tipoCoincidencia,
      categoria: body.categoria,
      subcategoria: body.subcategoria || null,
      prioridad: parseInt(body.prioridad),
      activa: body.activa !== undefined ? body.activa : true,
      cuentaId: body.cuentaId || null
    })

    return NextResponse.json({
      success: true,
      data: newRegla
    })

  } catch (error) {
    console.error('Error creating regla:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}