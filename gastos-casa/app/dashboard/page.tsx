'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { EnhancedFilterBar, FilterState } from '@/components/dashboard/enhanced-filter-bar'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { createRobustDynamicImport, preloadComponents } from '@/lib/utils/dynamic-import-utils'

// Enhanced dynamic imports with robust error handling and retry mechanism
const SpendingChart = createRobustDynamicImport(
  () => import('@/components/dashboard/spending-chart'),
  { componentName: 'SpendingChart', loadingComponent: 'chart' }
)

const CategoryPieChart = createRobustDynamicImport(
  () => import('@/components/charts/category-pie-chart'),
  { componentName: 'CategoryPieChart', loadingComponent: 'chart' }
)

const MonthlyTrendChart = createRobustDynamicImport(
  () => import('@/components/charts/monthly-trend-chart'),
  { componentName: 'MonthlyTrendChart', loadingComponent: 'chart' }
)

const AccountComparisonChart = createRobustDynamicImport(
  () => import('@/components/charts/account-comparison-chart'),
  { componentName: 'AccountComparisonChart', loadingComponent: 'chart' }
)

const BudgetAlerts = createRobustDynamicImport(
  () => import('@/components/presupuestos/budget-alerts'),
  { componentName: 'BudgetAlerts', loadingComponent: 'default' }
)

const Plan503020Module = createRobustDynamicImport(
  () => import('@/components/plan503020/Plan503020Module'),
  { componentName: 'Plan503020Module', loadingComponent: 'default' }
)
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { useClientCuentaStore } from '@/hooks/use-cuenta-store'
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity, CreditCard } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { DashboardMetrics, TrendData, AccountComparisonData } from '@/lib/analytics/metrics'
import type { CategoriaWithSubcategorias } from '@/lib/types/database'

