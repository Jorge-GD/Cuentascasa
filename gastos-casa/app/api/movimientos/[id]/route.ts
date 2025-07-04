import { NextRequest, NextResponse } from 'next/server'
import { getMovimientoById, updateMovimiento, deleteMovimiento, createRegla } from '@/lib/db/queries'
import { CacheInvalidator } from '@/lib/redis/cache-modules'

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

    // Aprendizaje automático: si el usuario corrigió la categoría, crear regla
    if (body.categoria && body.categoria !== existingMovimiento.categoria) {
      await createAutoLearningRule(existingMovimiento, body.categoria, body.subcategoria)
    }

    // 🚀 INVALIDAR CACHE después de actualizar movimiento
    await CacheInvalidator.onMovimientoChange(updatedMovimiento.cuentaId, new Date(updatedMovimiento.fecha))

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

    // 🚀 INVALIDAR CACHE después de eliminar movimiento
    await CacheInvalidator.onMovimientoChange(existingMovimiento.cuentaId, new Date(existingMovimiento.fecha))

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

// Función para crear reglas automáticas basadas en correcciones del usuario
async function createAutoLearningRule(
  movimiento: any,
  nuevaCategoria: string,
  nuevaSubcategoria?: string
) {
  try {
    const descripcion = movimiento.descripcion.toUpperCase()
    let patron = ''
    let tipoCoincidencia: 'contiene' | 'regex' = 'contiene'
    
    // Extraer patrón inteligente de la descripción
    if (descripcion.includes('PAGO EN ')) {
      // Para pagos en establecimientos, extraer el nombre del establecimiento
      const match = descripcion.match(/PAGO EN ([A-Z\s]+?)(?:\s+\(|$)/)
      if (match) {
        patron = match[1].trim()
      }
    } else if (descripcion.includes('BIZUM')) {
      // Para BIZUM, usar patrón general
      patron = 'BIZUM'
    } else if (descripcion.includes('TRANSFERENCIA')) {
      // Para transferencias
      patron = 'TRANSFERENCIA'
    } else if (descripcion.includes('RETIRADA CAJERO')) {
      // Para cajeros
      patron = 'RETIRADA CAJERO'
    } else {
      // Para otros casos, extraer las primeras 2-3 palabras significativas
      const palabras = descripcion
        .split(' ')
        .filter(palabra => palabra.length > 2 && !['CON', 'POR', 'PARA', 'DEL', 'LAS', 'LOS'].includes(palabra))
        .slice(0, 3)
      
      if (palabras.length > 1) {
        patron = palabras.join('.*')
        tipoCoincidencia = 'regex'
      } else if (palabras.length === 1) {
        patron = palabras[0]
      } else {
        // Si no se puede extraer un patrón válido, no crear regla
        return
      }
    }
    
    if (patron) {
      // Verificar que el patrón no sea demasiado genérico
      if (patron.length < 3) return
      
      // Crear la regla automática
      await createRegla({
        nombre: `Auto-Aprendizaje: ${patron}`,
        patron,
        tipoCoincidencia,
        categoria: nuevaCategoria,
        subcategoria: nuevaSubcategoria,
        prioridad: 2, // Prioridad alta pero menor que las reglas predefinidas
        activa: true,
        cuentaId: movimiento.cuentaId
      })
      
      // 🚀 INVALIDAR CACHE después de crear regla automática
      await CacheInvalidator.onCategoriaChange()
      
      console.log(`Regla automática creada: ${patron} -> ${nuevaCategoria}/${nuevaSubcategoria}`)
    }
  } catch (error) {
    console.error('Error creando regla automática:', error)
    // No fallar la actualización del movimiento si no se puede crear la regla
  }
}