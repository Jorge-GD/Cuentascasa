// Raw movement data from parsing
export interface MovimientoRaw {
  fecha: string
  descripcion: string
  importe: number
  saldo: number
  categoriaING?: string
  subcategoriaING?: string
}

// Result of parsing operation
export interface ParserResult {
  movimientos: MovimientoRaw[]
  formatoDetectado: 'ING_PDF' | 'ING_TEXT' | 'MANUAL'
  errores: string[]
  metadata?: {
    fechaInicio?: string
    fechaFin?: string
    nombreCuenta?: string
    totalMovimientos?: number
    nombreArchivo?: string
    tamaño?: number
    longitudTexto?: number
    fechaProcesamiento?: string
  }
}

// Input for manual parsing
export interface ParseInput {
  tipo: 'PDF' | 'TEXT'
  contenido: Buffer | string
  nombreArchivo?: string
}

// Validation result
export interface ValidationResult {
  esValido: boolean
  errores: string[]
  advertencias: string[]
  movimientosValidos: MovimientoRaw[]
  movimientosInvalidos: Array<{
    movimiento: Partial<MovimientoRaw>
    errores: string[]
  }>
}

// Configuration for parsers
export interface ParserConfig {
  tolerarErroresFormato: boolean
  ignorarDuplicados: boolean
  validarSaldos: boolean
  fechaMinima?: Date
  fechaMaxima?: Date
}

// Specific types for ING bank format
export interface INGMovimiento {
  fecha: string
  nombre?: string
  numeroCuenta?: string
  codigoTransaccion?: string
  descripcion: string
  importe: number
  divisa?: string
  saldo: number
  categoria?: string
  subcategoria?: string
}

// Patterns for text parsing
export interface PatronTexto {
  nombre: string
  regex: RegExp
  grupos: {
    fecha: number
    descripcion: number
    importe: number
    saldo: number
    categoria?: number
    subcategoria?: number
  }
}

// Error types
export enum TipoErrorParser {
  FORMATO_INVALIDO = 'FORMATO_INVALIDO',
  FECHA_INVALIDA = 'FECHA_INVALIDA',
  IMPORTE_INVALIDO = 'IMPORTE_INVALIDO',
  SALDO_INVALIDO = 'SALDO_INVALIDO',
  DESCRIPCION_VACIA = 'DESCRIPCION_VACIA',
  ARCHIVO_CORRUPTO = 'ARCHIVO_CORRUPTO',
  FORMATO_NO_SOPORTADO = 'FORMATO_NO_SOPORTADO'
}

export interface ErrorParser {
  tipo: TipoErrorParser
  mensaje: string
  linea?: number
  campo?: string
  valor?: any
}