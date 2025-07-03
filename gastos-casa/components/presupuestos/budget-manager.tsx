'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, DollarSign, Edit, Plus, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/analytics/calculations'

interface Categoria {
  id: string
  nombre: string
  color: string
  presupuesto?: number
}

interface PresupuestoData {
  categoriaId: string
  categoria: string
  presupuestoMensual: number
  gastoActual: number
  porcentajeUsado: number
  diasRestantes: number
  proyeccionFinMes: number
  estado: 'ok' | 'warning' | 'exceeded'
}

interface BudgetManagerProps {
  cuentaId?: string
}

export function BudgetManager({ cuentaId }: BudgetManagerProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [presupuestos, setPresupuestos] = useState<PresupuestoData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [newBudget, setNewBudget] = useState('')

  useEffect(() => {
    loadData()
  }, [cuentaId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Cargar categorías
      const categoriasRes = await fetch('/api/categorias')
      const categoriasData = await categoriasRes.json()
      if (categoriasData.success) {
        setCategorias(categoriasData.data)
      }

      // Cargar datos de presupuestos
      const params = new URLSearchParams()
      if (cuentaId) params.append('cuentaId', cuentaId)
      
      const presupuestosRes = await fetch(`/api/presupuestos?${params}`)
      const presupuestosData = await presupuestosRes.json()
      if (presupuestosData.success) {
        setPresupuestos(presupuestosData.data)
      }
    } catch (error) {
      console.error('Error loading budget data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateBudget = async (categoriaId: string, presupuesto: number) => {
    try {
      const response = await fetch(`/api/categorias/${categoriaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto })
      })

      if (response.ok) {
        await loadData()
        setIsEditModalOpen(false)
        setEditingCategoria(null)
        setNewBudget('')
      }
    } catch (error) {
      console.error('Error updating budget:', error)
    }
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'ok': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'exceeded': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (estado: string, porcentaje: number) => {
    switch (estado) {
      case 'ok':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">En límite</Badge>
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Cerca del límite</Badge>
      case 'exceeded':
        return <Badge variant="destructive">Excedido ({porcentaje}%)</Badge>
      default:
        return <Badge variant="outline">Sin datos</Badge>
    }
  }

  const totalPresupuesto = presupuestos.reduce((sum, p) => sum + p.presupuestoMensual, 0)
  const totalGastado = presupuestos.reduce((sum, p) => sum + p.gastoActual, 0)
  const porcentajeTotalUsado = totalPresupuesto > 0 ? (totalGastado / totalPresupuesto) * 100 : 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Gestión de Presupuestos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen general */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Resumen de Presupuestos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPresupuesto)}
              </div>
              <div className="text-sm text-gray-500">Presupuesto Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalGastado)}
              </div>
              <div className="text-sm text-gray-500">Gastado Este Mes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPresupuesto - totalGastado)}
              </div>
              <div className="text-sm text-gray-500">Restante</div>
            </div>
          </div>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm">
              <span>Progreso total</span>
              <span>{porcentajeTotalUsado.toFixed(1)}%</span>
            </div>
            <Progress 
              value={Math.min(porcentajeTotalUsado, 100)} 
              className="h-3"
            />
          </div>

          {porcentajeTotalUsado > 80 && (
            <Alert className={porcentajeTotalUsado > 100 ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {porcentajeTotalUsado > 100 
                  ? "¡Has excedido tu presupuesto total mensual!"
                  : "Te estás acercando al límite de tu presupuesto mensual."
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de presupuestos por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuestos por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {presupuestos.map((presupuesto) => (
              <div key={presupuesto.categoriaId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: categorias.find(c => c.id === presupuesto.categoriaId)?.color || '#gray' }}
                    />
                    <h3 className="font-medium">{presupuesto.categoria}</h3>
                    {getStatusBadge(presupuesto.estado, presupuesto.porcentajeUsado)}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const categoria = categorias.find(c => c.id === presupuesto.categoriaId)
                      if (categoria) {
                        setEditingCategoria(categoria)
                        setNewBudget(presupuesto.presupuestoMensual.toString())
                        setIsEditModalOpen(true)
                      }
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div>
                    <div className="text-gray-500">Presupuesto</div>
                    <div className="font-medium">{formatCurrency(presupuesto.presupuestoMensual)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Gastado</div>
                    <div className="font-medium">{formatCurrency(presupuesto.gastoActual)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Restante</div>
                    <div className="font-medium">{formatCurrency(presupuesto.presupuestoMensual - presupuesto.gastoActual)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Proyección</div>
                    <div className="font-medium flex items-center gap-1">
                      {formatCurrency(presupuesto.proyeccionFinMes)}
                      {presupuesto.proyeccionFinMes > presupuesto.presupuestoMensual ? (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progreso</span>
                    <span>{presupuesto.porcentajeUsado.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(presupuesto.porcentajeUsado, 100)} 
                    className={`h-2 ${getStatusColor(presupuesto.estado)}`}
                  />
                </div>

                <div className="text-xs text-gray-500">
                  {presupuesto.diasRestantes} días restantes del mes
                </div>
              </div>
            ))}

            {presupuestos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay presupuestos configurados</p>
                <p className="text-sm">Configura presupuestos para las categorías que desees controlar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categorías sin presupuesto */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Nuevos Presupuestos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categorias
              .filter(cat => !presupuestos.find(p => p.categoriaId === cat.id))
              .map((categoria) => (
                <Button
                  key={categoria.id}
                  variant="outline"
                  className="justify-between h-auto p-3"
                  onClick={() => {
                    setEditingCategoria(categoria)
                    setNewBudget('')
                    setIsEditModalOpen(true)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoria.color }}
                    />
                    <span>{categoria.nombre}</span>
                  </div>
                  <Plus className="h-4 w-4" />
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria?.presupuesto ? 'Editar' : 'Configurar'} Presupuesto - {editingCategoria?.nombre}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget">Presupuesto mensual</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const amount = parseFloat(newBudget)
                  if (editingCategoria && !isNaN(amount) && amount > 0) {
                    updateBudget(editingCategoria.id, amount)
                  }
                }}
                className="flex-1"
                disabled={!newBudget || isNaN(parseFloat(newBudget)) || parseFloat(newBudget) <= 0}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {editingCategoria?.presupuesto ? 'Actualizar' : 'Configurar'} Presupuesto
              </Button>
              
              {editingCategoria?.presupuesto && (
                <Button
                  variant="outline"
                  onClick={() => updateBudget(editingCategoria.id, 0)}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}