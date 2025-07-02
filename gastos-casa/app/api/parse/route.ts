import { NextRequest, NextResponse } from 'next/server'
import { INGPdfParser } from '@/lib/parsers/ingPdfParser'
import { INGTextParser } from '@/lib/parsers/ingTextParser'
import { MovimientoValidator } from '@/lib/parsers/validator'
import type { ParserResult, ParserConfig } from '@/lib/types/parser'

// Configuración para manejar archivos
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // Configuración del parser
    const config: Partial<ParserConfig> = {
      tolerarErroresFormato: true,
      ignorarDuplicados: false,
      validarSaldos: true
    }

    let result: ParserResult

    if (contentType.includes('multipart/form-data')) {
      // Procesar archivo PDF
      result = await procesarArchivoPDF(request, config)
    } else if (contentType.includes('application/json')) {
      // Procesar texto
      result = await procesarTexto(request, config)
    } else {
      return NextResponse.json(
        { error: 'Tipo de contenido no soportado' },
        { status: 400 }
      )
    }

    // Validar movimientos parseados
    if (result.movimientos.length > 0) {
      const validator = new MovimientoValidator(config)
      const validationResult = validator.validateAndClean(result.movimientos)
      
      result.movimientos = validationResult.movimientosLimpios
      result.errores.push(...validationResult.errores)
      
      // Añadir advertencias como errores no críticos
      if (validationResult.advertencias.length > 0) {
        result.errores.push(...validationResult.advertencias.map(a => `Advertencia: ${a}`))
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error en parser:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}

async function procesarArchivoPDF(request: NextRequest, config: Partial<ParserConfig>): Promise<ParserResult> {
  const formData = await request.formData()
  const archivo = formData.get('archivo') as File

  if (!archivo) {
    throw new Error('No se proporcionó ningún archivo')
  }

  if (archivo.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF')
  }

  // Verificar tamaño del archivo (máximo 10MB)
  const maxSize = 10 * 1024 * 1024
  if (archivo.size > maxSize) {
    throw new Error('El archivo es demasiado grande (máximo 10MB)')
  }

  // Convertir archivo a buffer
  const arrayBuffer = await archivo.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Parsear PDF
  const parser = new INGPdfParser(config)
  const result = await parser.parse(buffer)

  // Añadir metadata del archivo
  if (result.metadata) {
    result.metadata.nombreArchivo = archivo.name
    result.metadata.tamaño = archivo.size
    result.metadata.fechaProcesamiento = new Date().toISOString()
  }

  return result
}

async function procesarTexto(request: NextRequest, config: Partial<ParserConfig>): Promise<ParserResult> {
  const body = await request.json()
  
  if (!body.texto) {
    throw new Error('No se proporcionó texto para parsear')
  }

  if (typeof body.texto !== 'string') {
    throw new Error('El texto debe ser una cadena de caracteres')
  }

  // Verificar longitud del texto
  if (body.texto.length > 1000000) { // 1MB de texto
    throw new Error('El texto es demasiado largo')
  }

  if (body.texto.trim().length < 50) {
    throw new Error('El texto es demasiado corto para contener movimientos bancarios')
  }

  // Parsear texto
  const parser = new INGTextParser(config)
  const result = parser.parse(body.texto)

  // Añadir metadata
  if (result.metadata) {
    result.metadata.longitudTexto = body.texto.length
    result.metadata.fechaProcesamiento = new Date().toISOString()
  }

  return result
}

// Endpoint GET para obtener información sobre el parser
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      formatos_soportados: ['PDF', 'TEXT'],
      bancos_soportados: ['ING'],
      configuracion: {
        tamaño_maximo_pdf: '10MB',
        longitud_maxima_texto: '1MB',
        validacion_saldos: true,
        deteccion_duplicados: true
      },
      uso: {
        pdf: {
          method: 'POST',
          content_type: 'multipart/form-data',
          campo_archivo: 'archivo'
        },
        texto: {
          method: 'POST',
          content_type: 'application/json',
          campo_texto: 'texto'
        }
      }
    }
  })
}