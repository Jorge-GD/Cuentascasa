import { NextRequest, NextResponse } from 'next/server'
import { parseINGPdf } from '@/lib/parsers/ingPdfParser'
import { parseINGText } from '@/lib/parsers/ingTextParser'
import { INGXlsxParser } from '@/lib/parsers/ingXlsxParser'
import { CategorizationEngine } from '@/lib/categorization/engine'
import { DuplicateDetector } from '@/lib/utils/duplicateDetection'
import { getMovimientosByCuenta } from '@/lib/db/queries'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const type = formData.get('type') as string
    const cuentaId = formData.get('cuentaId') as string

    if (!type || !cuentaId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Faltan parámetros requeridos: type, cuentaId'
        },
        { status: 400 }
      )
    }

    let rawMovimientos

    // Parse según el tipo
    if (type === 'pdf') {
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No se proporcionó archivo PDF' },
          { status: 400 }
        )
      }

      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { success: false, error: 'El archivo debe ser un PDF' },
          { status: 400 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const parseResult = await parseINGPdf(buffer)
      
      if (parseResult.errores.length > 0) {
        return NextResponse.json(
          { success: false, error: parseResult.errores.join('; ') },
          { status: 400 }
        )
      }

      rawMovimientos = parseResult.movimientos
    } else if (type === 'xlsx') {
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No se proporcionó archivo XLSX' },
          { status: 400 }
        )
      }

      // Validar tipo de archivo XLSX
      const isXlsxFile = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        file.type === 'application/vnd.ms-excel' ||
                        file.name.toLowerCase().endsWith('.xlsx') ||
                        file.name.toLowerCase().endsWith('.xls')
      
      if (!isXlsxFile) {
        return NextResponse.json(
          { success: false, error: 'El archivo debe ser un XLSX/XLS' },
          { status: 400 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const xlsxParser = new INGXlsxParser()
      const parseResult = await xlsxParser.parse(buffer)
      
      if (parseResult.errores.length > 0) {
        return NextResponse.json(
          { success: false, error: parseResult.errores.join('; ') },
          { status: 400 }
        )
      }

      rawMovimientos = parseResult.movimientos
    } else if (type === 'text') {
      const text = formData.get('text') as string
      if (!text?.trim()) {
        return NextResponse.json(
          { success: false, error: 'No se proporcionó texto' },
          { status: 400 }
        )
      }

      const parseResult = parseINGText(text)
      
      if (parseResult.errores.length > 0) {
        return NextResponse.json(
          { success: false, error: parseResult.errores.join('; ') },
          { status: 400 }
        )
      }

      rawMovimientos = parseResult.movimientos
    } else {
      return NextResponse.json(
        { success: false, error: 'Tipo no válido. Use "pdf" o "text"' },
        { status: 400 }
      )
    }

    if (!rawMovimientos || rawMovimientos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron movimientos en el archivo' },
        { status: 400 }
      )
    }

    // Obtener movimientos existentes para detección de duplicados
    const existingMovimientos = await getMovimientosByCuenta(cuentaId)

    // Detectar duplicados
    const duplicateDetector = new DuplicateDetector(existingMovimientos)
    const duplicateResults = duplicateDetector.detectBatchDuplicates(rawMovimientos)

    // Aplicar categorización automática
    const categorizationEngine = new CategorizationEngine()
    const categorizedMovimientos = categorizationEngine.categorizeMovimientos(rawMovimientos)

    // Ajustar confianza basada en detección de duplicados
    const finalMovimientos = categorizedMovimientos.map((movimiento, index) => {
      const duplicateResult = duplicateResults.get(index)
      if (duplicateResult && duplicateResult.isDuplicate) {
        // Reducir confianza significativamente si es duplicado
        return {
          ...movimiento,
          confianza: Math.min(movimiento.confianza, 30),
          reglaAplicada: `${movimiento.reglaAplicada} (Posible duplicado: ${duplicateResult.reason})`
        }
      }
      return movimiento
    })

    // Estadísticas
    const stats = {
      total: finalMovimientos.length,
      duplicados: Array.from(duplicateResults.values()).filter(r => r.isDuplicate).length,
      confianzaAlta: finalMovimientos.filter(m => m.confianza >= 80).length,
      confianzaMedia: finalMovimientos.filter(m => m.confianza >= 60 && m.confianza < 80).length,
      confianzaBaja: finalMovimientos.filter(m => m.confianza < 60).length,
    }

    return NextResponse.json({
      success: true,
      data: {
        movimientos: finalMovimientos,
        stats,
        duplicateInfo: Object.fromEntries(duplicateResults)
      }
    })

  } catch (error) {
    console.error('Error in preview endpoint:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}