import { NextRequest, NextResponse } from 'next/server'
import { CategorizationEngine } from '@/lib/categorization/engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.descripcion) {
      return NextResponse.json(
        { 
          success: false,
          error: 'La descripción es requerida para probar las reglas'
        },
        { status: 400 }
      )
    }

    // Get rules for account if provided
    const cuentaId = body.cuentaId || null
    
    // Create categorization engine instance
    const engine = new CategorizationEngine()
    
    // Test categorization
    const result = await engine.categorize({
      descripcion: body.descripcion,
      importe: body.importe || -10.00,
      fecha: body.fecha || new Date().toISOString(),
      saldo: 1000.00 // Dummy saldo for testing
    }, cuentaId)

    // Get all matching rules with details
    const matchingRules = await engine.getMatchingRules(body.descripcion, cuentaId)

    return NextResponse.json({
      success: true,
      data: {
        categoria: result.categoria,
        subcategoria: result.subcategoria,
        confianza: result.confianza,
        reglaAplicada: result.reglaAplicada,
        todasLasReglas: matchingRules
      }
    })

  } catch (error) {
    console.error('Error testing rules:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}