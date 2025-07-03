'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MonthPicker } from '@/components/common/month-picker'
import { TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency, formatPercentage, getVariationColor } from '@/lib/analytics/calculations'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'

interface ComparativaMensualProps {
  cuentaId: string
  mesInicial?: Date
}

interface DatosMes {
  fecha: Date
  mesNombre: string
  fechaFormateada: string
  gastos: number
  ingresos: number
  balance: number
  transacciones: number
  categorias: {
    categoria: string
    total: number
    transacciones: number
  }[]
}

interface ComparacionDatos {
  mesActual: DatosMes
  mesAnterior: DatosMes
  variaciones: {
    gastos: number
    ingresos: number
    balance: number
    transacciones: number
  }
  tendencia: 'mejora' | 'empeora' | 'estable'
}

export function ComparativaMensual({ cuentaId, mesInicial = new Date() }: ComparativaMensualProps) {
  const [mesSeleccionado, setMesSeleccionado] = useState(startOfMonth(mesInicial))
  const [comparacion, setComparacion] = useState<ComparacionDatos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mesAnterior = subMonths(mesSeleccionado, 1)

  const fetchComparacion = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener datos del mes seleccionado
      const datosActual = await fetchDatosMes(mesSeleccionado)
      
      // Obtener datos del mes anterior
      const datosAnterior = await fetchDatosMes(mesAnterior)

      // Calcular variaciones
      const variaciones = {
        gastos: datosAnterior.gastos > 0 ? 
          ((datosActual.gastos - datosAnterior.gastos) / datosAnterior.gastos) * 100 : 0,
        ingresos: datosAnterior.ingresos > 0 ? 
          ((datosActual.ingresos - datosAnterior.ingresos) / datosAnterior.ingresos) * 100 : 0,
        balance: datosAnterior.balance !== 0 ? 
          ((datosActual.balance - datosAnterior.balance) / Math.abs(datosAnterior.balance)) * 100 : 0,
        transacciones: datosAnterior.transacciones > 0 ? 
          ((datosActual.transacciones - datosAnterior.transacciones) / datosAnterior.transacciones) * 100 : 0
      }

      // Determinar tendencia general
      let tendencia: 'mejora' | 'empeora' | 'estable' = 'estable'
      
      // La tendencia se basa principalmente en el balance
      if (variaciones.balance > 10) {
        tendencia = 'mejora'
      } else if (variaciones.balance < -10) {
        tendencia = 'empeora'
      }

      setComparacion({
        mesActual: datosActual,
        mesAnterior: datosAnterior,
        variaciones,
        tendencia
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar comparación')
    } finally {
      setLoading(false)
    }
  }

  const fetchDatosMes = async (fecha: Date): Promise<DatosMes> => {
    const fechaInicio = startOfMonth(fecha)
    const fechaFin = endOfMonth(fecha)

    const response = await fetch(
      `/api/movimientos?cuentaId=${cuentaId}&fechaInicio=${fechaInicio.toISOString()}&fechaFin=${fechaFin.toISOString()}`
    )

    if (!response.ok) {
      throw new Error('Error al cargar movimientos')
    }

    const movimientos = await response.json()
    
    const gastos = movimientos.filter((m: any) => m.importe < 0)
    const ingresos = movimientos.filter((m: any) => m.importe > 0)
    
    const totalGastos = Math.abs(gastos.reduce((sum: number, m: any) => sum + m.importe, 0))
    const totalIngresos = ingresos.reduce((sum: number, m: any) => sum + m.importe, 0)
    const balance = totalIngresos - totalGastos

    // Calcular categorías
    const categoriaStats = new Map<string, { total: number; transacciones: number }>()
    
    gastos.forEach((m: any) => {
      const categoria = m.categoria
      const current = categoriaStats.get(categoria) || { total: 0, transacciones: 0 }
      categoriaStats.set(categoria, {
        total: current.total + Math.abs(m.importe),
        transacciones: current.transacciones + 1
      })
    })

    const categorias = Array.from(categoriaStats.entries())
      .map(([categoria, stats]) => ({
        categoria,
        total: stats.total,
        transacciones: stats.transacciones
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    return {
      fecha,
      mesNombre: format(fecha, 'MMMM yyyy', { locale: es }),
      fechaFormateada: format(fecha, 'MMM yyyy', { locale: es }),
      gastos: totalGastos,
      ingresos: totalIngresos,
      balance,
      transacciones: movimientos.length,
      categorias
    }
  }

  useEffect(() => {
    fetchComparacion()
  }, [cuentaId, mesSeleccionado])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={fetchComparacion} 
            className="mt-4"
            variant="outline"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!comparacion) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No hay datos disponibles para la comparación</p>
        </CardContent>
      </Card>
    )
  }

  const trendData = {
    tipo: 'mensual' as const,
    periodo: `${comparacion.mesAnterior.mesNombre} - ${comparacion.mesActual.mesNombre}`,
    datos: [
      {
        fecha: comparacion.mesAnterior.fecha.toISOString(),
        fechaFormateada: comparacion.mesAnterior.fechaFormateada,
        gastos: comparacion.mesAnterior.gastos,
        ingresos: comparacion.mesAnterior.ingresos,
        balance: comparacion.mesAnterior.balance,
        transacciones: comparacion.mesAnterior.transacciones
      },
      {
        fecha: comparacion.mesActual.fecha.toISOString(),
        fechaFormateada: comparacion.mesActual.fechaFormateada,
        gastos: comparacion.mesActual.gastos,
        ingresos: comparacion.mesActual.ingresos,
        balance: comparacion.mesActual.balance,
        transacciones: comparacion.mesActual.transacciones
      }
    ],
    promedios: {
      gastos: (comparacion.mesActual.gastos + comparacion.mesAnterior.gastos) / 2,
      ingresos: (comparacion.mesActual.ingresos + comparacion.mesAnterior.ingresos) / 2,
      balance: (comparacion.mesActual.balance + comparacion.mesAnterior.balance) / 2
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de mes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Comparativa Mensual
            <MonthPicker
              value={mesSeleccionado}
              onChange={setMesSeleccionado}
              maxDate={new Date()}
              className="ml-4"
            />
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Resumen de tendencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Tendencia General
            <Badge 
              variant={
                comparacion.tendencia === 'mejora' ? 'default' : 
                comparacion.tendencia === 'empeora' ? 'destructive' : 'secondary'
              }
            >
              {comparacion.tendencia === 'mejora' && '↗ Mejora'}
              {comparacion.tendencia === 'empeora' && '↘ Empeora'}
              {comparacion.tendencia === 'estable' && '→ Estable'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Comparando {comparacion.mesActual.mesNombre} con {comparacion.mesAnterior.mesNombre}
          </p>
        </CardContent>
      </Card>

      {/* Comparación de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(comparacion.mesActual.gastos)}
              </div>
              <div className="text-xs text-muted-foreground">
                Anterior: {formatCurrency(comparacion.mesAnterior.gastos)}
              </div>
              <div className={`text-xs flex items-center gap-1 ${
                getVariationColor(comparacion.variaciones.gastos, true)
              }`}>
                {comparacion.variaciones.gastos > 5 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : comparacion.variaciones.gastos < -5 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {formatPercentage(comparacion.variaciones.gastos)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(comparacion.mesActual.ingresos)}
              </div>
              <div className="text-xs text-muted-foreground">
                Anterior: {formatCurrency(comparacion.mesAnterior.ingresos)}
              </div>
              <div className={`text-xs flex items-center gap-1 ${
                getVariationColor(comparacion.variaciones.ingresos, false)
              }`}>
                {comparacion.variaciones.ingresos > 5 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : comparacion.variaciones.ingresos < -5 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {formatPercentage(comparacion.variaciones.ingresos)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-lg font-bold ${
                comparacion.mesActual.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(comparacion.mesActual.balance)}
              </div>
              <div className="text-xs text-muted-foreground">
                Anterior: {formatCurrency(comparacion.mesAnterior.balance)}
              </div>
              <div className={`text-xs flex items-center gap-1 ${
                getVariationColor(comparacion.variaciones.balance, comparacion.mesActual.balance < 0)
              }`}>
                {comparacion.variaciones.balance > 5 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : comparacion.variaciones.balance < -5 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {formatPercentage(comparacion.variaciones.balance)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-bold text-blue-600">
                {comparacion.mesActual.transacciones}
              </div>
              <div className="text-xs text-muted-foreground">
                Anterior: {comparacion.mesAnterior.transacciones}
              </div>
              <div className={`text-xs flex items-center gap-1 ${
                comparacion.variaciones.transacciones > 0 ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {comparacion.variaciones.transacciones > 10 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : comparacion.variaciones.transacciones < -10 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {formatPercentage(comparacion.variaciones.transacciones)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de tendencia */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución Temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={trendData} height={300} />
        </CardContent>
      </Card>

      {/* Comparación de categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{comparacion.mesActual.mesNombre}</CardTitle>
          </CardHeader>
          <CardContent>
            {comparacion.mesActual.categorias.length > 0 ? (
              <div className="space-y-3">
                {comparacion.mesActual.categorias.map((categoria, index) => (
                  <div key={categoria.categoria} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{categoria.categoria}</div>
                      <div className="text-xs text-muted-foreground">
                        {categoria.transacciones} transacciones
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(categoria.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Sin gastos registrados
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{comparacion.mesAnterior.mesNombre}</CardTitle>
          </CardHeader>
          <CardContent>
            {comparacion.mesAnterior.categorias.length > 0 ? (
              <div className="space-y-3">
                {comparacion.mesAnterior.categorias.map((categoria, index) => (
                  <div key={categoria.categoria} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{categoria.categoria}</div>
                      <div className="text-xs text-muted-foreground">
                        {categoria.transacciones} transacciones
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(categoria.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Sin gastos registrados
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}