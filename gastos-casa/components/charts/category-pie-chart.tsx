'use client'

import { memo, useCallback } from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts'
import { formatCurrency } from '@/lib/analytics/calculations'
import { COLORS, getChartColor } from '@/lib/constants/colors'

interface CategoryPieChartProps {
  data: Array<{
    categoria: string
    total: number
    porcentaje: number
    transacciones: number
  }>
  height?: number
  onCategoryClick?: (categoria: string) => void
}


function CategoryPieChartComponent({ data, height = 300, onCategoryClick }: CategoryPieChartProps) {
  const CustomTooltip = useCallback(({ active, payload }: any) => {
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
          {onCategoryClick && (
            <p className="text-xs text-blue-600 mt-1">
              Click para filtrar por esta categoría
            </p>
          )}
        </div>
      )
    }
    return null
  }, [onCategoryClick])

  const handlePieClick = useCallback((data: any) => {
    if (onCategoryClick && data && data.categoria) {
      onCategoryClick(data.categoria)
    }
  }, [onCategoryClick])

  const CustomLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, porcentaje }: any) => {
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
  }, [])

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
            onClick={handlePieClick}
            className={onCategoryClick ? "cursor-pointer" : ""}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getChartColor(index)} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend personalizada */}
      <div className="grid grid-cols-1 gap-2 text-sm">
        {data.map((entry, index) => (
          <div 
            key={entry.categoria} 
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              onCategoryClick ? 'cursor-pointer hover:bg-gray-50' : ''
            }`}
            onClick={() => onCategoryClick && onCategoryClick(entry.categoria)}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getChartColor(index) }}
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

// Memoizar el gráfico para evitar re-renders costosos
export const CategoryPieChart = memo(CategoryPieChartComponent, (prevProps, nextProps) => {
  // Comparación optimizada para datos de gráfico
  if (prevProps.height !== nextProps.height) return false
  if (prevProps.data.length !== nextProps.data.length) return false
  
  // Comparación por referencia y valores clave
  return prevProps.data.every((item, idx) => {
    const nextItem = nextProps.data[idx]
    return nextItem && 
           item.categoria === nextItem.categoria &&
           item.total === nextItem.total &&
           item.porcentaje === nextItem.porcentaje
  })
})

// Export por defecto para compatibilidad con dynamic imports
export default CategoryPieChart