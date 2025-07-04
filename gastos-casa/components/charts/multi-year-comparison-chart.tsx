'use client'

import { memo, useCallback, useState } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { formatCurrency } from '@/lib/analytics/calculations'
import { COLORS, getChartColor } from '@/lib/constants/colors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react'

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

interface ComparativeData {
  años: YearlyComparison[]
  tipo: 'gastos' | 'ingresos'
  resumen: {
    mejorAño: number
    peorAño: number
    tendencia: 'ascendente' | 'descendente' | 'estable'
    variacionPromedio: number
  }
}

interface MultiYearComparisonChartProps {
  data: ComparativeData
  height?: number
  showSummary?: boolean
  onMonthClick?: (mes: number, año: number) => void
}

function MultiYearComparisonChartComponent({ 
  data, 
  height = 400, 
  showSummary = true,
  onMonthClick 
}: MultiYearComparisonChartProps) {
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set())

  // Preparar datos para el gráfico
  const chartData = Array.from({ length: 12 }, (_, index) => {
    const mes = index + 1
    const mesNombre = data.años[0]?.datos[index]?.mesNombre || `Mes ${mes}`
    
    const dataPoint: any = {
      mes: mesNombre,
      mesNumero: mes
    }

    data.años.forEach(año => {
      if (!hiddenYears.has(año.año)) {
        const datoMes = año.datos.find(d => d.mes === mes)
        dataPoint[`año_${año.año}`] = datoMes?.valor || 0
        dataPoint[`transacciones_${año.año}`] = datoMes?.transacciones || 0
      }
    })

    return dataPoint
  })

  const toggleYearVisibility = (año: number) => {
    setHiddenYears(prev => {
      const newHidden = new Set(prev)
      if (newHidden.has(año)) {
        newHidden.delete(año)
      } else {
        newHidden.add(año)
      }
      return newHidden
    })
  }

  const visibleYears = data.años.filter(año => !hiddenYears.has(año.año))

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const mes = chartData.find(d => d.mes === label)?.mesNumero || 1
      
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg min-w-48">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              const año = entry.dataKey.replace('año_', '')
              const transacciones = entry.payload[`transacciones_${año}`] || 0
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-medium">{año}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(entry.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transacciones} mov.
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {onMonthClick && (
            <div className="text-xs text-blue-600 mt-2 pt-2 border-t">
              Click para ver detalles del mes
            </div>
          )}
        </div>
      )
    }
    return null
  }, [chartData, onMonthClick])

  const handleChartClick = useCallback((data: any) => {
    if (onMonthClick && data && data.activeLabel) {
      const mesData = chartData.find(d => d.mes === data.activeLabel)
      if (mesData) {
        // Permitir seleccionar año específico si hay múltiples líneas
        const años = visibleYears.map(y => y.año)
        onMonthClick(mesData.mesNumero, años[0]) // Por defecto primer año visible
      }
    }
  }, [chartData, visibleYears, onMonthClick])

  const getTrendIcon = () => {
    switch (data.resumen.tendencia) {
      case 'ascendente':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'descendente':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    if (data.tipo === 'gastos') {
      return data.resumen.tendencia === 'descendente' ? 'text-green-600' : 
             data.resumen.tendencia === 'ascendente' ? 'text-red-600' : 'text-gray-600'
    } else {
      return data.resumen.tendencia === 'ascendente' ? 'text-green-600' : 
             data.resumen.tendencia === 'descendente' ? 'text-red-600' : 'text-gray-600'
    }
  }

  if (!data.años.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No hay datos para comparar</p>
            <p className="text-sm">Selecciona diferentes filtros para ver la comparación</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {showSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {data.tipo === 'gastos' ? 'Mejor año (menor gasto)' : 'Mejor año (mayor ingreso)'}
                  </p>
                  <p className="text-2xl font-bold text-green-600">{data.resumen.mejorAño}</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Mejor
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {data.tipo === 'gastos' ? 'Peor año (mayor gasto)' : 'Peor año (menor ingreso)'}
                  </p>
                  <p className="text-2xl font-bold text-red-600">{data.resumen.peorAño}</p>
                </div>
                <Badge variant="outline" className="text-red-600 border-red-600">
                  Peor
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tendencia</p>
                  <p className={`text-lg font-semibold ${getTrendColor()}`}>
                    {data.resumen.tendencia.charAt(0).toUpperCase() + data.resumen.tendencia.slice(1)}
                  </p>
                </div>
                {getTrendIcon()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variación promedio</p>
                <p className="text-lg font-semibold text-blue-600">
                  {data.resumen.variacionPromedio.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles de visibilidad */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Años visibles:</span>
        {data.años.map((año, index) => (
          <Button
            key={año.año}
            variant={hiddenYears.has(año.año) ? "outline" : "default"}
            size="sm"
            onClick={() => toggleYearVisibility(año.año)}
            className="h-8"
          >
            {hiddenYears.has(año.año) ? (
              <EyeOff className="h-3 w-3 mr-1" />
            ) : (
              <Eye className="h-3 w-3 mr-1" />
            )}
            {año.año}
          </Button>
        ))}
      </div>

      {/* Gráfico */}
      <Card>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mes"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Líneas para cada año */}
              {visibleYears.map((año, index) => (
                <Line
                  key={año.año}
                  type="monotone"
                  dataKey={`año_${año.año}`}
                  stroke={getChartColor(index)}
                  strokeWidth={3}
                  name={`${año.año}`}
                  dot={{ r: 4 }}
                  activeDot={{ 
                    r: 6, 
                    onClick: (data: any) => onMonthClick && onMonthClick(data.payload.mesNumero, año.año)
                  }}
                  connectNulls={false}
                />
              ))}

              {/* Línea de referencia para el promedio */}
              {visibleYears.length > 0 && (
                <ReferenceLine 
                  y={visibleYears.reduce((sum, año) => sum + año.promedio, 0) / visibleYears.length}
                  stroke="#666" 
                  strokeDasharray="5 5"
                  label={{ value: "Promedio", position: "right" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla resumen por año */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen por Año</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Año</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Promedio Mensual</th>
                  <th className="text-right p-2">Mejor Mes</th>
                  <th className="text-right p-2">Peor Mes</th>
                </tr>
              </thead>
              <tbody>
                {visibleYears.map((año) => {
                  const mejorMes = año.datos.reduce((prev, current) => 
                    data.tipo === 'gastos' 
                      ? (current.valor < prev.valor ? current : prev)
                      : (current.valor > prev.valor ? current : prev)
                  )
                  const peorMes = año.datos.reduce((prev, current) => 
                    data.tipo === 'gastos' 
                      ? (current.valor > prev.valor ? current : prev)
                      : (current.valor < prev.valor ? current : prev)
                  )

                  return (
                    <tr key={año.año} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{año.año}</td>
                      <td className="p-2 text-right font-semibold">
                        {formatCurrency(año.total)}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(año.promedio)}
                      </td>
                      <td className="p-2 text-right text-green-600">
                        {mejorMes.mesNombre} ({formatCurrency(mejorMes.valor)})
                      </td>
                      <td className="p-2 text-right text-red-600">
                        {peorMes.mesNombre} ({formatCurrency(peorMes.valor)})
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Memoizar el componente para optimizar performance
export const MultiYearComparisonChart = memo(MultiYearComparisonChartComponent, (prevProps, nextProps) => {
  if (prevProps.height !== nextProps.height) return false
  if (prevProps.showSummary !== nextProps.showSummary) return false
  if (!prevProps.data && !nextProps.data) return true
  if (!prevProps.data || !nextProps.data) return false
  
  // Comparar datos básicos
  if (prevProps.data.tipo !== nextProps.data.tipo) return false
  if (prevProps.data.años.length !== nextProps.data.años.length) return false
  
  // Comparar años
  return prevProps.data.años.every((año, idx) => {
    const nextAño = nextProps.data.años[idx]
    return nextAño && 
           año.año === nextAño.año &&
           año.total === nextAño.total &&
           año.datos.length === nextAño.datos.length
  })
})

// Export por defecto para compatibilidad con dynamic imports
export default MultiYearComparisonChart