export default function DashboardPage() {
  const { cuentaActiva, cuentas, fetchCuentas, isLoading: storeLoading, isHydrated } = useClientCuentaStore()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [trends, setTrends] = useState<TrendData | null>(null)
  const [comparison, setComparison] = useState<AccountComparisonData | null>(null)
  const [periodo, setPeriodo] = useState('mes')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaWithSubcategorias[]>([])
  const [detailedCategories, setDetailedCategories] = useState<any[]>([])
  const [filters, setFilters] = useState<FilterState>({
    periodo: 'mes',
    cuentaIds: [],
    categoriaIds: [],
    subcategoriaIds: []
  })

  // Asegurar que solo se ejecute en el cliente
  useEffect(() => {
    setIsClient(true)
    if (isHydrated) {
      fetchCuentas()
      fetchCategorias()
      
      // Preload componentes críticos para mejor rendimiento
      preloadComponents([
        { importFunction: () => import('@/components/charts/monthly-trend-chart'), name: 'MonthlyTrendChart' },
        { importFunction: () => import('@/components/charts/account-comparison-chart'), name: 'AccountComparisonChart' },
        { importFunction: () => import('@/components/plan503020/Plan503020Module'), name: 'Plan503020Module' }
      ]).then(({ success, failed }) => {
        console.log(`Component preloading: ${success} successful, ${failed} failed`)
      })
    }
  }, [fetchCuentas, isHydrated])

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

  // Manejar el estado de loading inicial
  useEffect(() => {
    if (isClient && isHydrated && !storeLoading) {
      setIsLoading(false)
    }
  }, [isClient, storeLoading, isHydrated])

  const fetchDashboardData = async () => {
    if (!cuentaActiva) return

    setIsLoading(true)
    setError(null)
    console.log('Fetching dashboard data for cuenta:', cuentaActiva.id, 'filters:', filters)

    try {
      // Build query params based on filters
      const queryParams = new URLSearchParams()
      
      // Handle account filtering
      const targetCuentaIds = filters.cuentaIds.length > 0 ? filters.cuentaIds : [cuentaActiva.id]
      queryParams.append('cuentaId', targetCuentaIds.join(','))
      queryParams.append('periodo', filters.periodo)
      
      // Add date range if custom period
      if (filters.periodo === 'personalizado' && filters.fechaCustom?.from) {
        queryParams.append('fechaDesde', filters.fechaCustom.from.toISOString())
        if (filters.fechaCustom.to) {
          queryParams.append('fechaHasta', filters.fechaCustom.to.toISOString())
        }
      }
      
      // Add category filters
      if (filters.categoriaIds.length > 0) {
        queryParams.append('categoriaIds', filters.categoriaIds.join(','))
      }
      
      if (filters.subcategoriaIds.length > 0) {
        queryParams.append('subcategoriaIds', filters.subcategoriaIds.join(','))
      }

      // Fetch dashboard metrics
      const metricsResponse = await fetch(
        `/api/analytics/dashboard?${queryParams.toString()}`
      )
      const metricsResult = await metricsResponse.json()
      console.log('Metrics result:', metricsResult)

      if (metricsResult.success) {
        setMetrics(metricsResult.data)
      } else {
        throw new Error(metricsResult.error)
      }

      // Fetch detailed categories for donut chart
      const categoriesResponse = await fetch(
        `/api/analytics/categories?cuentaId=${targetCuentaIds[0]}&periodo=${filters.periodo}`
      )
      const categoriesResult = await categoriesResponse.json()

      if (categoriesResult.success) {
        setDetailedCategories(categoriesResult.data)
      }

      // Fetch trends
      const trendsResponse = await fetch(
        `/api/analytics/trends?${queryParams.toString()}&tipo=mensual&meses=12`
      )
      const trendsResult = await trendsResponse.json()

      if (trendsResult.success) {
        setTrends(trendsResult.data)
      }

      // Fetch account comparison if multiple accounts
      if (cuentas.length > 1) {
        const cuentaIds = cuentas.map(c => c.id).join(',')
        const comparisonResponse = await fetch(
          `/api/analytics/comparison?cuentaIds=${cuentaIds}&periodo=${filters.periodo}`
        )
        const comparisonResult = await comparisonResponse.json()

        if (comparisonResult.success) {
          setComparison(comparisonResult.data)
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar datos del dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (cuentaActiva) {
      fetchDashboardData()
    } else {
      setIsLoading(false)
    }
  }, [cuentaActiva, filters])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    // Also update the legacy periodo state for backward compatibility
    setPeriodo(newFilters.periodo)
  }

  const handleCategoryClick = (categoria: string) => {
    // Find the categoria ID from the categorias list
    const categoriaObj = categorias.find(cat => cat.nombre === categoria)
    if (categoriaObj) {
      const newFilters = {
        ...filters,
        categoriaIds: filters.categoriaIds.includes(categoriaObj.id) 
          ? filters.categoriaIds.filter(id => id !== categoriaObj.id)
          : [...filters.categoriaIds, categoriaObj.id]
      }
      setFilters(newFilters)
    }
  }

  // Mostrar loading mientras se inicializa el cliente
  if (!isClient || !isHydrated || storeLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Cargando dashboard...</h3>
            <p className="text-muted-foreground">
              Inicializando datos de la aplicación
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!cuentaActiva && cuentas.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cuentas configuradas
            </h3>
            <p className="text-gray-500 mb-6">
              Crea tu primera cuenta para empezar a gestionar tus gastos e ingresos.
            </p>
            <Button asChild>
              <Link href="/cuentas/nueva">
                <CreditCard className="w-4 h-4 mr-2" />
                Crear primera cuenta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!cuentaActiva) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cuenta seleccionada
            </h3>
            <p className="text-gray-500 mb-6">
              Selecciona una cuenta para ver el dashboard de gastos e ingresos.
            </p>
            <Button asChild>
              <Link href="/cuentas">
                Ver cuentas disponibles
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen financiero de {cuentaActiva.nombre}
          </p>
        </div>
        
        {/* Enlaces a vistas detalladas */}
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/transacciones">
              Ver Todas las Transacciones
            </Link>
          </Button>
          
          <button
            onClick={async () => {
              const response = await fetch(`/api/debug/movimientos?cuentaId=${cuentaActiva.id}`)
              const result = await response.json()
              console.log('DEBUG - Movimientos en BD:', result)
              alert(`Movimientos en BD: ${result.data?.totalMovimientos || 0}`)
            }}
            className="px-3 py-1 bg-gray-200 rounded text-sm"
          >
            Debug DB
          </button>
        </div>
      </div>

      {/* Enhanced Filter Bar */}
      <EnhancedFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        cuentas={cuentas}
        categorias={categorias}
        isLoading={isLoading}
      />

      {/* Métricas principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Gastos Totales"
            value={metrics.gastoTotal}
            format="currency"
            change={metrics.comparacionMesAnterior.porcentajeGastos}
            icon={TrendingDown}
            description={`${metrics.transacciones} transacciones`}
          />
          
          <MetricCard
            title="Ingresos Totales"
            value={metrics.ingresoTotal}
            format="currency"
            change={metrics.comparacionMesAnterior.porcentajeIngresos}
            icon={TrendingUp}
            description="Ingresos del período"
          />
          
          <MetricCard
            title="Balance"
            value={metrics.balance}
            format="currency"
            icon={DollarSign}
            description="Diferencia ingresos - gastos"
            variant={metrics.balance >= 0 ? 'positive' : 'negative'}
          />

          <MetricCard
            title="Tasa de Ahorro"
            value={metrics.tasaAhorro}
            format="percentage"
            change={metrics.tasaAhorro - metrics.comparacionMesAnterior.tasaAhorro}
            icon={TrendingUp}
            description="Porcentaje de ingresos ahorrados"
            variant={metrics.tasaAhorro > 0 ? 'positive' : metrics.tasaAhorro < 0 ? 'negative' : 'neutral'}
          />
          
          {periodo === 'mes' && (
            <MetricCard
              title="Proyección Fin de Mes"
              value={metrics.proyeccionFinMes}
              format="currency"
              icon={Activity}
              description="Saldo estimado al final del mes"
              tooltip={metrics.explicacionProyeccion}
            />
          )}
        </div>
      )}

      {/* Alertas */}
      {metrics?.alertas && metrics.alertas.length > 0 && (
        <div className="space-y-2">
          {metrics.alertas.map((alerta, index) => (
            <Alert 
              key={index}
              variant={alerta.severidad === 'error' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alerta.mensaje}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Alertas de Presupuesto */}
      {/* TODO: Arreglar props de BudgetAlerts */}
      {/* <BudgetAlerts cuentaId={cuentaActiva.id} compact={true} /> */}

      {/* Módulo Plan 50/30/20 */}
      <Plan503020Module />

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 gap-6">
        {/* Gráfico de categorías mejorado */}
        {detailedCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Gastos</CardTitle>
              <CardDescription>
                Análisis interactivo por categorías y subcategorías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryDonutChart 
                data={detailedCategories} 
                height={400}
                onCategoryClick={handleCategoryClick}
                onSubcategoryClick={(categoria, subcategoria) => {
                  console.log('Subcategory clicked:', categoria, subcategoria)
                  // Aquí puedes agregar lógica adicional para filtrar por subcategoría
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfico de evolución */}
        {trends && (
          <Card>
            <CardHeader>
              <CardTitle>Evolución Mensual</CardTitle>
              <CardDescription>
                Tendencia de gastos e ingresos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trends.datos.slice(-6).map((dato) => (
                  <div key={dato.fecha} className="flex justify-between items-center">
                    <span className="text-sm">{dato.fechaFormateada}</span>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Gastos</div>
                        <div className="text-sm font-medium text-red-600">€{dato.gastos.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Ingresos</div>
                        <div className="text-sm font-medium text-green-600">€{dato.ingresos.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráfico de gastos en el tiempo */}
      {trends && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen Temporal</CardTitle>
            <CardDescription>
              {trends.periodo} - Promedio de gastos: €{trends.promedios.gastos.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-2xl font-bold mb-2">€{trends.promedios.gastos.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Promedio de gastos mensual</div>
              <div className="mt-4 text-sm">
                Balance promedio: <span className={`font-medium ${trends.promedios.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{trends.promedios.balance.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparación entre cuentas */}
      {comparison && comparison.cuentas.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparación entre Cuentas</CardTitle>
            <CardDescription>
              Gastos e ingresos por cuenta en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.cuentas.map((cuenta) => (
                <div key={cuenta.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{cuenta.nombre}</div>
                    <div className="text-sm text-muted-foreground">{cuenta.transacciones} transacciones</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Balance: €{cuenta.balance.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      G: €{cuenta.gastos.toFixed(2)} | I: €{cuenta.ingresos.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acceso rápido al análisis comparativo */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <TrendingUp className="h-5 w-5" />
            Análisis Comparativo Temporal
          </CardTitle>
          <CardDescription className="text-blue-600">
            Compara la evolución de tus gastos e ingresos entre diferentes años
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-blue-700">
                ¿Estás gastando más este mes que el año pasado?
              </p>
              <p className="text-xs text-blue-600">
                Analiza tendencias y patrones temporales en tu historia financiera
              </p>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/analisis-comparativo">
                Ver Análisis
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p>Cargando datos del dashboard...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}