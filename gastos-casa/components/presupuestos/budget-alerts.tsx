'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, TrendingUp, Target, X, Eye, EyeOff } from 'lucide-react'
import { formatCurrency } from '@/lib/analytics/calculations'

interface BudgetAlert {
  id: string
  categoria: string
  tipo: 'warning' | 'exceeded' | 'projected_exceeded'
  presupuesto: number
  gastoActual: number
  porcentajeUsado: number
  proyeccion?: number
  mensaje: string
  severidad: 'info' | 'warning' | 'error'
}

interface BudgetAlertsProps {
  cuentaId?: string
  compact?: boolean
}

export function BudgetAlerts({ cuentaId, compact = false }: BudgetAlertsProps) {
  const [alertas, setAlertas] = useState<BudgetAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [cuentaId])

  const loadAlerts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (cuentaId) params.append('cuentaId', cuentaId)
      
      const response = await fetch(`/api/presupuestos/alerts?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAlertas(data.data)
      }
    } catch (error) {
      console.error('Error loading budget alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const getAlertIcon = (tipo: string, severidad: string) => {
    if (tipo === 'exceeded') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    } else if (tipo === 'projected_exceeded') {
      return <TrendingUp className="h-4 w-4 text-orange-500" />
    }
    return <Target className="h-4 w-4 text-yellow-500" />
  }

  const getAlertColor = (severidad: string) => {
    switch (severidad) {
      case 'error': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      default: return 'border-blue-200 bg-blue-50'
    }
  }

  const getSeverityBadge = (severidad: string, tipo: string) => {
    switch (severidad) {
      case 'error':
        return <Badge variant="destructive">Crítico</Badge>
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          {tipo === 'projected_exceeded' ? 'Proyección' : 'Advertencia'}
        </Badge>
      default:
        return <Badge variant="outline">Info</Badge>
    }
  }

  const visibleAlerts = alertas.filter(alert => !dismissedAlerts.has(alert.id))
  const displayAlerts = compact && !showAll ? visibleAlerts.slice(0, 3) : visibleAlerts

  if (isLoading) {
    return (
      <Card className={compact ? "border-0 shadow-none" : ""}>
        <CardContent className={compact ? "p-0" : "p-6"}>
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (visibleAlerts.length === 0) {
    return compact ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Alertas de Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-green-600">
            <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">¡Todo bajo control!</p>
            <p className="text-sm text-gray-500">No hay alertas de presupuesto en este momento</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const content = (
    <div className="space-y-3">
      {displayAlerts.map((alerta) => (
        <Alert key={alerta.id} className={getAlertColor(alerta.severidad)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {getAlertIcon(alerta.tipo, alerta.severidad)}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{alerta.categoria}</span>
                  {getSeverityBadge(alerta.severidad, alerta.tipo)}
                </div>
                
                <AlertDescription className="text-sm">
                  {alerta.mensaje}
                </AlertDescription>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Gastado: {formatCurrency(alerta.gastoActual)}</span>
                    <span>Presupuesto: {formatCurrency(alerta.presupuesto)}</span>
                  </div>
                  <Progress 
                    value={Math.min(alerta.porcentajeUsado, 100)} 
                    className="h-2"
                  />
                  {alerta.proyeccion && (
                    <div className="text-xs text-gray-500">
                      Proyección fin de mes: {formatCurrency(alerta.proyeccion)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissAlert(alerta.id)}
              className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Alert>
      ))}
      
      {compact && visibleAlerts.length > 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Mostrar menos
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Ver todas las alertas ({visibleAlerts.length - 3} más)
            </>
          )}
        </Button>
      )}
    </div>
  )

  if (compact) {
    return content
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alertas de Presupuesto
          </div>
          <Badge variant="secondary">{visibleAlerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}

// Export por defecto para compatibilidad con dynamic imports
export default BudgetAlerts