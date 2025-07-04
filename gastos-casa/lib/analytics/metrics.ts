import { prisma } from '@/lib/db/prisma'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  subMonths, 
  format,
  startOfWeek,
  endOfWeek,
  eachMonthOfInterval,
  eachWeekOfInterval
} from 'date-fns'
import { es } from 'date-fns/locale'

export interface DashboardMetrics {
  gastoTotal: number
  ingresoTotal: number
  balance: number
  transacciones: number
  tasaAhorro: number // Nuevo KPI: (Ingresos - Gastos) / Ingresos * 100
  comparacionMesAnterior: {
    gastos: number
    ingresos: number
    porcentajeGastos: number
    porcentajeIngresos: number
    tasaAhorro: number // Tasa de ahorro del mes anterior
  }
  proyeccionFinMes: number
  explicacionProyeccion: string // Nueva explicación de cómo se calcula
  topCategorias: Array<{
    categoria: string
    total: number
    porcentaje: number
    transacciones: number
    subcategorias?: Array<{
      nombre: string
      total: number
      porcentaje: number
      transacciones: number
    }>
  }>
  alertas: Array<{
    tipo: 'presupuesto' | 'gasto_inusual' | 'tendencia'
    mensaje: string
    severidad: 'info' | 'warning' | 'error'
  }>
}

export interface TrendData {
  tipo: 'mensual' | 'semanal' | 'anual'
  periodo: string
  datos: Array<{
    fecha: string
    fechaFormateada: string
    gastos: number
    ingresos: number
    balance: number
    transacciones: number
  }>
  promedios: {
    gastos: number
    ingresos: number
    balance: number
  }
}

export interface AccountComparisonData {
  cuentas: Array<{
    id: string
    nombre: string
    gastos: number
    ingresos: number
    balance: number
    transacciones: number
    porcentajeGastos: number
    porcentajeIngresos: number
  }>
  totales: {
    gastos: number
    ingresos: number
    balance: number
    transacciones: number
  }
}

