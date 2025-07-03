'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatPercentage, getVariationColor } from '@/lib/analytics/calculations'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'

interface VistaAnualProps {
  cuentaId: string
  año: number
}

interface DatosMensuales {
  mes: number
  año: number
  mesNombre: string
  fechaFormateada: string
  fecha: Date
  gastos: number
  ingresos: number
  balance: number
  transacciones: number
}

interface ResumenAnual {
  totalGastos: number
  totalIngresos: number
  balanceAnual: number
  transaccionesTotales: number
  promedioMensualGastos: number
  promedioMensualIngresos: number
  mejorMes: DatosMensuales | null
  peorMes: DatosMensuales | null
  categorias: {
    categoria: string
    total: number
    transacciones: number
    porcentaje: number
    meses: number
  }[]
}

interface ComparacionAnual {
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

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function VistaAnual({ cuentaId, año }: VistaAnualProps) {
  const [datosMensuales, setDatosMensuales] = useState<DatosMensuales[]>([])
  const [resumen, setResumen] = useState<ResumenAnual | null>(null)
  const [comparacion, setComparacion] = useState<ComparacionAnual | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const añoAnterior = año - 1
  const añoSiguiente = año + 1
  const añoActual = new Date().getFullYear()
  const esAñoActual = año === añoActual

  const fetchDatosAnuales = async () => {
    try {
      setLoading(true)
      setError(null)

      const datosMes = []
      const categoriaStats = new Map<string, { total: number; transacciones: number; meses: Set<number> }>()

      // Obtener datos para cada mes del año
      for (let mes = 1; mes <= 12; mes++) {
        const fechaInicio = new Date(año, mes - 1, 1)
        const fechaFin = new Date(año, mes, 0, 23, 59, 59, 999)

        const response = await fetch(
          `/api/movimientos?cuentaId=${cuentaId}&fechaInicio=${fechaInicio.toISOString()}&fechaFin=${fechaFin.toISOString()}`
        )

        if (response.ok) {
          const movimientos = await response.json()
          
          const gastos = movimientos.filter((m: any) => m.importe < 0)
          const ingresos = movimientos.filter((m: any) => m.importe > 0)
          
          const totalGastos = Math.abs(gastos.reduce((sum: number, m: any) => sum + m.importe, 0))
          const totalIngresos = ingresos.reduce((sum: number, m: any) => sum + m.importe, 0)
          const balance = totalIngresos - totalGastos

          datosMes.push({
            mes,
            año,
            mesNombre: MESES[mes - 1],
            fechaFormateada: `${MESES[mes - 1].substring(0, 3)} ${año}`,
            fecha: new Date(año, mes - 1, 1),
            gastos: totalGastos,
            ingresos: totalIngresos,
            balance,
            transacciones: movimientos.length
          })

          // Acumular estadísticas de categorías
          gastos.forEach((m: any) => {
            const categoria = m.categoria
            const current = categoriaStats.get(categoria) || { 
              total: 0, 
              transacciones: 0, 
              meses: new Set<number>() 
            }
            
            current.total += Math.abs(m.importe)
            current.transacciones += 1
            current.meses.add(mes)
            
            categoriaStats.set(categoria, current)
          })
        }
      }

      setDatosMensuales(datosMes)

      // Calcular resumen anual
      const totalGastos = datosMes.reduce((sum, mes) => sum + mes.gastos, 0)
      const totalIngresos = datosMes.reduce((sum, mes) => sum + mes.ingresos, 0)
      const balanceAnual = totalIngresos - totalGastos
      const transaccionesTotales = datosMes.reduce((sum, mes) => sum + mes.transacciones, 0)

      const mesesConDatos = datosMes.filter(mes => mes.transacciones > 0)
      const promedioMensualGastos = mesesConDatos.length > 0 ? totalGastos / mesesConDatos.length : 0
      const promedioMensualIngresos = mesesConDatos.length > 0 ? totalIngresos / mesesConDatos.length : 0

      // Encontrar mejor y peor mes (por balance)
      const mejorMes = datosMes.reduce((mejor, actual) => 
        actual.balance > mejor.balance ? actual : mejor, datosMes[0]
      )
      const peorMes = datosMes.reduce((peor, actual) => 
        actual.balance < peor.balance ? actual : peor, datosMes[0]
      )

      // Procesar categorías
      const categorias = Array.from(categoriaStats.entries())
        .map(([categoria, stats]) => ({
          categoria,
          total: stats.total,
          transacciones: stats.transacciones,
          porcentaje: totalGastos > 0 ? (stats.total / totalGastos) * 100 : 0,
          meses: stats.meses.size
        }))
        .sort((a, b) => b.total - a.total)

      setResumen({
        totalGastos,
        totalIngresos,
        balanceAnual,
        transaccionesTotales,
        promedioMensualGastos,
        promedioMensualIngresos,
        mejorMes: mesesConDatos.length > 0 ? mejorMes : null,
        peorMes: mesesConDatos.length > 0 ? peorMes : null,
        categorias: categorias.slice(0, 10) // Top 10 categorías
      })

      // Obtener datos del año anterior para comparación
      if (añoAnterior >= 2000) {
        const datosAñoAnterior = []
        
        for (let mes = 1; mes <= 12; mes++) {
          const fechaInicio = new Date(añoAnterior, mes - 1, 1)
          const fechaFin = new Date(añoAnterior, mes, 0, 23, 59, 59, 999)

          const response = await fetch(
            `/api/movimientos?cuentaId=${cuentaId}&fechaInicio=${fechaInicio.toISOString()}&fechaFin=${fechaFin.toISOString()}`
          )

          if (response.ok) {
            const movimientos = await response.json()
            
            const gastos = movimientos.filter((m: any) => m.importe < 0)
            const ingresos = movimientos.filter((m: any) => m.importe > 0)
            
            const totalGastos = Math.abs(gastos.reduce((sum: number, m: any) => sum + m.importe, 0))
            const totalIngresos = ingresos.reduce((sum: number, m: any) => sum + m.importe, 0)

            datosAñoAnterior.push({ gastos: totalGastos, ingresos: totalIngresos })
          }
        }

        if (datosAñoAnterior.length > 0) {
          const totalGastosAnterior = datosAñoAnterior.reduce((sum, mes) => sum + mes.gastos, 0)
          const totalIngresosAnterior = datosAñoAnterior.reduce((sum, mes) => sum + mes.ingresos, 0)
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
              actual: balanceAnual,
              anterior: balanceAnterior,
              variacion: balanceAnterior !== 0 ? ((balanceAnual - balanceAnterior) / Math.abs(balanceAnterior)) * 100 : 0
            }
          })
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos anuales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatosAnuales()
  }, [cuentaId, año])

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
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
            onClick={fetchDatosAnuales} 
            className="mt-4"
            variant="outline"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const trendData = {
    tipo: 'mensual' as const,
    periodo: `Año ${año}`,
    datos: datosMensuales.map(mes => ({
      fecha: mes.fecha.toISOString(),
      fechaFormateada: mes.fechaFormateada,
      gastos: mes.gastos,
      ingresos: mes.ingresos,
      balance: mes.balance,
      transacciones: mes.transacciones
    })),
    promedios: {
      gastos: resumen?.promedioMensualGastos || 0,
      ingresos: resumen?.promedioMensualIngresos || 0,
      balance: resumen ? (resumen.promedioMensualIngresos - resumen.promedioMensualGastos) : 0
    }
  }

