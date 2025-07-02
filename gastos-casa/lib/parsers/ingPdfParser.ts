// Import PDF parse dynamically to avoid build issues
import type { ParserResult, MovimientoRaw, ParserConfig, ErrorParser, TipoErrorParser } from '../types/parser'

export class INGPdfParser {
  private config: ParserConfig

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      tolerarErroresFormato: false,
      ignorarDuplicados: false,
      validarSaldos: true,
      ...config
    }
  }

  async parse(pdfBuffer: Buffer): Promise<ParserResult> {
    const errores: string[] = []
    const movimientos: MovimientoRaw[] = []

    try {
      // Dynamically import pdf-parse to avoid build issues
      const pdfParse = (await import('pdf-parse')).default
      
      // Extraer texto del PDF
      const data = await pdfParse(pdfBuffer)
      const texto = data.text

      // Detectar si es un extracto de ING
      if (!this.esExtractoING(texto)) {
        throw new Error('El archivo no parece ser un extracto de ING')
      }

      // Extraer información del encabezado
      const metadata = this.extraerMetadata(texto)

      // Parsear movimientos
      const movimientosParsed = this.parsearMovimientos(texto)
      movimientos.push(...movimientosParsed)

      return {
        movimientos,
        formatoDetectado: 'ING_PDF',
        errores,
        metadata
      }

    } catch (error) {
      errores.push(`Error al procesar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      return {
        movimientos: [],
        formatoDetectado: 'ING_PDF',
        errores,
        metadata: {}
      }
    }
  }

  private esExtractoING(texto: string): boolean {
    const indicadoresING = [
      'ING DIRECT',
      'ing.es',
      'Cuenta NÓMINA',
      'Cuenta NARANJA',
      'Saldo al inicio',
      'Saldo al final'
    ]

    return indicadoresING.some(indicador => 
      texto.toLowerCase().includes(indicador.toLowerCase())
    )
  }

  private extraerMetadata(texto: string) {
    const metadata: any = {}

    // Extraer fechas del período
    const fechaRegex = /(?:del|desde)\s+(\d{2}\/\d{2}\/\d{4})\s+(?:al|hasta)\s+(\d{2}\/\d{2}\/\d{4})/i
    const fechasMatch = texto.match(fechaRegex)
    
    if (fechasMatch) {
      metadata.fechaInicio = fechasMatch[1]
      metadata.fechaFin = fechasMatch[2]
    }

    // Extraer nombre de cuenta
    const cuentaRegex = /Cuenta\s+(NÓMINA|NARANJA|SIN NÓMINA)\s*([A-Z0-9\s]+)?/i
    const cuentaMatch = texto.match(cuentaRegex)
    
    if (cuentaMatch) {
      metadata.nombreCuenta = cuentaMatch[0].trim()
    }

    return metadata
  }

  private parsearMovimientos(texto: string): MovimientoRaw[] {
    const movimientos: MovimientoRaw[] = []
    const lineas = texto.split('\n')

    // Patrón para detectar líneas de movimiento de ING
    // Formato típico: DD/MM/YYYY DESCRIPCION -XXX,XX EUR XXX,XX EUR [CATEGORIA]
    const patronMovimiento = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d+(?:\.\d{3})*,\d{2})\s+EUR\s+(\d+(?:\.\d{3})*,\d{2})\s+EUR(?:\s+(.+))?$/

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim()
      
      if (!linea) continue

      const match = linea.match(patronMovimiento)
      
      if (match) {
        try {
          const [, fechaStr, descripcion, importeStr, saldoStr, categoria] = match

          // Convertir fecha
          const fecha = this.convertirFecha(fechaStr)
          
          // Convertir importes (formato español: 1.234,56 -> 1234.56)
          const importe = this.convertirImporte(importeStr)
          const saldo = this.convertirImporte(saldoStr)

          // Limpiar descripción
          const descripcionLimpia = this.limpiarDescripcion(descripcion)

          // Detectar categoría ING si existe
          const { categoriaING, subcategoriaING } = this.detectarCategoriaING(categoria || descripcionLimpia)

          const movimiento: MovimientoRaw = {
            fecha: fecha.toISOString(),
            descripcion: descripcionLimpia,
            importe,
            saldo,
            categoriaING,
            subcategoriaING
          }

          movimientos.push(movimiento)

        } catch (error) {
          if (!this.config.tolerarErroresFormato) {
            throw new Error(`Error en línea ${i + 1}: ${error instanceof Error ? error.message : 'Error de formato'}`)
          }
          // Si toleramos errores, continuamos con la siguiente línea
          console.warn(`Advertencia: Error en línea ${i + 1}, omitiendo: ${linea}`)
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
    // Convertir formato español (1.234,56) a número
    const numeroStr = importeStr
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
      .replace(/\s+/g, ' ') // Normalizar espacios
      .replace(/^\*+|\*+$/g, '') // Quitar asteriscos al inicio/final
  }

  private detectarCategoriaING(texto: string): { categoriaING?: string; subcategoriaING?: string } {
    // Mapeo de categorías comunes de ING
    const categoriasING: Record<string, { categoria: string; subcategoria?: string }> = {
      'COMPRAS': { categoria: 'Compras', subcategoria: 'General' },
      'SUPERMERCADOS': { categoria: 'Alimentación', subcategoria: 'Supermercado' },
      'GASOLINERAS': { categoria: 'Transporte', subcategoria: 'Gasolina' },
      'RESTAURANTES': { categoria: 'Salidas', subcategoria: 'Restaurantes' },
      'CAJEROS': { categoria: 'Efectivo', subcategoria: 'Retirada' },
      'TRANSFERENCIAS': { categoria: 'Transferencias', subcategoria: 'Enviadas' },
      'BIZUM': { categoria: 'Bizum', subcategoria: 'Enviado' },
      'RECIBOS': { categoria: 'Gastos Fijos', subcategoria: 'Recibos' },
      'NÓMINA': { categoria: 'Ingresos', subcategoria: 'Nómina' }
    }

    const textoUpper = texto.toUpperCase()
    
    for (const [patron, categoria] of Object.entries(categoriasING)) {
      if (textoUpper.includes(patron)) {
        return {
          categoriaING: categoria.categoria,
          subcategoriaING: categoria.subcategoria
        }
      }
    }

    return {}
  }
}