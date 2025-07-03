'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { YearSelector } from '@/components/common/year-selector'
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/analytics/calculations'
import { startOfMonth, endOfMonth } from 'date-fns'

interface HeatmapAnualProps {
  cuentaId: string
  añoInicial?: number
}

interface DatosMes {
  mes: number
  año: number
  mesNombre: string
  gastos: number
  ingresos: number
  balance: number
  transacciones: number
  intensidad: number // 0-1 para el color del heatmap
}

interface EstadisticasAño {
  añoSeleccionado: number
  totalGastos: number
  totalIngresos: number
  balanceAnual: number
  transaccionesTotales: number
  promedioMensual: {
    gastos: number
    ingresos: number
    balance: number
    transacciones: number
  }
  mejorMes: DatosMes | null
  peorMes: DatosMes | null
  mesesConDatos: number
}

const MESES_NOMBRES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

export function HeatmapAnual({ cuentaId, añoInicial = new Date().getFullYear() }: HeatmapAnualProps) {
  const [añoSeleccionado, setAñoSeleccionado] = useState(añoInicial)
  const [datosMensuales, setDatosMensuales] = useState<DatosMes[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasAño | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tipoVista, setTipoVista] = useState<'gastos' | 'ingresos' | 'balance'>('gastos')

  const fetchDatosAño = async () => {
    try {
      setLoading(true)
      setError(null)

      const datosMes: DatosMes[] = []
      let totalGastos = 0
      let totalIngresos = 0
      let transaccionesTotales = 0

      // Obtener datos para cada mes del año
      for (let mes = 1; mes <= 12; mes++) {
        const fechaInicio = startOfMonth(new Date(añoSeleccionado, mes - 1, 1))
        const fechaFin = endOfMonth(new Date(añoSeleccionado, mes - 1, 1))

        const response = await fetch(
          `/api/movimientos?cuentaId=${cuentaId}&fechaInicio=${fechaInicio.toISOString()}&fechaFin=${fechaFin.toISOString()}`
        )

        if (response.ok) {
          const movimientos = await response.json()
          
          const gastos = movimientos.filter((m: any) => m.importe < 0)
          const ingresos = movimientos.filter((m: any) => m.importe > 0)
          
          const gastosDelMes = Math.abs(gastos.reduce((sum: number, m: any) => sum + m.importe, 0))
          const ingresosDelMes = ingresos.reduce((sum: number, m: any) => sum + m.importe, 0)
          const balanceDelMes = ingresosDelMes - gastosDelMes

          totalGastos += gastosDelMes
          totalIngresos += ingresosDelMes
          transaccionesTotales += movimientos.length

          datosMes.push({
            mes,
            año: añoSeleccionado,
            mesNombre: MESES_NOMBRES[mes - 1],
            gastos: gastosDelMes,
            ingresos: ingresosDelMes,
            balance: balanceDelMes,
            transacciones: movimientos.length,
            intensidad: 0 // Se calculará después
          })
        } else {
          datosMes.push({
            mes,
            año: añoSeleccionado,
            mesNombre: MESES_NOMBRES[mes - 1],
            gastos: 0,
            ingresos: 0,
            balance: 0,
            transacciones: 0,
            intensidad: 0
          })
        }
      }

      // Calcular intensidades para el heatmap
      const valores = datosMes.map(mes => {
        switch (tipoVista) {
          case 'gastos': return mes.gastos
          case 'ingresos': return mes.ingresos
          case 'balance': return Math.abs(mes.balance)
          default: return mes.gastos
        }
      })

      const maxValor = Math.max(...valores)
      const minValor = Math.min(...valores.filter(v => v > 0))

      datosMes.forEach(mes => {
        const valor = valores[mes.mes - 1]
        if (valor === 0) {
          mes.intensidad = 0
        } else {
          mes.intensidad = maxValor > 0 ? (valor - minValor) / (maxValor - minValor) : 0
        }
      })

      setDatosMensuales(datosMes)

      // Calcular estadísticas
      const mesesConDatos = datosMes.filter(mes => mes.transacciones > 0)
      const balanceAnual = totalIngresos - totalGastos

      const mejorMes = mesesConDatos.length > 0 ? 
        mesesConDatos.reduce((mejor, actual) => actual.balance > mejor.balance ? actual : mejor) : null
      
      const peorMes = mesesConDatos.length > 0 ? 
        mesesConDatos.reduce((peor, actual) => actual.balance < peor.balance ? actual : peor) : null

      setEstadisticas({
        añoSeleccionado,
        totalGastos,
        totalIngresos,
        balanceAnual,
        transaccionesTotales,
        promedioMensual: {
          gastos: mesesConDatos.length > 0 ? totalGastos / mesesConDatos.length : 0,
          ingresos: mesesConDatos.length > 0 ? totalIngresos / mesesConDatos.length : 0,
          balance: mesesConDatos.length > 0 ? balanceAnual / mesesConDatos.length : 0,
          transacciones: mesesConDatos.length > 0 ? transaccionesTotales / mesesConDatos.length : 0
        },
        mejorMes,
        peorMes,
        mesesConDatos: mesesConDatos.length
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos del año')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatosAño()
  }, [cuentaId, añoSeleccionado, tipoVista])

  const getColorIntensity = (intensidad: number) => {
    if (intensidad === 0) return 'bg-gray-100'
    
    const colors = {
      gastos: [
        'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500'
      ],
      ingresos: [
        'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500'
      ],
      balance: [
        'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500'
      ]
    }

    const colorArray = colors[tipoVista]
    const index = Math.min(Math.floor(intensidad * colorArray.length), colorArray.length - 1)
    return colorArray[index]
  }

  const getTooltipText = (mes: DatosMes) => {
    switch (tipoVista) {
      case 'gastos':
        return `${mes.mesNombre} ${mes.año}: ${formatCurrency(mes.gastos)}`
      case 'ingresos':
        return `${mes.mesNombre} ${mes.año}: ${formatCurrency(mes.ingresos)}`
      case 'balance':
        return `${mes.mesNombre} ${mes.año}: ${formatCurrency(mes.balance)}`
      default:
        return `${mes.mesNombre} ${mes.año}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
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
            onClick={fetchDatosAño} 
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
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Heatmap Anual
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={tipoVista === 'gastos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoVista('gastos')}
                >
                  Gastos
                </Button>
                <Button
                  variant={tipoVista === 'ingresos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoVista('ingresos')}
                >
                  Ingresos
                </Button>
                <Button
                  variant={tipoVista === 'balance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoVista('balance')}
                >
                  Balance
                </Button>
              </div>
              <YearSelector
                value={añoSeleccionado}
                onChange={setAñoSeleccionado}
                maxYear={new Date().getFullYear()}
              />
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Estadísticas del año */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total {tipoVista === 'gastos' ? 'Gastos' : tipoVista === 'ingresos' ? 'Ingresos' : 'Balance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${
                tipoVista === 'gastos' ? 'text-red-600' : 
                tipoVista === 'ingresos' ? 'text-green-600' : 
                estadisticas.balanceAnual >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {tipoVista === 'gastos' ? formatCurrency(estadisticas.totalGastos) :
                 tipoVista === 'ingresos' ? formatCurrency(estadisticas.totalIngresos) :
                 formatCurrency(estadisticas.balanceAnual)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Promedio: {tipoVista === 'gastos' ? formatCurrency(estadisticas.promedioMensual.gastos) :
                          tipoVista === 'ingresos' ? formatCurrency(estadisticas.promedioMensual.ingresos) :
                          formatCurrency(estadisticas.promedioMensual.balance)}/mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meses Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600">
                {estadisticas.mesesConDatos}/12
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((estadisticas.mesesConDatos / 12) * 100)}% del año
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Mejor Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estadisticas.mejorMes ? (
                <div>
                  <div className="font-semibold">{estadisticas.mejorMes.mesNombre}</div>
                  <div className="text-sm text-green-600">
                    {formatCurrency(estadisticas.mejorMes.balance)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">N/A</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Peor Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estadisticas.peorMes ? (
                <div>
                  <div className="font-semibold">{estadisticas.peorMes.mesNombre}</div>
                  <div className="text-sm text-red-600">
                    {formatCurrency(estadisticas.peorMes.balance)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">N/A</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>
            Vista de {tipoVista.charAt(0).toUpperCase() + tipoVista.slice(1)} - {añoSeleccionado}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Grid del heatmap */}
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
              {datosMensuales.map((mes) => (
                <div
                  key={mes.mes}
                  className={`
                    aspect-square p-2 rounded-lg border-2 border-gray-200 
                    ${getColorIntensity(mes.intensidad)}
                    hover:border-gray-400 transition-all duration-200 cursor-pointer
                    flex flex-col items-center justify-center
                  `}
                  title={getTooltipText(mes)}
                >
                  <div className="text-xs font-medium">{mes.mesNombre}</div>
                  <div className="text-xs text-center">
                    {mes.transacciones > 0 ? (
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {tipoVista === 'gastos' ? formatCurrency(mes.gastos).slice(0, 6) :
                           tipoVista === 'ingresos' ? formatCurrency(mes.ingresos).slice(0, 6) :
                           formatCurrency(mes.balance).slice(0, 6)}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {mes.transacciones}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-gray-400">-</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Leyenda del heatmap */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">Menos</span>
              <div className="flex gap-1">
                {[0, 0.25, 0.5, 0.75, 1].map((intensidad) => (
                  <div
                    key={intensidad}
                    className={`w-4 h-4 rounded ${getColorIntensity(intensidad)}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Más</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles por trimestre */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis por Trimestres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { nombre: 'Q1', meses: [1, 2, 3], label: 'Ene-Mar' },
              { nombre: 'Q2', meses: [4, 5, 6], label: 'Abr-Jun' },
              { nombre: 'Q3', meses: [7, 8, 9], label: 'Jul-Sep' },
              { nombre: 'Q4', meses: [10, 11, 12], label: 'Oct-Dic' }
            ].map((trimestre) => {
              const mesesTrimestre = datosMensuales.filter(mes => trimestre.meses.includes(mes.mes))
              const totalGastos = mesesTrimestre.reduce((sum, mes) => sum + mes.gastos, 0)
              const totalIngresos = mesesTrimestre.reduce((sum, mes) => sum + mes.ingresos, 0)
              const balance = totalIngresos - totalGastos
              const transacciones = mesesTrimestre.reduce((sum, mes) => sum + mes.transacciones, 0)

              return (
                <div key={trimestre.nombre} className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">{trimestre.nombre}</div>
                  <div className="text-xs text-muted-foreground mb-3">{trimestre.label}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Gastos:</span>
                      <span className="text-red-600">{formatCurrency(totalGastos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ingresos:</span>
                      <span className="text-green-600">{formatCurrency(totalIngresos)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span>Balance:</span>
                      <span className={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Movimientos:</span>
                      <span>{transacciones}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}