'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { formatCurrency, formatPercentage, getVariationColor } from '@/lib/analytics/calculations'

interface VistaMensualProps {
  cuentaId: string
  mes: Date
}

interface MovimientoMensual {
  id: string
  fecha: Date
  descripcion: string
  importe: number
  categoria: string
  subcategoria?: string
}

interface ResumenMensual {
  totalGastos: number
  totalIngresos: number
  balance: number
  transacciones: number
  gastoPorDia: number
  categorias: {
    categoria: string
    total: number
    transacciones: number
    porcentaje: number
  }[]
}

interface ComparacionMensual {
  gastos: {
    actual: number
    anterior: number
    variacion: number
  }
  ingresos: {
    actual: number
    anterior: number
    variacion: number
  }
  balance: {
    actual: number
    anterior: number
    variacion: number
  }
}

export function VistaMensual({ cuentaId, mes }: VistaMensualProps) {
  const [movimientos, setMovimientos] = useState<MovimientoMensual[]>([])
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [comparacion, setComparacion] = useState<ComparacionMensual | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mesAnterior = subMonths(mes, 1)
  const mesSiguiente = addMonths(mes, 1)
  const hoy = new Date()
  const esMesActual = isSameMonth(mes, hoy)

  const fetchDatosMensuales = async () => {
    try {
      setLoading(true)
      setError(null)

      const fechaInicio = startOfMonth(mes)
      const fechaFin = endOfMonth(mes)

      // Fetch movimientos del mes
      const movimientosRes = await fetch(
        `/api/movimientos?cuentaId=${cuentaId}&fechaInicio=${fechaInicio.toISOString()}&fechaFin=${fechaFin.toISOString()}`
      )
      
      if (!movimientosRes.ok) {
        throw new Error('Error al cargar movimientos')
      }

      const movimientosData = await movimientosRes.json()
      setMovimientos(movimientosData)

      // Calcular resumen
      const gastos = movimientosData.filter((m: MovimientoMensual) => m.importe < 0)
      const ingresos = movimientosData.filter((m: MovimientoMensual) => m.importe > 0)
      
      const totalGastos = Math.abs(gastos.reduce((sum: number, m: MovimientoMensual) => sum + m.importe, 0))
      const totalIngresos = ingresos.reduce((sum: number, m: MovimientoMensual) => sum + m.importe, 0)
      const balance = totalIngresos - totalGastos

      // Calcular categorías
      const categoriaStats = new Map<string, { total: number; transacciones: number }>()
      
      gastos.forEach((m: MovimientoMensual) => {
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
          transacciones: stats.transacciones,
          porcentaje: totalGastos > 0 ? (stats.total / totalGastos) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total)

      const diasDelMes = fechaFin.getDate()
      const gastoPorDia = totalGastos / diasDelMes

      setResumen({
        totalGastos,
        totalIngresos,
        balance,
        transacciones: movimientosData.length,
        gastoPorDia,
        categorias
      })

      // Fetch datos del mes anterior para comparación
      const fechaInicioAnterior = startOfMonth(mesAnterior)
      const fechaFinAnterior = endOfMonth(mesAnterior)

      const movimientosAnteriorRes = await fetch(
        `/api/movimientos?cuentaId=${cuentaId}&fechaInicio=${fechaInicioAnterior.toISOString()}&fechaFin=${fechaFinAnterior.toISOString()}`
      )

      if (movimientosAnteriorRes.ok) {
        const movimientosAnteriorData = await movimientosAnteriorRes.json()
        
        const gastosAnterior = movimientosAnteriorData.filter((m: MovimientoMensual) => m.importe < 0)
        const ingresosAnterior = movimientosAnteriorData.filter((m: MovimientoMensual) => m.importe > 0)
        
        const totalGastosAnterior = Math.abs(gastosAnterior.reduce((sum: number, m: MovimientoMensual) => sum + m.importe, 0))
        const totalIngresosAnterior = ingresosAnterior.reduce((sum: number, m: MovimientoMensual) => sum + m.importe, 0)
        const balanceAnterior = totalIngresosAnterior - totalGastosAnterior

        setComparacion({
          gastos: {
            actual: totalGastos,
            anterior: totalGastosAnterior,
            variacion: totalGastosAnterior > 0 ? ((totalGastos - totalGastosAnterior) / totalGastosAnterior) * 100 : 0
          },
          ingresos: {
            actual: totalIngresos,
            anterior: totalIngresosAnterior,
            variacion: totalIngresosAnterior > 0 ? ((totalIngresos - totalIngresosAnterior) / totalIngresosAnterior) * 100 : 0
          },
          balance: {
            actual: balance,
            anterior: balanceAnterior,
            variacion: balanceAnterior !== 0 ? ((balance - balanceAnterior) / Math.abs(balanceAnterior)) * 100 : 0
          }
        })
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatosMensuales()
  }, [cuentaId, mes])

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
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
            onClick={fetchDatosMensuales} 
            className="mt-4"
            variant="outline"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navegación mensual */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Link href={`/cuentas/${cuentaId}/mensual/${format(mesAnterior, 'yyyy-MM')}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {format(mesAnterior, 'MMM yyyy', { locale: es })}
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">
                {format(mes, 'MMMM yyyy', { locale: es })}
              </h2>
              {esMesActual && (
                <Badge variant="secondary">Mes actual</Badge>
              )}
            </div>

            <Link href={`/cuentas/${cuentaId}/mensual/${format(mesSiguiente, 'yyyy-MM')}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                {format(mesSiguiente, 'MMM yyyy', { locale: es })}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Resumen principal */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(resumen.totalGastos)}
              </div>
              {comparacion && (
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  getVariationColor(comparacion.gastos.variacion, true)
                }`}>
                  {comparacion.gastos.variacion > 5 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : comparacion.gastos.variacion < -5 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {formatPercentage(comparacion.gastos.variacion)} vs mes anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(resumen.totalIngresos)}
              </div>
              {comparacion && (
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  getVariationColor(comparacion.ingresos.variacion, false)
                }`}>
                  {comparacion.ingresos.variacion > 5 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : comparacion.ingresos.variacion < -5 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {formatPercentage(comparacion.ingresos.variacion)} vs mes anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                resumen.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(resumen.balance)}
              </div>
              {comparacion && (
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  getVariationColor(comparacion.balance.variacion, resumen.balance < 0)
                }`}>
                  {comparacion.balance.variacion > 5 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : comparacion.balance.variacion < -5 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {formatPercentage(comparacion.balance.variacion)} vs mes anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gasto por Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(resumen.gastoPorDia)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {resumen.transacciones} transacciones
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Desglose por categorías */}
      {resumen && resumen.categorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resumen.categorias.map((categoria, index) => (
                <div key={categoria.categoria} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{categoria.categoria}</span>
                      <span className="text-sm text-muted-foreground">
                        {categoria.transacciones} transacciones
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${categoria.porcentaje}%` }}
                        />
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(categoria.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {categoria.porcentaje.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegación a vista anual */}
      <Card>
        <CardHeader>
          <CardTitle>Navegación Temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Link href={`/cuentas/${cuentaId}/anual/${mes.getFullYear()}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Ver año completo ({mes.getFullYear()})
              </Button>
            </Link>
            <Link href={`/cuentas/${cuentaId}/movimientos?mes=${format(mes, 'yyyy-MM')}`}>
              <Button variant="outline" className="flex items-center gap-2">
                Ver lista detallada
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Lista de movimientos recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos del Mes</CardTitle>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay movimientos registrados para este mes
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {movimientos
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .slice(0, 20)
                .map((movimiento) => (
                <div 
                  key={movimiento.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex-1">
                    <div className="font-medium">{movimiento.descripcion}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(movimiento.fecha), 'dd/MM/yyyy', { locale: es })} • {movimiento.categoria}
                      {movimiento.subcategoria && ` • ${movimiento.subcategoria}`}
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    movimiento.importe >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(movimiento.importe)}
                  </div>
                </div>
              ))}
              
              {movimientos.length > 20 && (
                <div className="text-center pt-4">
                  <Link href={`/cuentas/${cuentaId}/movimientos`}>
                    <Button variant="outline" size="sm">
                      Ver todos los movimientos
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}