export async function getDashboardMetrics(
  cuentaId: string, 
  periodo: string = 'mes'
): Promise<DashboardMetrics> {
  const now = new Date()
  let fechaInicio: Date
  let fechaFin: Date

  switch (periodo) {
    case 'trimestre':
      fechaInicio = startOfMonth(subMonths(now, 2))
      fechaFin = endOfMonth(now)
      break
    case 'año':
      fechaInicio = startOfYear(now)
      fechaFin = endOfYear(now)
      break
    default: // mes
      fechaInicio = startOfMonth(now)
      fechaFin = endOfMonth(now)
  }

  // Obtener movimientos del período actual
  const movimientos = await prisma.movimiento.findMany({
    where: {
      cuentaId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    },
    orderBy: { fecha: 'desc' }
  })

  // Calcular métricas básicas
  const gastos = movimientos.filter(m => m.importe < 0)
  const ingresos = movimientos.filter(m => m.importe > 0)
  
  const gastoTotal = Math.abs(gastos.reduce((sum, m) => sum + m.importe, 0))
  const ingresoTotal = ingresos.reduce((sum, m) => sum + m.importe, 0)
  const balance = ingresoTotal - gastoTotal

  // Comparación con período anterior
  const fechaInicioAnterior = periodo === 'mes' 
    ? startOfMonth(subMonths(now, 1))
    : periodo === 'trimestre'
    ? startOfMonth(subMonths(now, 5))
    : startOfYear(subMonths(now, 12))
    
  const fechaFinAnterior = periodo === 'mes'
    ? endOfMonth(subMonths(now, 1))
    : periodo === 'trimestre'
    ? endOfMonth(subMonths(now, 3))
    : endOfYear(subMonths(now, 12))

  const movimientosAnterior = await prisma.movimiento.findMany({
    where: {
      cuentaId,
      fecha: {
        gte: fechaInicioAnterior,
        lte: fechaFinAnterior
      }
    }
  })

  const gastosAnterior = Math.abs(movimientosAnterior
    .filter(m => m.importe < 0)
    .reduce((sum, m) => sum + m.importe, 0))
  const ingresosAnterior = movimientosAnterior
    .filter(m => m.importe > 0)
    .reduce((sum, m) => sum + m.importe, 0)

  const porcentajeGastos = gastosAnterior > 0 
    ? ((gastoTotal - gastosAnterior) / gastosAnterior) * 100 
    : 0
  const porcentajeIngresos = ingresosAnterior > 0
    ? ((ingresoTotal - ingresosAnterior) / ingresosAnterior) * 100
    : 0

  // Top categorías
  const categoriaStats = gastos.reduce((acc, mov) => {
    const categoria = mov.categoria
    if (!acc[categoria]) {
      acc[categoria] = { total: 0, count: 0 }
    }
    acc[categoria].total += Math.abs(mov.importe)
    acc[categoria].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  const topCategorias = Object.entries(categoriaStats)
    .map(([categoria, stats]) => ({
      categoria,
      total: stats.total,
      porcentaje: gastoTotal > 0 ? (stats.total / gastoTotal) * 100 : 0,
      transacciones: stats.count
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Calcular tasa de ahorro
  const tasaAhorro = ingresoTotal > 0 ? ((ingresoTotal - gastoTotal) / ingresoTotal) * 100 : 0
  const tasaAhorroAnterior = ingresosAnterior > 0 ? ((ingresosAnterior - gastosAnterior) / ingresosAnterior) * 100 : 0

  // Proyección fin de mes (solo para período mensual)
  let proyeccionFinMes = 0
  let explicacionProyeccion = 'Proyección no disponible para este período'
  
  if (periodo === 'mes') {
    // Obtener el saldo más reciente
    const movimientoMasReciente = await prisma.movimiento.findFirst({
      where: { cuentaId },
      orderBy: { fecha: 'desc' }
    })
    
    if (movimientoMasReciente && movimientoMasReciente.saldo !== null) {
      const saldoActual = movimientoMasReciente.saldo
      
      const diasTranscurridos = Math.max(1, Math.ceil((now.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)))
      const diasRestantes = Math.ceil((fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diasTranscurridos > 0 && diasRestantes > 0) {
        // Calcular promedio diario de gastos e ingresos
        const gastoDiarioPromedio = gastoTotal / diasTranscurridos
        const ingresoDiarioPromedio = ingresoTotal / diasTranscurridos
        
        // Proyectar para los días restantes
        const gastosProyectados = gastoDiarioPromedio * diasRestantes
        const ingresosProyectados = ingresoDiarioPromedio * diasRestantes
        
        // Proyección del saldo = Saldo actual + Ingresos proyectados - Gastos proyectados
        proyeccionFinMes = saldoActual + ingresosProyectados - gastosProyectados
        
        explicacionProyeccion = `Basada en saldo actual (${saldoActual.toFixed(2)}€) + promedio diario de ingresos (${ingresoDiarioPromedio.toFixed(2)}€) - gastos (${gastoDiarioPromedio.toFixed(2)}€) proyectados para ${diasRestantes} días restantes`
      } else {
        // Si ya estamos al final del mes, usar el saldo actual
        proyeccionFinMes = saldoActual
        explicacionProyeccion = 'Saldo actual del fin de mes'
      }
    }
  }

  // Generar alertas básicas
  const alertas: DashboardMetrics['alertas'] = []
  
  if (porcentajeGastos > 20) {
    alertas.push({
      tipo: 'tendencia',
      mensaje: `Los gastos han aumentado un ${porcentajeGastos.toFixed(1)}% respecto al período anterior`,
      severidad: 'warning'
    })
  }
  
  if (balance < 0) {
    alertas.push({
      tipo: 'gasto_inusual',
      mensaje: 'Los gastos superan los ingresos en este período',
      severidad: 'error'
    })
  }

  return {
    gastoTotal,
    ingresoTotal,
    balance,
    transacciones: movimientos.length,
    tasaAhorro,
    comparacionMesAnterior: {
      gastos: gastosAnterior,
      ingresos: ingresosAnterior,
      porcentajeGastos,
      porcentajeIngresos,
      tasaAhorro: tasaAhorroAnterior
    },
    proyeccionFinMes,
    explicacionProyeccion,
    topCategorias,
    alertas
  }
}

export async function getTrendAnalysis(
  cuentaId: string,
  tipo: string = 'mensual',
  meses: number = 12
): Promise<TrendData> {
  const now = new Date()
  const fechaInicio = startOfMonth(subMonths(now, meses - 1))
  const fechaFin = endOfMonth(now)

  let intervals: Date[]
  let formatPattern: string

  switch (tipo) {
    case 'semanal':
      intervals = eachWeekOfInterval({ start: fechaInicio, end: fechaFin })
      formatPattern = 'dd/MM'
      break
    case 'anual':
      intervals = eachMonthOfInterval({ start: fechaInicio, end: fechaFin })
      formatPattern = 'yyyy'
      break
    default: // mensual
      intervals = eachMonthOfInterval({ start: fechaInicio, end: fechaFin })
      formatPattern = 'MMM yyyy'
  }

  const datos = await Promise.all(
    intervals.map(async (fecha) => {
      let inicioIntervalo: Date
      let finIntervalo: Date

      if (tipo === 'semanal') {
        inicioIntervalo = startOfWeek(fecha, { locale: es })
        finIntervalo = endOfWeek(fecha, { locale: es })
      } else {
        inicioIntervalo = startOfMonth(fecha)
        finIntervalo = endOfMonth(fecha)
      }

      const movimientos = await prisma.movimiento.findMany({
        where: {
          cuentaId,
          fecha: {
            gte: inicioIntervalo,
            lte: finIntervalo
          }
        }
      })

      const gastos = Math.abs(movimientos
        .filter(m => m.importe < 0)
        .reduce((sum, m) => sum + m.importe, 0))
      const ingresos = movimientos
        .filter(m => m.importe > 0)
        .reduce((sum, m) => sum + m.importe, 0)

      return {
        fecha: fecha.toISOString(),
        fechaFormateada: format(fecha, formatPattern, { locale: es }),
        gastos,
        ingresos,
        balance: ingresos - gastos,
        transacciones: movimientos.length
      }
    })
  )

  // Calcular promedios
  const promedios = {
    gastos: datos.reduce((sum, d) => sum + d.gastos, 0) / datos.length,
    ingresos: datos.reduce((sum, d) => sum + d.ingresos, 0) / datos.length,
    balance: datos.reduce((sum, d) => sum + d.balance, 0) / datos.length
  }

  return {
    tipo: tipo as 'mensual' | 'semanal' | 'anual',
    periodo: `${format(fechaInicio, 'MMM yyyy', { locale: es })} - ${format(fechaFin, 'MMM yyyy', { locale: es })}`,
    datos,
    promedios
  }
}

export async function getDetailedCategoryAnalysis(
  cuentaId: string,
  periodo: string = 'mes'
): Promise<DashboardMetrics['topCategorias']> {
  const now = new Date()
  let fechaInicio: Date
  let fechaFin: Date

  switch (periodo) {
    case 'trimestre':
      fechaInicio = startOfMonth(subMonths(now, 2))
      fechaFin = endOfMonth(now)
      break
    case 'año':
      fechaInicio = startOfYear(now)
      fechaFin = endOfYear(now)
      break
    default: // mes
      fechaInicio = startOfMonth(now)
      fechaFin = endOfMonth(now)
  }

  // Obtener movimientos con categorías y subcategorías
  const movimientos = await prisma.movimiento.findMany({
    where: {
      cuentaId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      },
      importe: { lt: 0 } // Solo gastos
    },
    include: {
      etiquetas: true // Para obtener las subcategorías si están en etiquetas
    }
  })

  const gastoTotal = Math.abs(movimientos.reduce((sum, m) => sum + m.importe, 0))

  // Agrupar por categoría
  const categoriaStats = movimientos.reduce((acc, mov) => {
    const categoria = mov.categoria
    if (!acc[categoria]) {
      acc[categoria] = { 
        total: 0, 
        count: 0, 
        subcategorias: {} as Record<string, { total: number; count: number }>
      }
    }
    
    const amount = Math.abs(mov.importe)
    acc[categoria].total += amount
    acc[categoria].count += 1

    // Procesar subcategorías - priorizar subcategoria del movimiento sobre etiquetas
    const subcategoria = mov.subcategoria || 'General'
    if (!acc[categoria].subcategorias[subcategoria]) {
      acc[categoria].subcategorias[subcategoria] = { total: 0, count: 0 }
    }
    acc[categoria].subcategorias[subcategoria].total += amount
    acc[categoria].subcategorias[subcategoria].count += 1

    // También procesar etiquetas como subcategorías adicionales si existen
    if (mov.etiquetas && mov.etiquetas.length > 0) {
      mov.etiquetas.forEach(etiqueta => {
        const etiquetaSubcategoria = etiqueta.nombre
        // Solo agregar si es diferente a la subcategoría principal
        if (etiquetaSubcategoria !== subcategoria) {
          if (!acc[categoria].subcategorias[etiquetaSubcategoria]) {
            acc[categoria].subcategorias[etiquetaSubcategoria] = { total: 0, count: 0 }
          }
          acc[categoria].subcategorias[etiquetaSubcategoria].total += amount
          acc[categoria].subcategorias[etiquetaSubcategoria].count += 1
        }
      })
    }

    return acc
  }, {} as Record<string, { 
    total: number; 
    count: number; 
    subcategorias: Record<string, { total: number; count: number }>
  }>)

  // Convertir a formato de respuesta
  const categoriesWithSubcategories = Object.entries(categoriaStats)
    .map(([categoria, stats]) => {
      const subcategorias = Object.entries(stats.subcategorias)
        .map(([subcat, substats]) => ({
          nombre: subcat,
          total: substats.total,
          porcentaje: stats.total > 0 ? (substats.total / stats.total) * 100 : 0,
          transacciones: substats.count
        }))
        .sort((a, b) => b.total - a.total)

      return {
        categoria,
        total: stats.total,
        porcentaje: gastoTotal > 0 ? (stats.total / gastoTotal) * 100 : 0,
        transacciones: stats.count,
        subcategorias
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8) // Aumentamos a 8 categorías principales

  return categoriesWithSubcategories
}

export async function getAccountComparison(
  cuentaIds: string[],
  periodo: string = 'mes',
  fechaInicio?: Date,
  fechaFin?: Date
): Promise<AccountComparisonData> {
  const now = new Date()
  
  if (!fechaInicio || !fechaFin) {
    switch (periodo) {
      case 'trimestre':
        fechaInicio = startOfMonth(subMonths(now, 2))
        fechaFin = endOfMonth(now)
        break
      case 'año':
        fechaInicio = startOfYear(now)
        fechaFin = endOfYear(now)
        break
      default: // mes
        fechaInicio = startOfMonth(now)
        fechaFin = endOfMonth(now)
    }
  }

  const cuentasData = await Promise.all(
    cuentaIds.map(async (cuentaId) => {
      // Obtener información de la cuenta
      const cuenta = await prisma.cuenta.findUnique({
        where: { id: cuentaId }
      })

      if (!cuenta) {
        throw new Error(`Cuenta con ID ${cuentaId} no encontrada`)
      }

      // Obtener movimientos
      const movimientos = await prisma.movimiento.findMany({
        where: {
          cuentaId,
          fecha: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      })

      const gastos = Math.abs(movimientos
        .filter(m => m.importe < 0)
        .reduce((sum, m) => sum + m.importe, 0))
      const ingresos = movimientos
        .filter(m => m.importe > 0)
        .reduce((sum, m) => sum + m.importe, 0)

      return {
        id: cuentaId,
        nombre: cuenta.nombre,
        gastos,
        ingresos,
        balance: ingresos - gastos,
        transacciones: movimientos.length,
        porcentajeGastos: 0, // Se calculará después
        porcentajeIngresos: 0 // Se calculará después
      }
    })
  )

  // Calcular totales
  const totales = {
    gastos: cuentasData.reduce((sum, c) => sum + c.gastos, 0),
    ingresos: cuentasData.reduce((sum, c) => sum + c.ingresos, 0),
    balance: cuentasData.reduce((sum, c) => sum + c.balance, 0),
    transacciones: cuentasData.reduce((sum, c) => sum + c.transacciones, 0)
  }

  // Calcular porcentajes
  const cuentas = cuentasData.map(cuenta => ({
    ...cuenta,
    porcentajeGastos: totales.gastos > 0 ? (cuenta.gastos / totales.gastos) * 100 : 0,
    porcentajeIngresos: totales.ingresos > 0 ? (cuenta.ingresos / totales.ingresos) * 100 : 0
  }))

  return {
    cuentas,
    totales
  }
}