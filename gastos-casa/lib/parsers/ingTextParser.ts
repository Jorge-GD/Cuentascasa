import type { ParserResult, MovimientoRaw, ParserConfig, PatronTexto } from '../types/parser'

export class INGTextParser {
  private config: ParserConfig
  private patrones: PatronTexto[]

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      tolerarErroresFormato: true,
      ignorarDuplicados: false,
      validarSaldos: true,
      ...config
    }

    this.patrones = this.definirPatrones()
  }

  parse(texto: string): ParserResult {
    const errores: string[] = []
    const movimientos: MovimientoRaw[] = []

    try {
      // Limpiar y normalizar el texto
      const textoLimpio = this.limpiarTexto(texto)

      // Detectar formato
      const formatoDetectado = this.detectarFormato(textoLimpio)
      
      if (!formatoDetectado) {
        errores.push('No se pudo detectar el formato del texto como extracto de ING')
        return {
          movimientos: [],
          formatoDetectado: 'ING_TEXT',
          errores
        }
      }

      // Parsear movimientos según el formato detectado
      const movimientosParsed = this.parsearSegunFormato(textoLimpio, formatoDetectado)
      movimientos.push(...movimientosParsed)

      // Extraer metadata
      const metadata = this.extraerMetadata(textoLimpio)

      return {
        movimientos,
        formatoDetectado: 'ING_TEXT',
        errores,
        metadata
      }

    } catch (error) {
      errores.push(`Error al procesar texto: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      return {
        movimientos: [],
        formatoDetectado: 'ING_TEXT',
        errores
      }
    }
  }

  private definirPatrones(): PatronTexto[] {
    return [
      // Patrón 1: Formato completo con EUR
      {
        nombre: 'formato_completo_eur',
        regex: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d+(?:\.\d{3})*,\d{2})\s+EUR\s+(\d+(?:\.\d{3})*,\d{2})\s+EUR/gm,
        grupos: {
          fecha: 1,
          descripcion: 2,
          importe: 3,
          saldo: 4
        }
      },
      // Patrón 2: Formato sin EUR
      {
        nombre: 'formato_sin_eur',
        regex: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d+(?:\.\d{3})*,\d{2})\s+(\d+(?:\.\d{3})*,\d{2})$/gm,
        grupos: {
          fecha: 1,
          descripcion: 2,
          importe: 3,
          saldo: 4
        }
      },
      // Patrón 3: Formato con tabs
      {
        nombre: 'formato_tabs',
        regex: /^(\d{2}\/\d{2}\/\d{4})\t(.+?)\t(-?\d+(?:\.\d{3})*,\d{2})\t(\d+(?:\.\d{3})*,\d{2})/gm,
        grupos: {
          fecha: 1,
          descripcion: 2,
          importe: 3,
          saldo: 4
        }
      },
      // Patrón 4: Formato CSV
      {
        nombre: 'formato_csv',
        regex: /^"?(\d{2}\/\d{2}\/\d{4})"?[,;]"?(.+?)"?[,;]"?(-?\d+(?:\.\d{3})*,\d{2})"?[,;]"?(\d+(?:\.\d{3})*,\d{2})"?/gm,
        grupos: {
          fecha: 1,
          descripcion: 2,
          importe: 3,
          saldo: 4
        }
      }
    ]
  }

  private limpiarTexto(texto: string): string {
    return texto
      .trim()
      .replace(/\r\n/g, '\n') // Normalizar saltos de línea
      .replace(/\r/g, '\n')
      .replace(/\n\n+/g, '\n') // Eliminar líneas vacías múltiples
  }

  private detectarFormato(texto: string): string | null {
    // Verificar indicadores de ING
    const indicadoresING = [
      'ING DIRECT',
      'ing.es',
      'Cuenta NÓMINA',
      'Cuenta NARANJA',
      'Saldo inicial',
      'Saldo final'
    ]

    const esING = indicadoresING.some(indicador => 
      texto.toLowerCase().includes(indicador.toLowerCase())
    )

    if (!esING) {
      // Si no encontramos indicadores explícitos, verificar por formato de datos
      const tieneFechas = /\d{2}\/\d{2}\/\d{4}/.test(texto)
      const tieneImportes = /-?\d+(?:\.\d{3})*,\d{2}/.test(texto)
      
      if (!tieneFechas || !tieneImportes) {
        return null
      }
    }

    // Detectar el patrón que mejor coincide
    for (const patron of this.patrones) {
      const matches = Array.from(texto.matchAll(patron.regex))
      if (matches.length > 0) {
        return patron.nombre
      }
    }

    return 'formato_generico'
  }

  private parsearSegunFormato(texto: string, formato: string): MovimientoRaw[] {
    const movimientos: MovimientoRaw[] = []
    
    // Buscar el patrón correspondiente
    const patron = this.patrones.find(p => p.nombre === formato)
    
    if (!patron) {
      // Fallback: intentar parsear línea por línea
      return this.parsearGenerico(texto)
    }

    const matches = Array.from(texto.matchAll(patron.regex))

    for (const match of matches) {
      try {
        const fechaStr = match[patron.grupos.fecha]
        const descripcion = match[patron.grupos.descripcion]
        const importeStr = match[patron.grupos.importe]
        const saldoStr = match[patron.grupos.saldo]

        // Validar que tenemos los datos mínimos
        if (!fechaStr || !descripcion || !importeStr || !saldoStr) {
          continue
        }

        const movimiento: MovimientoRaw = {
          fecha: this.convertirFecha(fechaStr).toISOString(),
          descripcion: this.limpiarDescripcion(descripcion),
          importe: this.convertirImporte(importeStr),
          saldo: this.convertirImporte(saldoStr)
        }

        // Detectar categoría si está presente
        const categoria = this.detectarCategoria(descripcion)
        if (categoria.categoriaING) {
          movimiento.categoriaING = categoria.categoriaING
        }
        if (categoria.subcategoriaING) {
          movimiento.subcategoriaING = categoria.subcategoriaING
        }

        movimientos.push(movimiento)

      } catch (error) {
        if (!this.config.tolerarErroresFormato) {
          throw error
        }
        // Continuar con el siguiente movimiento
        console.warn(`Error parseando movimiento: ${match[0]}`)
      }
    }

    return movimientos
  }

  private parsearGenerico(texto: string): MovimientoRaw[] {
    const movimientos: MovimientoRaw[] = []
    const lineas = texto.split('\n')

    for (const linea of lineas) {
      const lineaLimpia = linea.trim()
      if (!lineaLimpia) continue

      // Intentar extraer fecha, descripción e importe de cualquier formato
      const fechaMatch = lineaLimpia.match(/(\d{2}\/\d{2}\/\d{4})/)
      const importeMatch = lineaLimpia.match(/(-?\d+(?:\.\d{3})*,\d{2})/g)

      if (fechaMatch && importeMatch && importeMatch.length >= 2) {
        try {
          const fecha = this.convertirFecha(fechaMatch[1])
          const importe = this.convertirImporte(importeMatch[0])
          const saldo = this.convertirImporte(importeMatch[1])
          
          // La descripción es todo lo que está entre la fecha y el primer importe
          const descripcionMatch = lineaLimpia.match(new RegExp(
            `${fechaMatch[1]}\\s+(.+?)\\s+${importeMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
          ))
          
          const descripcion = descripcionMatch ? descripcionMatch[1] : 'Descripción no disponible'

          const movimiento: MovimientoRaw = {
            fecha: fecha.toISOString(),
            descripcion: this.limpiarDescripcion(descripcion),
            importe,
            saldo
          }

          movimientos.push(movimiento)

        } catch (error) {
          if (!this.config.tolerarErroresFormato) {
            throw new Error(`Error en línea: ${lineaLimpia}`)
          }
        }
      }
    }

    return movimientos
  }

  private convertirFecha(fechaStr: string): Date {
    const [dia, mes, año] = fechaStr.split('/').map(Number)
    const fecha = new Date(año, mes - 1, dia)
    
    if (isNaN(fecha.getTime())) {
      throw new Error(`Fecha inválida: ${fechaStr}`)
    }
    
    return fecha
  }

  private convertirImporte(importeStr: string): number {
    const numeroStr = importeStr
      .replace(/"/g, '') // Quitar comillas
      .replace(/\./g, '') // Quitar separadores de miles
      .replace(',', '.') // Cambiar coma decimal por punto
    
    const numero = parseFloat(numeroStr)
    
    if (isNaN(numero)) {
      throw new Error(`Importe inválido: ${importeStr}`)
    }
    
    return numero
  }

  private limpiarDescripcion(descripcion: string): string {
    return descripcion
      .trim()
      .replace(/"/g, '') // Quitar comillas
      .replace(/\s+/g, ' ') // Normalizar espacios
      .replace(/^\*+|\*+$/g, '') // Quitar asteriscos
  }

  private detectarCategoria(descripcion: string): { categoriaING?: string; subcategoriaING?: string } {
    const desc = descripcion.toUpperCase()

    // Patrones comunes en descripciones de ING
    const patrones = [
      { regex: /BIZUM\s+(ENVIADO|RECIBIDO)/i, categoria: 'Bizum', subcategoria: 'Transferencia' },
      { regex: /MERCADONA/i, categoria: 'Alimentación', subcategoria: 'Supermercado' },
      { regex: /(REPSOL|BP|CEPSA|SHELL)/i, categoria: 'Transporte', subcategoria: 'Gasolina' },
      { regex: /AMAZON/i, categoria: 'Compras Online', subcategoria: 'Amazon' },
      { regex: /RETIRADA\s+CAJERO/i, categoria: 'Efectivo', subcategoria: 'Cajero' },
      { regex: /TRANSFERENCIA/i, categoria: 'Transferencias', subcategoria: 'Transferencia' },
      { regex: /RECIBO/i, categoria: 'Gastos Fijos', subcategoria: 'Recibo' },
      { regex: /NOMINA/i, categoria: 'Ingresos', subcategoria: 'Nómina' }
    ]

    for (const patron of patrones) {
      if (patron.regex.test(descripcion)) {
        return {
          categoriaING: patron.categoria,
          subcategoriaING: patron.subcategoria
        }
      }
    }

    return {}
  }

  private extraerMetadata(texto: string) {
    const metadata: any = {}

    // Buscar fechas del período
    const fechaRegex = /(?:del|desde)\s+(\d{2}\/\d{2}\/\d{4})\s+(?:al|hasta)\s+(\d{2}\/\d{2}\/\d{4})/i
    const fechasMatch = texto.match(fechaRegex)
    
    if (fechasMatch) {
      metadata.fechaInicio = fechasMatch[1]
      metadata.fechaFin = fechasMatch[2]
    }

    // Contar total de movimientos detectados
    const lineasMovimiento = texto.split('\n').filter(linea => 
      /\d{2}\/\d{2}\/\d{4}/.test(linea) && /-?\d+(?:\.\d{3})*,\d{2}/.test(linea)
    )
    
    metadata.totalMovimientos = lineasMovimiento.length

    return metadata
  }
}

// Export convenience function
export function parseINGText(text: string): ParserResult {
  const parser = new INGTextParser()
  return parser.parse(text)
}