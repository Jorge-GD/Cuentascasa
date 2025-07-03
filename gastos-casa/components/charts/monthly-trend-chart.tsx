'use client'

import { memo, useCallback } from 'react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { formatCurrency } from '@/lib/analytics/calculations'
import type { TrendData } from '@/lib/analytics/metrics'

interface MonthlyTrendChartProps {
  data: TrendData
  height?: number
}

function MonthlyTrendChartComponent({ data, height = 300 }: MonthlyTrendChartProps) {
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{dataPoint.fechaFormateada}</p>
          <div className="space-y-1">
            <p className="text-sm text-red-600">
              Gastos: {formatCurrency(dataPoint.gastos)}
            </p>
            <p className="text-sm text-green-600">
              Ingresos: {formatCurrency(dataPoint.ingresos)}
            </p>
            <p className="text-sm text-blue-600">
              Balance: {formatCurrency(dataPoint.balance)}
            </p>
            <p className="text-xs text-muted-foreground">
              {dataPoint.transacciones} transacciones
            </p>
          </div>
        </div>
      )
    }
    return null
  }, [])

  if (!data || !data.datos || data.datos.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No hay datos de tendencias para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data.datos}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="fechaFormateada"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `€${Math.abs(value)}`}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="gastos"
            stackId="1"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorGastos)"
          />
          <Area
            type="monotone"
            dataKey="ingresos"
            stackId="2"
            stroke="#22c55e"
            fillOpacity={1}
            fill="url(#colorIngresos)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Resumen de promedios */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div className="p-2 bg-red-50 rounded">
          <div className="text-red-600 font-semibold">
            {formatCurrency(data.promedios.gastos)}
          </div>
          <div className="text-xs text-muted-foreground">
            Promedio gastos
          </div>
        </div>
        <div className="p-2 bg-green-50 rounded">
          <div className="text-green-600 font-semibold">
            {formatCurrency(data.promedios.ingresos)}
          </div>
          <div className="text-xs text-muted-foreground">
            Promedio ingresos
          </div>
        </div>
        <div className="p-2 bg-blue-50 rounded">
          <div className="text-blue-600 font-semibold">
            {formatCurrency(data.promedios.balance)}
          </div>
          <div className="text-xs text-muted-foreground">
            Promedio balance
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoizar el gráfico de tendencias
export const MonthlyTrendChart = memo(MonthlyTrendChartComponent, (prevProps, nextProps) => {
  if (prevProps.height !== nextProps.height) return false
  if (!prevProps.data && !nextProps.data) return true
  if (!prevProps.data || !nextProps.data) return false
  
  // Comparar datos de tendencias
  const prevDatos = prevProps.data.datos || []
  const nextDatos = nextProps.data.datos || []
  
  if (prevDatos.length !== nextDatos.length) return false
  
  return prevDatos.every((item, idx) => {
    const nextItem = nextDatos[idx]
    return nextItem &&
           item.fecha === nextItem.fecha &&
           item.gastos === nextItem.gastos &&
           item.ingresos === nextItem.ingresos &&
           item.balance === nextItem.balance
  })
})