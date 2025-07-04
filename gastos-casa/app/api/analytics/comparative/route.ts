import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface MonthlyData {
  mes: number
  mesNombre: string
  valor: number
  transacciones: number
}

interface YearlyComparison {
  año: number
  datos: MonthlyData[]
  total: number
  promedio: number
}

interface ComparativeAnalysisResponse {
  años: YearlyComparison[]
  tipo: 'gastos' | 'ingresos'
  categorias?: string[]
  cuentas?: string[]
  resumen: {
    mejorAño: number
    peorAño: number
    tendencia: 'ascendente' | 'descendente' | 'estable'
    variacionPromedio: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuentaIds = searchParams.get('cuentaIds')?.split(',') || []
    const tipo = (searchParams.get('tipo') || 'gastos') as 'gastos' | 'ingresos'
    const categoriaIds = searchParams.get('categoriaIds')?.split(',') || []
    const subcategoriaIds = searchParams.get('subcategoriaIds')?.split(',') || []
    const añosParam = searchParams.get('años')

    if (!cuentaIds.length) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos una cuenta' },
        { status: 400 }
      )
    }

    // Determinar rango de años a analizar
    let años: number[]
    if (añosParam) {
      años = añosParam.split(',').map(Number)
    } else {
      // Por defecto, obtener los últimos 3 años con datos
      const movimientosRange = await prisma.movimiento.aggregate({
        where: {
          cuentaId: { in: cuentaIds },
          ...(categoriaIds.length > 0 && { categoriaId: { in: categoriaIds } }),
          ...(subcategoriaIds.length > 0 && { subcategoriaId: { in: subcategoriaIds } })
        },
        _min: { fecha: true },
        _max: { fecha: true }
      })

      if (!movimientosRange._min?.fecha || !movimientosRange._max?.fecha) {
        return NextResponse.json({
          success: true,
          data: {
            años: [],
            tipo,
            resumen: {
              mejorAño: 0,
              peorAño: 0,
              tendencia: 'estable' as const,
              variacionPromedio: 0
            }
          }
        })
      }

      const añoMinimo = movimientosRange._min.fecha.getFullYear()
      const añoMaximo = movimientosRange._max.fecha.getFullYear()
      
      // Incluir máximo 5 años para mantener legibilidad
      const añosDisponibles = []
      for (let año = añoMaximo; año >= añoMinimo && añosDisponibles.length < 5; año--) {
        añosDisponibles.push(año)
      }
      años = añosDisponibles.reverse()
    }

    const resultado: YearlyComparison[] = []

    // Procesar cada año
    for (const año of años) {
      const datosAño: MonthlyData[] = []
      let totalAño = 0

      // Procesar cada mes del año
      for (let mes = 1; mes <= 12; mes++) {
        const fechaInicio = startOfMonth(new Date(año, mes - 1))
        const fechaFin = endOfMonth(new Date(año, mes - 1))

        const whereClause = {
          cuentaId: { in: cuentaIds },
          fecha: {
            gte: fechaInicio,
            lte: fechaFin
          },
          tipo: tipo === 'gastos' ? 'gasto' as const : 'ingreso' as const,
          ...(categoriaIds.length > 0 && { categoriaId: { in: categoriaIds } }),
          ...(subcategoriaIds.length > 0 && { subcategoriaId: { in: subcategoriaIds } })
        }

        const movimientos = await prisma.movimiento.findMany({
          where: whereClause,
          select: {
            cantidad: true,
            id: true
          }
        })

        const valorMes = movimientos.reduce((sum, mov) => sum + Math.abs(mov.cantidad), 0)
        totalAño += valorMes

        datosAño.push({
          mes,
          mesNombre: format(new Date(año, mes - 1), 'MMM', { locale: es }),
          valor: valorMes,
          transacciones: movimientos.length
        })
      }

      resultado.push({
        año,
        datos: datosAño,
        total: totalAño,
        promedio: totalAño / 12
      })
    }

    // Calcular resumen y tendencias
    const resumen = calcularResumenComparativo(resultado, tipo)

    const response: ComparativeAnalysisResponse = {
      años: resultado,
      tipo,
      ...(categoriaIds.length > 0 && { categorias: categoriaIds }),
      ...(cuentaIds.length > 0 && { cuentas: cuentaIds }),
      resumen
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error en análisis comparativo:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al generar análisis comparativo' 
      },
      { status: 500 }
    )
  }
}

function calcularResumenComparativo(datos: YearlyComparison[], tipo: 'gastos' | 'ingresos') {
  if (datos.length === 0) {
    return {
      mejorAño: 0,
      peorAño: 0,
      tendencia: 'estable' as const,
      variacionPromedio: 0
    }
  }

  // Para gastos: mejor año = menor cantidad, para ingresos: mejor año = mayor cantidad
  const esMejor = tipo === 'gastos' 
    ? (a: number, b: number) => a < b 
    : (a: number, b: number) => a > b

  let mejorAño = datos[0]
  let peorAño = datos[0]

  datos.forEach(año => {
    if (esMejor(año.total, mejorAño.total)) {
      mejorAño = año
    }
    if (!esMejor(año.total, peorAño.total)) {
      peorAño = año
    }
  })

  // Calcular tendencia basada en los últimos años
  let tendencia: 'ascendente' | 'descendente' | 'estable' = 'estable'
  if (datos.length >= 2) {
    const datosOrdenados = [...datos].sort((a, b) => a.año - b.año)
    const primerAño = datosOrdenados[0].total
    const ultimoAño = datosOrdenados[datosOrdenados.length - 1].total
    
    const diferencia = ultimoAño - primerAño
    const umbral = primerAño * 0.1 // 10% de diferencia para considerar cambio significativo
    
    if (Math.abs(diferencia) < umbral) {
      tendencia = 'estable'
    } else if (diferencia > 0) {
      tendencia = tipo === 'gastos' ? 'ascendente' : 'ascendente'
    } else {
      tendencia = tipo === 'gastos' ? 'descendente' : 'descendente'
    }
  }

  // Calcular variación promedio entre años
  const totales = datos.map(d => d.total)
  const variaciones = []
  for (let i = 1; i < totales.length; i++) {
    const variacion = ((totales[i] - totales[i-1]) / totales[i-1]) * 100
    variaciones.push(Math.abs(variacion))
  }
  const variacionPromedio = variaciones.length > 0 
    ? variaciones.reduce((sum, v) => sum + v, 0) / variaciones.length 
    : 0

  return {
    mejorAño: mejorAño.año,
    peorAño: peorAño.año,
    tendencia,
    variacionPromedio: Math.round(variacionPromedio * 100) / 100
  }
}