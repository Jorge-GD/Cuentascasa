'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingDown, 
  TrendingUp, 
  Calendar,
  Filter,
  BarChart3,
  LineChart
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AnalysisConfig {
  tipo: 'gastos' | 'ingresos'
  años: number[]
  vista: 'lineas' | 'barras'
  incluirPromedio: boolean
}

interface AnalysisTypeSelectorProps {
  config: AnalysisConfig
  onConfigChange: (config: AnalysisConfig) => void
  availableYears: number[]
  isLoading?: boolean
}

export function AnalysisTypeSelector({ 
  config, 
  onConfigChange, 
  availableYears = [],
  isLoading = false 
}: AnalysisTypeSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleTipoChange = (tipo: 'gastos' | 'ingresos') => {
    onConfigChange({
      ...config,
      tipo
    })
  }

  const handleYearToggle = (año: number) => {
    const nuevosAños = config.años.includes(año)
      ? config.años.filter(a => a !== año)
      : [...config.años, año].sort((a, b) => b - a) // Ordenar descendente

    // Limitar a máximo 5 años para mantener legibilidad
    if (nuevosAños.length <= 5) {
      onConfigChange({
        ...config,
        años: nuevosAños
      })
    }
  }

  const handleSelectAllRecentYears = () => {
    const recentYears = availableYears.slice(0, 3) // Los 3 años más recientes
    onConfigChange({
      ...config,
      años: recentYears
    })
  }

  const handleVistaChange = (vista: 'lineas' | 'barras') => {
    onConfigChange({
      ...config,
      vista
    })
  }

  const togglePromedio = () => {
    onConfigChange({
      ...config,
      incluirPromedio: !config.incluirPromedio
    })
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Selector principal de tipo */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Tipo de Análisis</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={config.tipo === 'gastos' ? 'default' : 'outline'}
              onClick={() => handleTipoChange('gastos')}
              disabled={isLoading}
              className="h-16 flex-col gap-1"
            >
              <TrendingDown className="h-5 w-5" />
              <span>Gastos</span>
              <span className="text-xs text-muted-foreground">
                Comparar gastos por mes
              </span>
            </Button>
            
            <Button
              variant={config.tipo === 'ingresos' ? 'default' : 'outline'}
              onClick={() => handleTipoChange('ingresos')}
              disabled={isLoading}
              className="h-16 flex-col gap-1"
            >
              <TrendingUp className="h-5 w-5" />
              <span>Ingresos</span>
              <span className="text-xs text-muted-foreground">
                Comparar ingresos por mes
              </span>
            </Button>
          </div>
        </div>

        {/* Configuración avanzada */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Configuración Avanzada</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {isExpanded ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>

          {isExpanded && (
            <div className="space-y-4 pt-2 border-t">
              {/* Selector de años */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Años a Comparar ({config.años.length}/5)
                  </Label>
                  {availableYears.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllRecentYears}
                      disabled={isLoading}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Últimos 3 años
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {availableYears.map(año => (
                    <Button
                      key={año}
                      variant={config.años.includes(año) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleYearToggle(año)}
                      disabled={isLoading || (!config.años.includes(año) && config.años.length >= 5)}
                      className="h-8"
                    >
                      {año}
                      {config.años.includes(año) && (
                        <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                          ✓
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
                
                {config.años.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Selecciona al menos un año para comenzar el análisis
                  </p>
                )}
                
                {config.años.length >= 5 && (
                  <p className="text-sm text-amber-600">
                    Máximo 5 años para mantener la legibilidad del gráfico
                  </p>
                )}
              </div>

              {/* Tipo de visualización */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Gráfico</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={config.vista === 'lineas' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleVistaChange('lineas')}
                    disabled={isLoading}
                    className="justify-start"
                  >
                    <LineChart className="h-4 w-4 mr-2" />
                    Líneas
                  </Button>
                  
                  <Button
                    variant={config.vista === 'barras' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleVistaChange('barras')}
                    disabled={isLoading}
                    className="justify-start"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Barras
                  </Button>
                </div>
              </div>

              {/* Opciones adicionales */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Opciones</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={config.incluirPromedio ? 'default' : 'outline'}
                    size="sm"
                    onClick={togglePromedio}
                    disabled={isLoading}
                  >
                    {config.incluirPromedio ? '✓' : '○'} Línea de promedio
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumen de configuración */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Configuración actual:</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {config.tipo === 'gastos' ? 'Gastos' : 'Ingresos'}
              </Badge>
              <Badge variant="outline">
                {config.años.length} año{config.años.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline">
                {config.vista === 'lineas' ? 'Líneas' : 'Barras'}
              </Badge>
            </div>
          </div>
          
          {config.años.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Años: {config.años.join(', ')}
            </div>
          )}
        </div>

        {/* Información útil */}
        <div className="text-xs text-muted-foreground space-y-1 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium text-blue-800">💡 Consejos de uso:</p>
          <ul className="space-y-1 text-blue-700">
            <li>• Selecciona 2-3 años para comparaciones más claras</li>
            <li>• Usa filtros de categorías para análisis específicos</li>
            <li>• La línea de promedio ayuda a identificar tendencias</li>
            <li>• Haz click en los puntos del gráfico para ver detalles</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}