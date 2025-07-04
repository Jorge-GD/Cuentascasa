import type { ParserResult, MovimientoRaw, ParserConfig, PatronTexto } from '../types/parser'

export class INGTextParser {
  private config: ParserConfig
  private patrones: PatronTexto[]

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      tolerarErroresFormato: true, // Cambiar a true por defecto
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

      // Validar saldos si está habilitado
      if (this.config.validarSaldos && movimientos.length > 1) {
        this.validarSaldos(movimientos, errores)
      }

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
    const numeroStr = importeStr.replace(/"/g, '').trim()

    // Formato español: 1.234,56
    if (numeroStr.includes(',')) {
      const cleanStr = numeroStr.replace(/\./g, '').replace(',', '.')
      const num = parseFloat(cleanStr)
      if (!isNaN(num)) return num
    }

    // Formato ambiguo con puntos: 1.500 (mil quinientos) vs 1.500 (uno punto cinco)
    const dotIndex = numeroStr.lastIndexOf('.')
    if (dotIndex !== -1 && numeroStr.length - dotIndex - 1 === 3 && !numeroStr.includes(',')) {
      const pointParts = numeroStr.split('.')
      if (pointParts.length > 1) {
        const cleanStr = numeroStr.replace(/\./g, '')
        const num = parseFloat(cleanStr)
        if (!isNaN(num)) return num
      }
    }
    
    // Fallback para formato americano (1,234.56) o entero
    const numero = parseFloat(numeroStr.replace(/,/g, ''))
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

  private validarSaldos(movimientos: MovimientoRaw[], errores: string[]): void {
    // Ordenar movimientos por fecha para validación secuencial
    const movimientosOrdenados = [...movimientos].sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )

    const inconsistencias: Array<{
      indice: number
      fecha: string
      descripcion: string
      saldoAnterior: number
      importe: number
      saldoEsperado: number
      saldoReal: number
      diferencia: number
    }> = []

    for (let i = 1; i < movimientosOrdenados.length; i++) {
      const anterior = movimientosOrdenados[i - 1]
      const actual = movimientosOrdenados[i]

      // Solo validar si ambos saldos son válidos (no 0 por defecto)
      if (anterior.saldo !== 0 && actual.saldo !== 0) {
        const saldoCalculado = anterior.saldo + actual.importe
        const diferencia = Math.abs(saldoCalculado - actual.saldo)

        // Aumentar tolerancia para manejar errores de redondeo y pequeñas inconsistencias
        if (diferencia > 0.02) { // Tolerancia de 2 céntimos
          inconsistencias.push({
            indice: i + 1,
            fecha: new Date(actual.fecha).toLocaleDateString('es-ES'),
            descripcion: actual.descripcion.substring(0, 50) + (actual.descripcion.length > 50 ? '...' : ''),
            saldoAnterior: anterior.saldo,
            importe: actual.importe,
            saldoEsperado: saldoCalculado,
            saldoReal: actual.saldo,
            diferencia
          })
        }
      }
    }

    if (inconsistencias.length > 0) {
      // Mostrar resumen inicial
      errores.push(`🔍 VALIDACIÓN DE SALDOS - Se encontraron ${inconsistencias.length} inconsistencias:`)
      
      // Agrupar por tipo de diferencia
      const menores = inconsistencias.filter(inc => inc.diferencia <= 1.00)
      const mayores = inconsistencias.filter(inc => inc.diferencia > 1.00)
      
      if (mayores.length > 0) {
        errores.push(`❌ ERRORES GRAVES (diferencia > 1€): ${mayores.length}`)
        mayores.slice(0, 10).forEach(inc => {
          errores.push(`   • Mov ${inc.indice} (${inc.fecha}): ${inc.descripcion} | Esperado: ${inc.saldoEsperado.toFixed(2)}€ | Real: ${inc.saldoReal.toFixed(2)}€ | Diff: ${inc.diferencia.toFixed(2)}€`)
        })
        if (mayores.length > 10) {
          errores.push(`   ... y ${mayores.length - 10} errores graves más`)
        }
      }
      
      if (menores.length > 0) {
        errores.push(`⚠️ ADVERTENCIAS MENORES (diferencia ≤ 1€): ${menores.length}`)
        menores.slice(0, 5).forEach(inc => {
          errores.push(`   • Mov ${inc.indice} (${inc.fecha}): ${inc.descripcion} | Diff: ${inc.diferencia.toFixed(2)}€`)
        })
        if (menores.length > 5) {
          errores.push(`   ... y ${menores.length - 5} advertencias menores más`)
        }
      }
      
      // Añadir explicación
      errores.push(`💡 POSIBLES CAUSAS: Movimientos faltantes, errores en el archivo original, o períodos parciales`)
    }
  }
}

// Export convenience function
export function parseINGText(text: string): ParserResult {
  const parser = new INGTextParser()
  return parser.parse(text)
}