  return (
    <div className="space-y-6">
      {/* Navegación anual */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Link href={`/cuentas/${cuentaId}/anual/${añoAnterior}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {añoAnterior}
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">{año}</h2>
              {esAñoActual && (
                <Badge variant="secondary">Año actual</Badge>
              )}
            </div>

            <Link href={`/cuentas/${cuentaId}/anual/${añoSiguiente}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                {añoSiguiente}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Resumen anual */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gastos Anuales
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
                  {formatPercentage(comparacion.gastos.variacion)} vs año anterior
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Promedio: {formatCurrency(resumen.promedioMensualGastos)}/mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ingresos Anuales
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
                  {formatPercentage(comparacion.ingresos.variacion)} vs año anterior
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Promedio: {formatCurrency(resumen.promedioMensualIngresos)}/mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balance Anual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                resumen.balanceAnual >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(resumen.balanceAnual)}
              </div>
              {comparacion && (
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  getVariationColor(comparacion.balance.variacion, resumen.balanceAnual < 0)
                }`}>
                  {comparacion.balance.variacion > 5 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : comparacion.balance.variacion < -5 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {formatPercentage(comparacion.balance.variacion)} vs año anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {resumen.transaccionesTotales}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Promedio: {Math.round(resumen.transaccionesTotales / 12)}/mes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico de tendencias */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución Mensual {año}</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={trendData} height={400} />
        </CardContent>
      </Card>

      {/* Mejores y peores meses */}
      {resumen && resumen.mejorMes && resumen.peorMes && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Mejor Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-semibold text-lg">{resumen.mejorMes.mesNombre}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Balance:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(resumen.mejorMes.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ingresos:</span>
                    <span>{formatCurrency(resumen.mejorMes.ingresos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos:</span>
                    <span>{formatCurrency(resumen.mejorMes.gastos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transacciones:</span>
                    <span>{resumen.mejorMes.transacciones}</span>
                  </div>
                </div>
                <Link href={`/cuentas/${cuentaId}/mensual/${año}-${resumen.mejorMes.mes.toString().padStart(2, '0')}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver detalles
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Peor Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-semibold text-lg">{resumen.peorMes.mesNombre}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Balance:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(resumen.peorMes.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ingresos:</span>
                    <span>{formatCurrency(resumen.peorMes.ingresos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos:</span>
                    <span>{formatCurrency(resumen.peorMes.gastos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transacciones:</span>
                    <span>{resumen.peorMes.transacciones}</span>
                  </div>
                </div>
                <Link href={`/cuentas/${cuentaId}/mensual/${año}-${resumen.peorMes.mes.toString().padStart(2, '0')}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver detalles
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categorías anuales */}
      {resumen && resumen.categorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Categorías del Año</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resumen.categorias.map((categoria, index) => (
                <div key={categoria.categoria} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{categoria.categoria}</span>
                      <span className="text-sm text-muted-foreground">
                        {categoria.transacciones} transacciones en {categoria.meses} meses
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

      {/* Herramientas de análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Análisis Comparativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href={`/cuentas/${cuentaId}/comparacion/mensual?año=${año}`}>
                <Button variant="outline" className="w-full justify-start">
                  Comparación entre meses de {año}
                </Button>
              </Link>
              <Link href={`/cuentas/${cuentaId}/heatmap?año=${año}`}>
                <Button variant="outline" className="w-full justify-start">
                  Heatmap anual de {año}
                </Button>
              </Link>
              {año > 2000 && (
                <Link href={`/cuentas/${cuentaId}/comparacion/anual?año1=${año-1}&año2=${año}`}>
                  <Button variant="outline" className="w-full justify-start">
                    Comparar {año-1} vs {año}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Navegación Rápida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href={`/cuentas/${cuentaId}/movimientos?año=${año}`}>
                <Button variant="outline" className="w-full justify-start">
                  Ver todos los movimientos de {año}
                </Button>
              </Link>
              <Link href={`/dashboard?cuentaId=${cuentaId}&período=anual&año=${año}`}>
                <Button variant="outline" className="w-full justify-start">
                  Dashboard del año {año}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {datosMensuales.map((mes) => (
              <div key={mes.mes} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{mes.mesNombre}</span>
                  <Badge variant={mes.transacciones > 0 ? "default" : "secondary"} className="text-xs">
                    {mes.transacciones}
                  </Badge>
                </div>
                {mes.transacciones > 0 ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className={`font-semibold ${
                        mes.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(mes.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gastos:</span>
                      <span className="text-red-600">{formatCurrency(mes.gastos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos:</span>
                      <span className="text-green-600">{formatCurrency(mes.ingresos)}</span>
                    </div>
                    <Link href={`/cuentas/${cuentaId}/mensual/${año}-${mes.mes.toString().padStart(2, '0')}`}>
                      <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                        Ver detalles
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Sin movimientos
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}