// XLSX parser for ING bank statements
import * as XLSX from 'xlsx'
import type { ParserResult, MovimientoRaw, ParserConfig } from '../types/parser'

export class INGXlsxParser {
  private config: ParserConfig

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      tolerarErroresFormato: true, // Cambiar a true por defecto
      ignorarDuplicados: false,
      validarSaldos: true, // Se puede desactivar pasando validarSaldos: false
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

      // Validar saldos ANTES de reordenar (para mantener coherencia con saldos del extracto)
      const advertencias: string[] = []
      if (this.config.validarSaldos && movimientos.length > 1) {
        this.validarSaldos(movimientos, advertencias)
      }

      // Detectar si el archivo está desordenado
      const estaDesordenado = this.detectarDesorden(movimientos)
      
      // Ordenar movimientos por fecha (F.Valor) solo para el resultado final
      movimientos.sort((a, b) => 
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      )
      
      if (estaDesordenado) {
        errores.push('⚠️ AVISO: El archivo original tenía movimientos desordenados por fecha.')
        errores.push('✅ Los movimientos han sido reordenados cronológicamente por F.Valor.')
      }

      return {
        movimientos,
        formatoDetectado: 'ING_XLSX' as const,
        errores: errores.concat(advertencias),
        metadata: {
          totalMovimientos: movimientos.length,
          fechaInicio: movimientos[0]?.fecha,
          fechaFin: movimientos[movimientos.length - 1]?.fecha,
          fechaProcesamiento: new Date().toISOString()
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
    
    console.log('Headers encontrados:', headers) // Debug
    
    headers.forEach((header, index) => {
      if (!header) return
      
      const headerStr = header.toString().toLowerCase().trim()
      console.log(`Columna ${index}: "${headerStr}"`) // Debug
      
      // Mapear columnas específicas de ING XLSX
      if (headerStr.includes('f. valor') || headerStr.includes('f.valor') || headerStr === 'f. valor') {
        mapa.fechaValor = index
        mapa.fecha = index // Usar fecha valor como fecha principal
      } else if (headerStr.includes('fecha') && !headerStr.includes('valor')) {
        mapa.fecha = index
      } else if (headerStr.includes('descripcion') || headerStr.includes('descripción') || headerStr === 'descripción') {
        mapa.concepto = index
      } else if (headerStr.includes('importe') || headerStr.includes('importe (€)') || headerStr === 'importe (€)') {
        mapa.importe = index
      } else if (headerStr.includes('saldo') || headerStr.includes('saldo (€)') || headerStr === 'saldo (€)') {
        mapa.saldo = index
      } else if (headerStr.includes('subcategoría') || headerStr.includes('subcategoria') || headerStr === 'subcategoría') {
        mapa.subcategoria = index
      } else if (headerStr.includes('categoría') || headerStr.includes('categoria') || headerStr === 'categoría') {
        mapa.categoria = index
      }
    })

    console.log('Mapeo de columnas resultado:', mapa) // Debug
    return mapa
  }

  private procesarFila(row: unknown[], columnIndexes: Record<string, number>, numeroFila: number): MovimientoRaw | null {
    // Debug: mostrar información de la fila
    console.log(`Procesando fila ${numeroFila}:`, row)
    console.log('Índices de columnas:', columnIndexes)
    
    // Extraer valores de las columnas
    const fechaRaw = this.extraerValor(row, columnIndexes.fecha) || this.extraerValor(row, columnIndexes.fechaValor)
    const conceptoRaw = this.extraerValor(row, columnIndexes.concepto)
    const importeRaw = this.extraerValor(row, columnIndexes.importe)
    const saldoRaw = this.extraerValor(row, columnIndexes.saldo)
    const categoriaRaw = this.extraerValor(row, columnIndexes.categoria)
    const subcategoriaRaw = this.extraerValor(row, columnIndexes.subcategoria)

    console.log(`Fila ${numeroFila} - Valores extraídos:`, {
      fecha: fechaRaw,
      concepto: conceptoRaw,
      importe: importeRaw,
      saldo: saldoRaw,
      categoria: categoriaRaw,
      subcategoria: subcategoriaRaw
    })

    // Validar campos obligatorios
    if (!fechaRaw || !conceptoRaw || importeRaw === undefined || importeRaw === null) {
      console.log(`Fila ${numeroFila} saltada - campos faltantes`)
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

    // Procesar saldo (requerido)
    let saldo = 0 // Valor por defecto
    if (saldoRaw !== undefined && saldoRaw !== null && saldoRaw !== '') {
      saldo = this.procesarImporte(saldoRaw)
      if (isNaN(saldo)) {
        console.warn(`Saldo inválido en fila ${numeroFila}: ${saldoRaw}, usando 0`)
        saldo = 0 // Saldo inválido, usar 0 como fallback
      }
    }

    console.log(`Fila ${numeroFila} - Valores procesados:`, {
      fecha: fecha.toISOString(),
      descripcion: conceptoRaw.toString().trim(),
      importe,
      saldo
    })

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

  private detectarDesorden(movimientos: MovimientoRaw[]): boolean {
    if (movimientos.length <= 1) return false
    
    for (let i = 1; i < movimientos.length; i++) {
      const fechaAnterior = new Date(movimientos[i - 1].fecha).getTime()
      const fechaActual = new Date(movimientos[i].fecha).getTime()
      
      // Si encontramos una fecha anterior después de una posterior, está desordenado
      if (fechaActual < fechaAnterior) {
        return true
      }
    }
    
    return false
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
    console.log('Procesando importe:', importeRaw, 'tipo:', typeof importeRaw)
    
    if (typeof importeRaw === 'number') {
      console.log('Importe como número:', importeRaw)
      return importeRaw
    }

    if (typeof importeRaw === 'string') {
      // Limpiar el string: quitar espacios y caracteres especiales
      let importeStr = importeRaw.trim()
      
      console.log('Importe original como string:', importeStr)
      
      // Detectar si es un ingreso (sin signo) o un gasto (con signo -)
      const esNegativo = importeStr.startsWith('-')
      
      // Manejar formato europeo con coma decimal y punto como separador de miles
      // Ejemplo: "-1.234,56" o "1.234,56" o "-31,00" o "40,00"
      if (importeStr.includes(',')) {
        // Formato europeo: quitar puntos (separador de miles) y cambiar coma por punto
        importeStr = importeStr.replace(/\./g, '').replace(',', '.')
      }
      
      // Quitar todo excepto dígitos, punto y signo menos
      importeStr = importeStr.replace(/[^\d.-]/g, '')
      
      console.log('Importe procesado:', importeStr)
      
      const resultado = parseFloat(importeStr)
      console.log('Resultado parseFloat:', resultado)
      
      // Verificar que el resultado mantiene el signo correcto
      if (esNegativo && resultado > 0) {
        return -resultado
      } else if (!esNegativo && resultado < 0) {
        return Math.abs(resultado)
      }
      
      return resultado
    }

    console.log('Importe no válido, devolviendo NaN')
    return NaN
  }

  private validarSaldos(movimientos: MovimientoRaw[], advertencias: string[]): void {
    // IMPORTANTE: Trabajar con el orden ORIGINAL del archivo antes de reordenar
    // En extractos bancarios el orden suele ser de más reciente a más antiguo
    
    // Encontrar fechas mínima y máxima para el período
    const fechas = movimientos.map(m => new Date(m.fecha).getTime())
    const fechaMin = new Date(Math.min(...fechas))
    const fechaMax = new Date(Math.max(...fechas))
    
    // Encontrar el movimiento más antiguo y más reciente por fecha
    // IMPORTANTE: Mantener el orden original cuando las fechas son iguales
    const movimientosConIndice = movimientos.map((mov, index) => ({ ...mov, indexOriginal: index }))
    const movimientosOrdenadosPorFecha = [...movimientosConIndice].sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime()
      const fechaB = new Date(b.fecha).getTime()
      
      // Si las fechas son iguales, usar el orden original INVERTIDO del archivo
      if (fechaA === fechaB) {
        // En extractos ING: orden original es de más reciente a más antiguo
        // Por tanto: mayor índice original = más antiguo en el tiempo
        return b.indexOriginal - a.indexOriginal
      }
      
      return fechaA - fechaB
    })
    const movimientoMasAntiguo = movimientosOrdenadosPorFecha[0]
    const movimientoMasReciente = movimientosOrdenadosPorFecha[movimientosOrdenadosPorFecha.length - 1]

    // Información de diagnóstico básica
    advertencias.push(`📊 INFORMACIÓN DEL ARCHIVO:`)
    advertencias.push(`   Total movimientos: ${movimientos.length}`)
    advertencias.push(`   Período: ${fechaMin.toLocaleDateString('es-ES')} - ${fechaMax.toLocaleDateString('es-ES')}`)
    advertencias.push(`   Saldo más antiguo (${new Date(movimientoMasAntiguo.fecha).toLocaleDateString('es-ES')}): ${movimientoMasAntiguo.saldo.toFixed(2)}€`)
    advertencias.push(`   Saldo más reciente (${new Date(movimientoMasReciente.fecha).toLocaleDateString('es-ES')}): ${movimientoMasReciente.saldo.toFixed(2)}€`)
    
    // Mostrar TODOS los movimientos ordenados cronológicamente para debug
    advertencias.push(`📋 TODOS LOS MOVIMIENTOS (orden cronológico corregido):`)
    movimientosOrdenadosPorFecha.forEach((mov, i) => {
      const fechaLocal = new Date(mov.fecha).toLocaleDateString('es-ES')
      const horaLocal = new Date(mov.fecha).toLocaleTimeString('es-ES')
      advertencias.push(`   ${i + 1}. ${fechaLocal} ${horaLocal}: ${mov.importe.toFixed(2)}€ - Saldo: ${mov.saldo.toFixed(2)}€ (índice original: ${mov.indexOriginal})`)
    })
    
    // Contar ingresos y gastos CORRECTAMENTE (solo usar importes, no saldos)
    const ingresos = movimientos.filter(m => m.importe > 0)
    const gastos = movimientos.filter(m => m.importe < 0)
    const totalIngresos = ingresos.reduce((sum, m) => sum + m.importe, 0)
    const totalGastos = Math.abs(gastos.reduce((sum, m) => sum + m.importe, 0)) // Convertir a positivo para mostrar
    
    advertencias.push(`💰 RESUMEN DE IMPORTES (NO SALDOS):`)
    advertencias.push(`   Ingresos: ${ingresos.length} movimientos, total: ${totalIngresos.toFixed(2)}€`)
    advertencias.push(`   Gastos: ${gastos.length} movimientos, total: ${totalGastos.toFixed(2)}€`)
    advertencias.push(`   Balance neto: ${(totalIngresos - totalGastos).toFixed(2)}€`)
    
    // Mostrar detalle de cada tipo para debug
    advertencias.push(`📋 DETALLE INGRESOS:`)
    ingresos.forEach(ing => {
      advertencias.push(`   • ${new Date(ing.fecha).toLocaleDateString('es-ES')}: +${ing.importe.toFixed(2)}€`)
    })
    
    advertencias.push(`📋 DETALLE GASTOS:`)
    gastos.forEach(gasto => {
      advertencias.push(`   • ${new Date(gasto.fecha).toLocaleDateString('es-ES')}: ${gasto.importe.toFixed(2)}€`)
    })
    
    // Validación CORRECTA de saldos usando orden cronológico
    // El movimiento más antiguo nos da el saldo inicial, el más reciente el final
    
    // Saldo inicial = saldo del movimiento más antiguo - importe de ese movimiento
    const saldoInicial = movimientoMasAntiguo.saldo - movimientoMasAntiguo.importe
    const sumaMovimientos = movimientos.reduce((sum, mov) => sum + mov.importe, 0)
    const saldoFinalEsperado = saldoInicial + sumaMovimientos
    const saldoFinalReal = movimientoMasReciente.saldo
    
    advertencias.push(`📈 VALIDACIÓN DE SALDOS (ORDEN CRONOLÓGICO):`)
    advertencias.push(`   Movimiento más antiguo: ${new Date(movimientoMasAntiguo.fecha).toLocaleDateString('es-ES')} - Importe: ${movimientoMasAntiguo.importe.toFixed(2)}€ - Saldo después: ${movimientoMasAntiguo.saldo.toFixed(2)}€`)
    advertencias.push(`   Saldo inicial estimado: ${saldoInicial.toFixed(2)}€ (antes del movimiento más antiguo)`)
    advertencias.push(`   Suma ALGEBRAICA de importes: ${sumaMovimientos.toFixed(2)}€`)
    advertencias.push(`   Saldo final esperado: ${saldoFinalEsperado.toFixed(2)}€`)
    advertencias.push(`   Saldo final real: ${saldoFinalReal.toFixed(2)}€`)
    
    const diferencia = Math.abs(saldoFinalEsperado - saldoFinalReal)
    if (diferencia > 0.01) { // Tolerancia para redondeos
      advertencias.push(`   ⚠️ Diferencia: ${diferencia.toFixed(2)}€`)
      if (diferencia > 50) {
        advertencias.push(`   ⚠️ Diferencia considerable - puede haber movimientos fuera del período`)
      } else {
        advertencias.push(`   ℹ️ Diferencia menor - probablemente redondeos o movimientos externos`)
      }
    } else {
      advertencias.push(`   ✅ Saldos cuadran perfectamente`)
    }
    
    advertencias.push(`   ➡️ Los movimientos se importarán de todos modos`)
  }
}