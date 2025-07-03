import { NextRequest, NextResponse } from 'next/server'
import { createMovimiento } from '@/lib/db/queries'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { movimientos, cuentaId } = body as { movimientos: CategorizedMovimiento[], cuentaId: string }

    if (!movimientos || !Array.isArray(movimientos) || movimientos.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Se requiere un array de movimientos'
        },
        { status: 400 }
      )
    }

    if (!cuentaId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Se requiere cuentaId'
        },
        { status: 400 }
      )
    }

    // Validar que todos los movimientos tengan los campos requeridos
    const invalidMovimientos = movimientos.filter(mov => 
      !mov.fecha || 
      !mov.descripcion || 
      mov.importe === undefined || 
      !mov.categoriaDetectada
    )

    if (invalidMovimientos.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: `${invalidMovimientos.length} movimientos tienen campos faltantes`
        },
        { status: 400 }
      )
    }

    const importedMovimientos = []
    const errors = []

    // Importar movimientos uno por uno
    for (let i = 0; i < movimientos.length; i++) {
      const movimiento = movimientos[i]
      
      try {
        const newMovimiento = await createMovimiento({
          fecha: new Date(movimiento.fecha),
          descripcion: movimiento.descripcion,
          importe: movimiento.importe,
          saldo: movimiento.saldo || null,
          categoriaING: movimiento.categoriaING || null,
          subcategoriaING: movimiento.subcategoriaING || null,
          categoria: movimiento.categoriaDetectada || 'Sin categorizar',
          subcategoria: movimiento.subcategoriaDetectada || null,
          esManual: false,
          cuenta: {
            connect: { id: cuentaId }
          }
        })

        importedMovimientos.push(newMovimiento)
      } catch (error) {
        console.error(`Error importing movimiento ${i}:`, error)
        errors.push({
          index: i,
          movimiento: movimiento.descripcion,
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    // Preparar respuesta
    const response = {
      success: true,
      data: {
        imported: importedMovimientos.length,
        total: movimientos.length,
        errors: errors.length,
        movimientos: importedMovimientos
      }
    }

    if (errors.length > 0) {
      response.data = {
        ...response.data,
        errorDetails: errors
      } as any
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in import endpoint:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}