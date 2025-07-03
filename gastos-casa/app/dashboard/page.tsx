'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MetricCard } from '@/components/dashboard/metric-card'
import { SpendingChart } from '@/components/dashboard/spending-chart'
import { CategoryPieChart } from '@/components/charts/category-pie-chart'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'
import { AccountComparisonChart } from '@/components/charts/account-comparison-chart'
import { BudgetAlerts } from '@/components/presupuestos/budget-alerts'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { DashboardMetrics, TrendData, AccountComparisonData } from '@/lib/analytics/metrics'

export default function DashboardPage() {
  const { cuentaActiva, cuentas, fetchCuentas } = useCuentaStore()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [trends, setTrends] = useState<TrendData | null>(null)
  const [comparison, setComparison] = useState<AccountComparisonData | null>(null)
  const [periodo, setPeriodo] = useState('mes')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCuentas()
  }, [fetchCuentas])

  const fetchDashboardData = async () => {
    if (!cuentaActiva) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch dashboard metrics
      const metricsResponse = await fetch(
        `/api/analytics/dashboard?cuentaId=${cuentaActiva.id}&periodo=${periodo}`
      )
      const metricsResult = await metricsResponse.json()

      if (metricsResult.success) {
        setMetrics(metricsResult.data)
      } else {
        throw new Error(metricsResult.error)
      }

      // Fetch trends
      const trendsResponse = await fetch(
        `/api/analytics/trends?cuentaId=${cuentaActiva.id}&tipo=mensual&meses=12`
      )
      const trendsResult = await trendsResponse.json()

      if (trendsResult.success) {
        setTrends(trendsResult.data)
      }

      // Fetch account comparison if multiple accounts
      if (cuentas.length > 1) {
        const cuentaIds = cuentas.map(c => c.id).join(',')
        const comparisonResponse = await fetch(
          `/api/analytics/comparison?cuentaIds=${cuentaIds}&periodo=${periodo}`
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
    }
  }, [cuentaActiva, periodo])

  if (!cuentaActiva) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cuenta seleccionada
            </h3>
            <p className="text-gray-500">
              Selecciona una cuenta para ver el dashboard de gastos e ingresos.
            </p>
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
        
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="trimestre">Este trimestre</SelectItem>
            <SelectItem value="año">Este año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métricas principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          
          {periodo === 'mes' && (
            <MetricCard
              title="Proyección Fin de Mes"
              value={metrics.proyeccionFinMes}
              format="currency"
              icon={Activity}
              description="Estimación basada en gastos actuales"
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
      <BudgetAlerts cuentaId={cuentaActiva.id} compact={true} />

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de categorías */}
        {metrics?.topCategorias && (
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
              <CardDescription>
                Distribución de gastos en el período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryPieChart data={metrics.topCategorias} />
            </CardContent>
          </Card>
        )}

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
              <MonthlyTrendChart data={trends} />
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
            <SpendingChart data={trends.datos} />
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
            <AccountComparisonChart data={comparison} />
          </CardContent>
        </Card>
      )}

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