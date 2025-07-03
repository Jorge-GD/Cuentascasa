'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BudgetManager } from '@/components/presupuestos/budget-manager'
import { BudgetAlerts } from '@/components/presupuestos/budget-alerts'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { Target, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'

export default function PresupuestosPage() {
  const { cuentaActiva } = useCuentaStore()
  const [activeTab, setActiveTab] = useState('manager')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Presupuestos</h1>
          <p className="text-muted-foreground">
            Configura y monitorea presupuestos por categoría para mantener el control de tus gastos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manager" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Configurar Presupuestos
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas y Monitoreo
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análisis y Tendencias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="space-y-6">
          <BudgetManager cuentaId={cuentaActiva?.id} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <BudgetAlerts cuentaId={cuentaActiva?.id} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Consejos para Gestionar Presupuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">🎯 Establece presupuestos realistas</h4>
                  <p className="text-blue-700 text-sm">
                    Revisa tus gastos históricos para establecer presupuestos alcanzables. 
                    Un presupuesto muy restrictivo puede ser contraproducente.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">📊 Revisa regularmente</h4>
                  <p className="text-green-700 text-sm">
                    Ajusta tus presupuestos mensualmente basándote en cambios en tu situación 
                    financiera o en patrones de gasto.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Atención a las alertas</h4>
                  <p className="text-yellow-700 text-sm">
                    Las alertas de proyección te ayudan a tomar decisiones antes de exceder 
                    tus límites. No las ignores.
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">🔄 Flexibilidad</h4>
                  <p className="text-purple-700 text-sm">
                    Si excedes un presupuesto, ajusta otros o revisa si el límite era adecuado. 
                    La rigidez total puede generar estrés innecesario.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Presupuestos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Gráfico de tendencias de presupuestos</p>
                  <p className="text-sm">Próximamente: análisis histórico de cumplimiento</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorías más Problemáticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Análisis de categorías con mayor exceso</p>
                  <p className="text-sm">Próximamente: insights y recomendaciones</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Comparativa Presupuesto vs Gasto Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Gráfico comparativo mensual</p>
                <p className="text-sm">Próximamente: visualización de cumplimiento por mes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}