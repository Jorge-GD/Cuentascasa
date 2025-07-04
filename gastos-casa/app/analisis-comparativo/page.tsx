'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedFilterBar, FilterState } from '@/components/dashboard/enhanced-filter-bar'
import { AnalysisTypeSelector } from '@/components/analytics/analysis-type-selector'
import { MultiYearComparisonChart } from '@/components/charts/multi-year-comparison-chart'
import { LoadingSkeleton } from '@/components/common/loading-states'
import { useClientCuentaStore } from '@/hooks/use-cuenta-store'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, BarChart3, RefreshCw, Download, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CategoriaWithSubcategorias } from '@/lib/types/database'

interface AnalysisConfig {
  tipo: 'gastos' | 'ingresos'
  años: number[]
  vista: 'lineas' | 'barras'
  incluirPromedio: boolean
}

interface ComparativeData {
  años: Array<{
    año: number
    datos: Array<{
      mes: number
      mesNombre: string
      valor: number
      transacciones: number
    }>
    total: number
    promedio: number
  }>
  tipo: 'gastos' | 'ingresos'
  resumen: {
    mejorAño: number
    peorAño: number
    tendencia: 'ascendente' | 'descendente' | 'estable'
    variacionPromedio: number
  }
}

export default function AnalisisComparativoPage() {
  const { cuentaActiva, cuentas, fetchCuentas, isLoading: storeLoading, isHydrated } = useClientCuentaStore()
  
  // Estados principales
  const [data, setData] = useState<ComparativeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaWithSubcategorias[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Estados de configuración
  const [filters, setFilters] = useState<FilterState>({
    periodo: 'mes',
    cuentaIds: [],
    categoriaIds: [],
    subcategoriaIds: []
  })

  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>({
    tipo: 'gastos',
    años: [],
    vista: 'lineas',
    incluirPromedio: true
  })

  // Inicialización
  useEffect(() => {
    setIsClient(true)
    if (isHydrated) {
      fetchCuentas()
      fetchCategorias()
      fetchAvailableYears()
    }
  }, [fetchCuentas, isHydrated])

  // Configurar filtros iniciales cuando se carga la cuenta activa
  useEffect(() => {
    if (cuentaActiva && filters.cuentaIds.length === 0) {
      setFilters(prev => ({
        ...prev,
        cuentaIds: [cuentaActiva.id]
      }))
    }
  }, [cuentaActiva])

  // Fetch datos cuando cambien los filtros o la configuración
  useEffect(() => {
    if (analysisConfig.años.length > 0 && (filters.cuentaIds.length > 0 || cuentaActiva)) {
      fetchComparativeData()
    }
  }, [analysisConfig, filters, cuentaActiva])

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/categorias')
      const result = await response.json()
      if (result.success) {
        setCategorias(result.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchAvailableYears = async () => {
    try {
      if (!cuentaActiva) return
      
      const response = await fetch(`/api/analytics/years?cuentaId=${cuentaActiva.id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const years = result.data || []
          setAvailableYears(years)
          
          // Auto-seleccionar los últimos 2 años si hay datos
          if (years.length >= 2 && analysisConfig.años.length === 0) {
            setAnalysisConfig(prev => ({
              ...prev,
              años: years.slice(0, 2)
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching available years:', error)
    }
  }

  const fetchComparativeData = async () => {
    if (!analysisConfig.años.length || !filters.cuentaIds.length) return

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        cuentaIds: filters.cuentaIds.join(','),
        tipo: analysisConfig.tipo,
        años: analysisConfig.años.join(',')
      })

      if (filters.categoriaIds.length > 0) {
        queryParams.append('categoriaIds', filters.categoriaIds.join(','))
      }

      if (filters.subcategoriaIds.length > 0) {
        queryParams.append('subcategoriaIds', filters.subcategoriaIds.join(','))
      }

      const response = await fetch(`/api/analytics/comparative?${queryParams}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Error al cargar datos comparativos')
      }
    } catch (error) {
      console.error('Error fetching comparative data:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const handleAnalysisConfigChange = (newConfig: AnalysisConfig) => {
    setAnalysisConfig(newConfig)
  }

  const handleMonthClick = (mes: number, año: number) => {
    console.log(`Clicked month ${mes} of year ${año}`)
    // Aquí puedes implementar navegación a vista detallada del mes
    // Por ejemplo: router.push(`/cuentas/${cuentaActiva?.id}/mensual/${año}-${mes.toString().padStart(2, '0')}`)
  }

  const handleRefresh = () => {
    fetchComparativeData()
  }

  const handleExport = () => {
    if (!data) return
    
    // Implementar exportación a CSV/Excel
    console.log('Exporting data...', data)
    // TODO: Implementar funcionalidad de exportación
  }

  // Loading inicial
  if (!isClient || !isHydrated || storeLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Análisis Comparativo
          </h1>
          <p className="text-muted-foreground">
            Compara la evolución de tus gastos e ingresos a lo largo del tiempo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading || !data}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros globales */}
      <EnhancedFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        cuentas={cuentas}
        categorias={categorias}
        isLoading={isLoading}
      />

      {/* Configuración del análisis */}
      <AnalysisTypeSelector
        config={analysisConfig}
        onConfigChange={handleAnalysisConfigChange}
        availableYears={availableYears}
        isLoading={isLoading}
      />

      {/* Alertas y estados */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!cuentaActiva && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Selecciona una cuenta para comenzar el análisis comparativo
          </AlertDescription>
        </Alert>
      )}

      {availableYears.length === 0 && cuentaActiva && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No hay datos suficientes para realizar comparaciones. 
            Asegúrate de tener movimientos registrados en diferentes años.
          </AlertDescription>
        </Alert>
      )}

      {analysisConfig.años.length === 0 && availableYears.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Selecciona al menos un año en la configuración para ver el análisis comparativo
          </AlertDescription>
        </Alert>
      )}

      {/* Contenido principal */}
      {data && analysisConfig.años.length > 0 && (
        <div className="space-y-6">
          {/* Información del análisis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Análisis Comparativo de {data.tipo}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {data.años.length} año{data.años.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline">
                    {filters.categoriaIds.length > 0 
                      ? `${filters.categoriaIds.length} categorías` 
                      : 'Todas las categorías'
                    }
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Comparación temporal de {data.tipo} entre {data.años.map(a => a.año).join(', ')}
                {filters.categoriaIds.length > 0 && (
                  <span> · Filtrado por categorías seleccionadas</span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Gráfico principal */}
          <MultiYearComparisonChart
            data={data}
            height={450}
            showSummary={true}
            onMonthClick={handleMonthClick}
          />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p>Cargando análisis comparativo...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}