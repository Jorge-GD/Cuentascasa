'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Edit2, Trash2, Settings, ArrowUp, ArrowDown } from 'lucide-react'
import type { ReglaCategorizacion } from '@/lib/types/database'

interface ReglaListProps {
  reglas: ReglaCategorizacion[]
  isLoading: boolean
  onEdit: (regla: ReglaCategorizacion) => void
  onDelete: (reglaId: string) => void
  onToggle: (reglaId: string, activa: boolean) => void
}

const TIPO_LABELS: Record<string, string> = {
  'contiene': 'Contiene',
  'empieza': 'Empieza con',
  'termina': 'Termina con',
  'exacto': 'Exacto',
  'regex': 'Regex'
}

export function ReglaList({ reglas, isLoading, onEdit, onDelete, onToggle }: ReglaListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-5 bg-gray-200 rounded w-16" />
                    <div className="h-5 bg-gray-200 rounded w-12" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-48" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 rounded w-20" />
                    <div className="h-5 bg-gray-200 rounded w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                  <div className="w-12 h-6 bg-gray-200 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (reglas.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay reglas configuradas
          </h3>
          <p className="text-gray-500 mb-6">
            Crea tu primera regla de categorización para automatizar la clasificación de movimientos.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Ordenar reglas por prioridad
  const reglasSorted = [...reglas].sort((a, b) => a.prioridad - b.prioridad)

  return (
    <div className="space-y-4">
      {reglasSorted.map((regla, index) => (
        <Card 
          key={regla.id} 
          className={`transition-all ${regla.activa ? 'hover:shadow-md' : 'opacity-60'}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* Información de la regla */}
              <div className="flex-1 space-y-3">
                {/* Cabecera con nombre y badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-medium text-gray-900 min-w-0">
                    {regla.nombre}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                    >
                      #{regla.prioridad}
                    </Badge>
                    
                    <Badge 
                      variant="secondary"
                      className="text-xs"
                    >
                      {TIPO_LABELS[regla.tipoCoincidencia] || regla.tipoCoincidencia}
                    </Badge>

                    {regla.cuentaId && (
                      <Badge 
                        variant="outline"
                        className="text-xs border-blue-200 text-blue-700"
                      >
                        Solo cuenta actual
                      </Badge>
                    )}

                    <Badge
                      variant={regla.activa ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {regla.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>

                {/* Patrón */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Patrón:</span>{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                    {regla.patron}
                  </code>
                </div>

                {/* Categorización */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Categoriza como:</span>
                  <Badge variant="outline">
                    {regla.categoria}
                  </Badge>
                  {regla.subcategoria && (
                    <>
                      <span className="text-gray-400">→</span>
                      <Badge variant="secondary">
                        {regla.subcategoria}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-3 ml-4">
                {/* Indicador de prioridad */}
                <div className="flex flex-col items-center text-xs text-gray-500">
                  {index > 0 && <ArrowUp className="h-3 w-3" />}
                  <span className="font-mono">{regla.prioridad}</span>
                  {index < reglasSorted.length - 1 && <ArrowDown className="h-3 w-3" />}
                </div>

                {/* Switch de activación */}
                <div className="flex flex-col items-center gap-1">
                  <Switch
                    checked={regla.activa}
                    onCheckedChange={(checked) => onToggle(regla.id, checked)}
                    size="sm"
                  />
                  <span className="text-xs text-gray-500">
                    {regla.activa ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(regla)}
                    className="h-8 w-8 p-0"
                    title="Editar regla"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(regla.id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    title="Eliminar regla"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Información sobre el orden */}
      {reglas.length > 1 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">
                <ArrowUp className="h-4 w-4" />
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Orden de aplicación de reglas</p>
                <p>
                  Las reglas se evalúan en orden de prioridad (número menor = mayor prioridad). 
                  La primera regla que coincida se aplica al movimiento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}