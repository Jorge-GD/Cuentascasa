import { NextRequest, NextResponse } from 'next/server'
import { createMovimiento, getMovimientosByCuenta } from '@/lib/db/queries'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'
import { DuplicateDetector } from '@/lib/utils/duplicateDetection'
import type { MovimientoRaw } from '@/lib/types/parser'
import { generateMovimientoHash } from '@/lib/utils/movimientoHash'
import { aplicarCategorizacionInteligente } from '@/lib/utils/categorizacionInteligente'

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

    // Aplicar categorización inteligente mejorada para el plan 50/30/20
    const movimientosConCategorizacionInteligente = aplicarCategorizacionInteligente(
      movimientos.map(m => ({
        descripcion: m.descripcion,
        importe: m.importe,
        categoria: m.categoriaDetectada,
        subcategoria: m.subcategoriaDetectada
      }))
    );

    // Actualizar movimientos con categorización mejorada
    const movimientosMejorados = movimientos.map((mov, index) => ({
      ...mov,
      categoriaDetectada: movimientosConCategorizacionInteligente[index].categoria || mov.categoriaDetectada,
      subcategoriaDetectada: movimientosConCategorizacionInteligente[index].subcategoria || mov.subcategoriaDetectada
    }));

    // Obtener movimientos existentes de la cuenta para detectar duplicados
    const existingMovimientos = await getMovimientosByCuenta(cuentaId)
    const detector = new DuplicateDetector(existingMovimientos)
    
    const importedMovimientos = []
    const errors = []
    const skippedDuplicates = []

    // Importar movimientos uno por uno
    for (let i = 0; i < movimientosMejorados.length; i++) {
      const movimiento = movimientosMejorados[i]
      
      try {
        // Verificar si es duplicado antes de guardar
        const movimientoRaw: MovimientoRaw = {
          fecha: movimiento.fecha,
          descripcion: movimiento.descripcion,
          importe: movimiento.importe,
          saldo: movimiento.saldo || undefined,
          categoriaING: movimiento.categoriaING,
          subcategoriaING: movimiento.subcategoriaING
        }
        
        const duplicateResult = detector.detectDuplicate(movimientoRaw)
        
        // Si es duplicado con alta confianza (>80%), saltar
        if (duplicateResult.isDuplicate && duplicateResult.confidence > 80) {
          skippedDuplicates.push({
            index: i,
            movimiento: movimiento.descripcion,
            confidence: duplicateResult.confidence,
            reason: duplicateResult.reason,
            matchedMovimiento: duplicateResult.matchedMovimiento
          })
          continue
        }
        
        // Si es posible duplicado (50-80%), incluir advertencia pero permitir importar
        const isDubiousDuplicate = duplicateResult.isDuplicate && 
                                  duplicateResult.confidence >= 50 && 
                                  duplicateResult.confidence <= 80
        
        // Generar hash único para el movimiento
        const hash = generateMovimientoHash(
          movimiento.fecha,
          movimiento.importe,
          movimiento.descripcion,
          cuentaId
        )
        
        const newMovimiento = await createMovimiento({
          fecha: new Date(movimiento.fecha),
          descripcion: movimiento.descripcion,
          importe: movimiento.importe,
          saldo: movimiento.saldo || null,
          hash: hash,
          categoriaING: movimiento.categoriaING || null,
          subcategoriaING: movimiento.subcategoriaING || null,
          categoria: movimiento.categoriaDetectada || 'Sin categorizar',
          subcategoria: movimiento.subcategoriaDetectada || null,
          esManual: false,
          cuenta: {
            connect: { id: cuentaId }
          }
        })

        importedMovimientos.push({
          ...newMovimiento,
          warning: isDubiousDuplicate ? duplicateResult.reason : undefined
        })
      } catch (error) {
        console.error(`Error importing movimiento ${i}:`, error)
        
        // Si es un error de unicidad del hash, es un duplicado exacto
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          skippedDuplicates.push({
            index: i,
            movimiento: movimiento.descripcion,
            confidence: 100,
            reason: 'Movimiento exactamente duplicado (mismo hash)',
            error: 'Duplicado exacto'
          })
        } else {
          errors.push({
            index: i,
            movimiento: movimiento.descripcion,
            error: error instanceof Error ? error.message : 'Error desconocido'
          })
        }
      }
    }

    // Preparar respuesta
    const response = {
      success: true,
      data: {
        imported: importedMovimientos.length,
        skipped: skippedDuplicates.length,
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
    
    if (skippedDuplicates.length > 0) {
      response.data = {
        ...response.data,
        skippedDuplicates: skippedDuplicates
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