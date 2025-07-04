'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts'
import { formatCurrency } from '@/lib/analytics/calculations'
import { getChartColor } from '@/lib/constants/colors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SubcategoryData {
  nombre: string
  total: number
  porcentaje: number
  transacciones: number
}

interface CategoryData {
  categoria: string
  total: number
  porcentaje: number
  transacciones: number
  color?: string
  subcategorias?: SubcategoryData[]
}

interface CategoryDonutChartProps {
  data: CategoryData[]
  height?: number
  onCategoryClick?: (categoria: string) => void
  onSubcategoryClick?: (categoria: string, subcategoria: string) => void
}

export function CategoryDonutChart({ 
  data, 
  height = 350,
  onCategoryClick,
  onSubcategoryClick 
}: CategoryDonutChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)

  // Process data to include subcategories if not already present
  const processedData = useMemo(() => {
    return data.map((cat, index) => ({
      ...cat,
      color: getChartColor(index),
      subcategorias: cat.subcategorias || []
    }))
  }, [data])

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isSubcategory = selectedCategory !== null
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.nombre || data.categoria}</p>
          <p className="text-sm font-semibold">
            {formatCurrency(data.total)}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.porcentaje.toFixed(1)}% del {isSubcategory ? 'gasto en ' + selectedCategory.categoria : 'total'}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.transacciones} transacciones
          </p>
          {!isSubcategory && data.subcategorias?.length > 0 && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              Click para ver desglose <ChevronRight className="h-3 w-3" />
            </p>
          )}
        </div>
      )
    }
    return null
  }, [selectedCategory])

  // Handle pie click for main categories
  const handleMainPieClick = useCallback((data: any) => {
    if (data.subcategorias && data.subcategorias.length > 0) {
      setSelectedCategory(data)
    }
    if (onCategoryClick) {
      onCategoryClick(data.categoria)
    }
  }, [onCategoryClick])

  // Handle pie click for subcategories
  const handleSubPieClick = useCallback((data: any) => {
    if (onSubcategoryClick && selectedCategory) {
      onSubcategoryClick(selectedCategory.categoria, data.nombre)
    }
  }, [onSubcategoryClick, selectedCategory])

  // Custom label for the center of the donut
  const renderCenterLabel = useCallback((viewBox: any) => {
    const { cx, cy } = viewBox
    const total = selectedCategory 
      ? selectedCategory.total
      : data.reduce((sum, item) => sum + item.total, 0)
    
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
        <tspan x={cx} y={cy - 10} className="text-2xl font-bold fill-current">
          {formatCurrency(total)}
        </tspan>
        <tspan x={cx} y={cy + 15} className="text-sm fill-muted-foreground">
          {selectedCategory ? selectedCategory.categoria : 'Total gastos'}
        </tspan>
      </text>
    )
  }, [data, selectedCategory])

  // Reset selection when data changes significantly
  useEffect(() => {
    if (selectedCategory && !data.find(cat => cat.categoria === selectedCategory.categoria)) {
      setSelectedCategory(null)
    }
  }, [data, selectedCategory])

  const currentData = selectedCategory?.subcategorias || processedData
  const isShowingSubcategories = !!selectedCategory

  // Helper to get the correct name field
  const getName = (entry: any) => entry.nombre || entry.categoria
  const getDisplayData = (entry: any, index: number) => {
    const isMainCategory = !isShowingSubcategories
    const name = getName(entry)
    const color = isMainCategory 
      ? entry.color || getChartColor(index)
      : getChartColor(data.findIndex(cat => cat.categoria === selectedCategory?.categoria) * 10 + index)
    const hasSubcategories = isMainCategory && (entry.subcategorias?.length || 0) > 0
    const subcategoriasCount = entry.subcategorias?.length || 0
    
    return { entry, name, color, hasSubcategories, subcategoriasCount }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isShowingSubcategories && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          )}
          <h3 className="text-lg font-medium">
            {isShowingSubcategories 
              ? `Desglose de ${selectedCategory.categoria}`
              : 'Gastos por Categoría'
            }
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Section */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={isShowingSubcategories ? 'subcategories' : 'categories'}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                  <Pie
                    data={currentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={height * 0.35}
                    innerRadius={height * 0.2}
                    fill="#8884d8"
                    dataKey="total"
                    animationBegin={0}
                    animationDuration={600}
                    onClick={isShowingSubcategories ? handleSubPieClick : handleMainPieClick}
                    onMouseEnter={(_, index) => setHoveredSegment(getName(currentData[index]))}
                    onMouseLeave={() => setHoveredSegment(null)}
                    label={renderCenterLabel}
                  >
                    {currentData.map((entry, index) => {
                      const { color, hasSubcategories, name } = getDisplayData(entry, index)
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={color}
                          className={`transition-all duration-200 ${
                            hoveredSegment === name 
                              ? 'opacity-100' 
                              : hoveredSegment 
                                ? 'opacity-60' 
                                : 'opacity-100'
                          } ${
                            hasSubcategories || (isShowingSubcategories && onSubcategoryClick)
                              ? 'cursor-pointer' 
                              : ''
                          }`}
                        />
                      )
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Legend Section */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={isShowingSubcategories ? 'sub-legend' : 'main-legend'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {currentData.map((entry, index) => {
                const { color, hasSubcategories, name, subcategoriasCount } = getDisplayData(entry, index)
                
                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                      hasSubcategories || (isShowingSubcategories && onSubcategoryClick)
                        ? 'cursor-pointer hover:bg-gray-50' 
                        : ''
                    } ${
                      hoveredSegment === name ? 'bg-gray-50 shadow-sm' : ''
                    }`}
                    onClick={() => {
                      if (isShowingSubcategories) {
                        handleSubPieClick(entry)
                      } else if (hasSubcategories) {
                        handleMainPieClick(entry)
                      }
                    }}
                    onMouseEnter={() => setHoveredSegment(name)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full transition-transform duration-200"
                        style={{ 
                          backgroundColor: color,
                          transform: hoveredSegment === name ? 'scale(1.2)' : 'scale(1)'
                        }}
                      />
                      <div>
                        <span className="font-medium text-sm">{name}</span>
                        {hasSubcategories && (
                          <p className="text-xs text-muted-foreground">
                            {subcategoriasCount} subcategorías
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCurrency(entry.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.porcentaje.toFixed(1)}% • {entry.transacciones} trans.
                      </div>
                      {hasSubcategories && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Categorías</p>
          <p className="text-lg font-semibold">
            {isShowingSubcategories ? selectedCategory.subcategorias?.length || 0 : data.length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">
            {formatCurrency(
              isShowingSubcategories 
                ? selectedCategory.total 
                : data.reduce((sum, cat) => sum + cat.total, 0)
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Transacciones</p>
          <p className="text-lg font-semibold">
            {isShowingSubcategories 
              ? selectedCategory.transacciones 
              : data.reduce((sum, cat) => sum + cat.transacciones, 0)
            }
          </p>
        </div>
      </div>
    </div>
  )
}