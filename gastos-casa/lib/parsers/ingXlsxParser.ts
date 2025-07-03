// XLSX parser for ING bank statements
import * as XLSX from 'xlsx'
import type { ParserResult, MovimientoRaw, ParserConfig } from '../types/parser'

export class INGXlsxParser {
  private config: ParserConfig

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      tolerarErroresFormato: false,
      ignorarDuplicados: false,
      validarSaldos: true,
      ...config
    }
  }

  async parse(xlsxBuffer: Buffer): Promise<ParserResult> {
    const errores: string[] = []
    const movimientos: MovimientoRaw[] = []

    try {
      // Leer el archivo XLSX
      const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' })
      
      // Tomar la primera hoja
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        throw new Error('El archivo XLSX no contiene hojas de cálculo')
      }

      const worksheet = workbook.Sheets[sheetName]
      
      // Convertir a JSON
      const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (data.length === 0) {
        throw new Error('El archivo XLSX está vacío')
      }

      // Detectar si es un extracto de ING buscando columnas típicas
      if (!this.esExtractoING(data)) {
        throw new Error('El archivo no parece ser un extracto de ING en formato XLSX')
      }

      // Buscar fila de encabezados
      const headerRowIndex = this.encontrarFilaEncabezados(data)
      if (headerRowIndex === -1) {
        throw new Error('No se encontraron encabezados válidos en el archivo XLSX')
      }

      const headers = data[headerRowIndex]
      const columnIndexes = this.mapearColumnas(headers)

      // Procesar filas de datos
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i]
        
        // Saltar filas vacías
        if (!row || row.length === 0 || row.every((cell: any) => !cell)) {
          continue
        }

        try {
          const movimiento = this.procesarFila(row, columnIndexes, i + 1)
          if (movimiento) {
            movimientos.push(movimiento)
          }
        } catch (error) {
          const errorMsg = `Fila ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`
          errores.push(errorMsg)
          
          if (!this.config.tolerarErroresFormato) {
            throw new Error(errorMsg)
          }
        }
      }

      // Validar saldos si está habilitado
      if (this.config.validarSaldos && movimientos.length > 1) {
        this.validarSaldos(movimientos, errores)
      }

      return {
        movimientos,
        formatoDetectado: 'ING_XLSX' as const,
        errores,
        metadatos: {
          totalFilas: data.length,
          filasValidas: movimientos.length,
          filasConError: errores.length,
          primeraFecha: movimientos[0]?.fecha,
          ultimaFecha: movimientos[movimientos.length - 1]?.fecha
        }
      }

    } catch (error) {
      throw new Error(`Error procesando archivo XLSX: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  private esExtractoING(data: any[][]): boolean {
    // Buscar indicadores de que es un extracto de ING
    const textoCompleto = data.flat().join(' ').toLowerCase()
    
    const indicadores = [
      'ing',
      'fecha',
      'concepto',
      'importe',
      'saldo',
      'fecha valor',
      'descripcion'
    ]

    return indicadores.some(indicador => textoCompleto.includes(indicador))
  }

  private encontrarFilaEncabezados(data: any[][]): number {
    // Buscar fila que contenga palabras clave de encabezados
    const encabezadosEsperados = [
      'fecha',
      'concepto', 
      'descripcion',
      'importe',
      'saldo',
      'f. valor',
      'f.valor',
      'valor'
    ]

    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i]
      if (!row) continue

      const textoFila = row.join(' ').toLowerCase()
      const coincidencias = encabezadosEsperados.filter(header => 
        textoFila.includes(header)
      )

      if (coincidencias.length >= 2) {
        return i
      }
    }

    return -1
  }

  private mapearColumnas(headers: any[]): Record<string, number> {
    const mapa: Record<string, number> = {}
    
    headers.forEach((header, index) => {
      if (!header) return
      
      const headerStr = header.toString().toLowerCase().trim()
      
      // Mapear columnas comunes de ING
      if (headerStr.includes('fecha') || headerStr.includes('f. valor') || headerStr.includes('f.valor')) {
        if (headerStr.includes('valor')) {
          mapa.fechaValor = index
        } else {
          mapa.fecha = index
        }
      } else if (headerStr.includes('concepto') || headerStr.includes('descripcion') || headerStr.includes('descripción')) {
        mapa.concepto = index
      } else if (headerStr.includes('importe') || headerStr.includes('cantidad')) {
        mapa.importe = index
      } else if (headerStr.includes('saldo')) {
        mapa.saldo = index
      } else if (headerStr.includes('subcategoria') || headerStr.includes('subcategoría')) {
        mapa.subcategoria = index
      } else if (headerStr.includes('categoria') || headerStr.includes('categoría')) {
        mapa.categoria = index
      }
    })

    return mapa
  }

  private procesarFila(row: unknown[], columnIndexes: Record<string, number>, _numeroFila: number): MovimientoRaw | null {
    // Extraer valores de las columnas
    const fechaRaw = this.extraerValor(row, columnIndexes.fecha) || this.extraerValor(row, columnIndexes.fechaValor)
    const conceptoRaw = this.extraerValor(row, columnIndexes.concepto)
    const importeRaw = this.extraerValor(row, columnIndexes.importe)
    const saldoRaw = this.extraerValor(row, columnIndexes.saldo)
    const categoriaRaw = this.extraerValor(row, columnIndexes.categoria)
    const subcategoriaRaw = this.extraerValor(row, columnIndexes.subcategoria)

    // Validar campos obligatorios
    if (!fechaRaw || !conceptoRaw || importeRaw === undefined || importeRaw === null) {
      return null // Fila vacía o incompleta
    }

    // Procesar fecha
    const fecha = this.procesarFecha(fechaRaw)
    if (!fecha) {
      throw new Error(`Fecha inválida: ${fechaRaw}`)
    }

    // Procesar importe
    const importe = this.procesarImporte(importeRaw)
    if (isNaN(importe)) {
      throw new Error(`Importe inválido: ${importeRaw}`)
    }

    // Procesar saldo (opcional)
    let saldo: number | undefined
    if (saldoRaw !== undefined && saldoRaw !== null && saldoRaw !== '') {
      saldo = this.procesarImporte(saldoRaw)
      if (isNaN(saldo)) {
        saldo = undefined // Saldo inválido, pero no es crítico
      }
    }

    // Crear movimiento
    const movimiento: MovimientoRaw = {
      fecha: fecha.toISOString(),
      descripcion: conceptoRaw.toString().trim(),
      importe,
      saldo,
      categoriaING: categoriaRaw?.toString().trim(),
      subcategoriaING: subcategoriaRaw?.toString().trim()
    }

    return movimiento
  }

  private extraerValor(row: unknown[], columnIndex: number | undefined): unknown {
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return undefined
    }
    return row[columnIndex]
  }

  private procesarFecha(fechaRaw: unknown): Date | null {
    if (!fechaRaw) return null

    // Si es un número (fecha de Excel)
    if (typeof fechaRaw === 'number') {
      const fechaParseada = XLSX.SSF.parse_date_code(fechaRaw)
      if (fechaParseada && fechaParseada.y && fechaParseada.m && fechaParseada.d) {
        return new Date(fechaParseada.y, fechaParseada.m - 1, fechaParseada.d)
      }
      return null
    }

    // Si es string, intentar parsearlo
    if (typeof fechaRaw === 'string') {
      // Formatos comunes: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
      const fechaStr = fechaRaw.trim()
      
      // Intentar varios formatos
      const formatos = [
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
        /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
        /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      ]

      for (const formato of formatos) {
        const match = fechaStr.match(formato)
        if (match) {
          if (formato === formatos[2]) { // YYYY-MM-DD
            return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
          } else { // DD/MM/YYYY o DD-MM-YYYY
            return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
          }
        }
      }
    }

    // Si es objeto Date
    if (fechaRaw instanceof Date) {
      return fechaRaw
    }

    return null
  }

  private procesarImporte(importeRaw: unknown): number {
    if (typeof importeRaw === 'number') {
      return importeRaw
    }

    if (typeof importeRaw === 'string') {
      // Limpiar el string: quitar espacios, cambiar comas por puntos
      const importeStr = importeRaw.trim()
        .replace(/\s/g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '') // Quitar todo excepto dígitos, punto y guión

      return parseFloat(importeStr)
    }

    return NaN
  }

  private validarSaldos(movimientos: MovimientoRaw[], errores: string[]): void {
    for (let i = 1; i < movimientos.length; i++) {
      const anterior = movimientos[i - 1]
      const actual = movimientos[i]

      if (anterior.saldo !== undefined && actual.saldo !== undefined) {
        const saldoCalculado = anterior.saldo + actual.importe
        const diferencia = Math.abs(saldoCalculado - actual.saldo)

        if (diferencia > 0.01) { // Tolerancia de 1 céntimo
          errores.push(
            `Inconsistencia en saldo en movimiento ${i + 1}: ` +
            `esperado ${saldoCalculado.toFixed(2)}, encontrado ${actual.saldo.toFixed(2)}`
          )
        }
      }
    }
  }
}