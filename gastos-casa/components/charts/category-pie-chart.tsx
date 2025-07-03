'use client'

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts'
import { formatCurrency } from '@/lib/analytics/calculations'

interface CategoryPieChartProps {
  data: Array<{
    categoria: string
    total: number
    porcentaje: number
    transacciones: number
  }>
  height?: number
}

const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
  '#f59e0b', // amber-500
]

export function CategoryPieChart({ data, height = 300 }: CategoryPieChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.categoria}</p>
          <p className="text-sm">
            Total: {formatCurrency(data.total)}
          </p>
          <p className="text-sm">
            Porcentaje: {data.porcentaje.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">
            {data.transacciones} transacciones
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, porcentaje }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

    // Solo mostrar porcentaje si es mayor a 5%
    if (porcentaje < 5) return null

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${porcentaje.toFixed(0)}%`}
      </text>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No hay datos de categorías para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={height * 0.35}
            fill="#8884d8"
            dataKey="total"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend personalizada */}
      <div className="grid grid-cols-1 gap-2 text-sm">
        {data.map((entry, index) => (
          <div key={entry.categoria} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-medium">{entry.categoria}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(entry.total)}</div>
              <div className="text-xs text-muted-foreground">
                {entry.porcentaje.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}