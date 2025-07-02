import type { MovimientoRaw, ValidationResult, ErrorParser, TipoErrorParser, ParserConfig } from '../types/parser'

export class MovimientoValidator {
  private config: ParserConfig

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      tolerarErroresFormato: false,
      ignorarDuplicados: false,
      validarSaldos: true,
      fechaMinima: new Date('2020-01-01'),
      fechaMaxima: new Date(Date.now() + 86400000), // Mañana
      ...config
    }
  }

  validate(movimientos: MovimientoRaw[]): ValidationResult {
    const errores: string[] = []
    const advertencias: string[] = []
    const movimientosValidos: MovimientoRaw[] = []
    const movimientosInvalidos: Array<{ movimiento: Partial<MovimientoRaw>; errores: string[] }> = []

    // Validar duplicados si está habilitado
    if (!this.config.ignorarDuplicados) {
      const duplicados = this.detectarDuplicados(movimientos)
      if (duplicados.length > 0) {
        advertencias.push(`Se encontraron ${duplicados.length} movimientos duplicados`)
      }
    }

    // Validar cada movimiento individualmente
    for (let i = 0; i < movimientos.length; i++) {
      const movimiento = movimientos[i]
      const erroresMovimiento = this.validarMovimiento(movimiento, i)

      if (erroresMovimiento.length === 0) {
        movimientosValidos.push(movimiento)
      } else {
        movimientosInvalidos.push({
          movimiento,
          errores: erroresMovimiento
        })
        errores.push(...erroresMovimiento.map(e => `Movimiento ${i + 1}: ${e}`))
      }
    }

    // Validar secuencia de saldos si está habilitado
    if (this.config.validarSaldos && movimientosValidos.length > 1) {
      const erroresSaldos = this.validarSecuenciaSaldos(movimientosValidos)
      if (erroresSaldos.length > 0) {
        advertencias.push(...erroresSaldos)
      }
    }

    return {
      esValido: errores.length === 0,
      errores,
      advertencias,
      movimientosValidos,
      movimientosInvalidos
    }
  }

  private validarMovimiento(movimiento: MovimientoRaw, indice: number): string[] {
    const errores: string[] = []

    // Validar fecha
    const errorFecha = this.validarFecha(movimiento.fecha)
    if (errorFecha) {
      errores.push(errorFecha)
    }

    // Validar descripción
    const errorDescripcion = this.validarDescripcion(movimiento.descripcion)
    if (errorDescripcion) {
      errores.push(errorDescripcion)
    }

    // Validar importe
    const errorImporte = this.validarImporte(movimiento.importe)
    if (errorImporte) {
      errores.push(errorImporte)
    }

    // Validar saldo
    const errorSaldo = this.validarSaldo(movimiento.saldo)
    if (errorSaldo) {
      errores.push(errorSaldo)
    }

    return errores
  }

  private validarFecha(fechaStr: string): string | null {
    try {
      const fecha = new Date(fechaStr)
      
      if (isNaN(fecha.getTime())) {
        return `Fecha inválida: ${fechaStr}`
      }

      if (this.config.fechaMinima && fecha < this.config.fechaMinima) {
        return `Fecha anterior al mínimo permitido: ${fechaStr}`
      }

      if (this.config.fechaMaxima && fecha > this.config.fechaMaxima) {
        return `Fecha posterior al máximo permitido: ${fechaStr}`
      }

      return null

    } catch (error) {
      return `Error al procesar fecha: ${fechaStr}`
    }
  }

  private validarDescripcion(descripcion: string): string | null {
    if (!descripcion || descripcion.trim().length === 0) {
      return 'La descripción no puede estar vacía'
    }

    if (descripcion.trim().length < 3) {
      return 'La descripción es demasiado corta (mínimo 3 caracteres)'
    }

    if (descripcion.length > 500) {
      return 'La descripción es demasiado larga (máximo 500 caracteres)'
    }

    // Verificar caracteres sospechosos
    const caracteresProhibidos = /[<>{}]/
    if (caracteresProhibidos.test(descripcion)) {
      return 'La descripción contiene caracteres no permitidos'
    }

    return null
  }

  private validarImporte(importe: number): string | null {
    if (typeof importe !== 'number' || isNaN(importe)) {
      return `Importe inválido: ${importe}`
    }

    if (!isFinite(importe)) {
      return 'El importe debe ser un número finito'
    }

    // Verificar límites razonables
    const limiteMaximo = 1000000 // 1 millón
    const limiteMinimo = -1000000

    if (importe > limiteMaximo || importe < limiteMinimo) {
      return `Importe fuera de límites razonables: ${importe}`
    }

    // Verificar precisión decimal (máximo 2 decimales)
    const decimales = (importe.toString().split('.')[1] || '').length
    if (decimales > 2) {
      return `Demasiados decimales en el importe: ${importe}`
    }

    return null
  }

  private validarSaldo(saldo: number): string | null {
    if (typeof saldo !== 'number' || isNaN(saldo)) {
      return `Saldo inválido: ${saldo}`
    }

    if (!isFinite(saldo)) {
      return 'El saldo debe ser un número finito'
    }

    // Verificar límites razonables para saldos
    const limiteMaximo = 10000000 // 10 millones
    const limiteMinimo = -1000000 // -1 millón (números rojos)

    if (saldo > limiteMaximo || saldo < limiteMinimo) {
      return `Saldo fuera de límites razonables: ${saldo}`
    }

    return null
  }

  private detectarDuplicados(movimientos: MovimientoRaw[]): MovimientoRaw[] {
    const duplicados: MovimientoRaw[] = []
    const vistos = new Set<string>()

    for (const movimiento of movimientos) {
      // Crear clave única basada en fecha, importe y descripción
      const clave = `${movimiento.fecha}_${movimiento.importe}_${movimiento.descripcion.toLowerCase().trim()}`
      
      if (vistos.has(clave)) {
        duplicados.push(movimiento)
      } else {
        vistos.add(clave)
      }
    }

    return duplicados
  }

  private validarSecuenciaSaldos(movimientos: MovimientoRaw[]): string[] {
    const advertencias: string[] = []
    
    // Ordenar por fecha para validar secuencia
    const movimientosOrdenados = [...movimientos].sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )

    for (let i = 1; i < movimientosOrdenados.length; i++) {
      const anterior = movimientosOrdenados[i - 1]
      const actual = movimientosOrdenados[i]
      
      // Calcular saldo esperado
      const saldoEsperado = anterior.saldo + actual.importe
      const diferencia = Math.abs(saldoEsperado - actual.saldo)
      
      // Tolerancia para errores de redondeo
      const tolerancia = 0.01
      
      if (diferencia > tolerancia) {
        advertencias.push(
          `Inconsistencia en saldo del movimiento ${i + 1}: ` +
          `esperado ${saldoEsperado.toFixed(2)}, encontrado ${actual.saldo.toFixed(2)}`
        )
      }
    }

    return advertencias
  }

  // Método para validar y limpiar movimientos
  validateAndClean(movimientos: MovimientoRaw[]): {
    movimientosLimpios: MovimientoRaw[]
    errores: string[]
    advertencias: string[]
  } {
    const result = this.validate(movimientos)
    
    // Limpiar y normalizar movimientos válidos
    const movimientosLimpios = result.movimientosValidos.map(this.limpiarMovimiento)

    return {
      movimientosLimpios,
      errores: result.errores,
      advertencias: result.advertencias
    }
  }

  private limpiarMovimiento(movimiento: MovimientoRaw): MovimientoRaw {
    return {
      ...movimiento,
      descripcion: movimiento.descripcion.trim().replace(/\s+/g, ' '),
      importe: Math.round(movimiento.importe * 100) / 100, // Redondear a 2 decimales
      saldo: Math.round(movimiento.saldo * 100) / 100,
      categoriaING: movimiento.categoriaING?.trim(),
      subcategoriaING: movimiento.subcategoriaING?.trim()
    }
  }
}

// Utilidades adicionales de validación
export const validationUtils = {
  // Validar formato de fecha español
  esFechaValida(fecha: string): boolean {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)
  },

  // Validar formato de importe español
  esImporteValido(importe: string): boolean {
    return /^-?\d+(?:\.\d{3})*,\d{2}$/.test(importe)
  },

  // Normalizar descripción
  normalizarDescripcion(descripcion: string): string {
    return descripcion
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,áéíóúñü]/gi, '')
  },

  // Detectar si una línea parece ser un movimiento bancario
  esLineaMovimiento(linea: string): boolean {
    const tieneEstructura = /\d{2}\/\d{2}\/\d{4}.*-?\d+(?:\.\d{3})*,\d{2}/.test(linea)
    const tieneTextoSuficiente = linea.trim().length > 20
    return tieneEstructura && tieneTextoSuficiente
  }
}