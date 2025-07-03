'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { Movimiento } from '@/lib/types/database'

interface MovimientoModalProps {
  movimiento?: Movimiento | null
  cuentaId: string
  isOpen: boolean
  onClose: () => void
  onSave: (movimiento: Movimiento) => void
  onDelete?: () => void
}

interface MovimientoFormData {
  fecha: string
  descripcion: string
  importe: string
  saldo: string
  categoria: string
  subcategoria: string
  categoriaING: string
  subcategoriaING: string
  esManual: boolean
}

const CATEGORIAS_DISPONIBLES = [
  {
    nombre: 'Alimentación',
    subcategorias: ['Supermercado', 'Carnicería', 'Frutería', 'Restaurantes', 'Otros']
  },
  {
    nombre: 'Compras Online',
    subcategorias: ['Amazon', 'Ropa', 'Tecnología', 'Hogar', 'Otros']
  },
  {
    nombre: 'Gastos Fijos',
    subcategorias: ['Alquiler', 'Luz', 'Agua', 'Internet', 'Comunidad', 'Seguros', 'Recibo']
  },
  {
    nombre: 'Transporte',
    subcategorias: ['Gasolina', 'Transporte público', 'Parking', 'Uber/Taxi', 'Mantenimiento']
  },
  {
    nombre: 'Salidas',
    subcategorias: ['Restaurantes', 'Cine', 'Ocio', 'Deportes', 'Viajes']
  },
  {
    nombre: 'Suscripciones',
    subcategorias: ['Streaming', 'Música', 'Software', 'Revistas', 'Otros']
  },
  {
    nombre: 'Mascotas',
    subcategorias: ['Comida', 'Veterinario', 'Accesorios', 'Otros']
  },
  {
    nombre: 'Bizum',
    subcategorias: ['Enviado', 'Recibido', 'General']
  },
  {
    nombre: 'Transferencias',
    subcategorias: ['Transferencia', 'Domiciliación', 'Otros']
  },
  {
    nombre: 'Efectivo',
    subcategorias: ['Cajero', 'Otros']
  },
  {
    nombre: 'Ingresos',
    subcategorias: ['Nómina', 'Freelance', 'Otros']
  },
  {
    nombre: 'Otros Gastos',
    subcategorias: ['Sin categorizar', 'Varios']
  }
]

export function MovimientoModal({ 
  movimiento, 
  cuentaId, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete 
}: MovimientoModalProps) {
  const [formData, setFormData] = useState<MovimientoFormData>({
    fecha: '',
    descripcion: '',
    importe: '',
    saldo: '',
    categoria: '',
    subcategoria: '',
    categoriaING: '',
    subcategoriaING: '',
    esManual: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState<string>('')

  const isEditing = !!movimiento
  const modalTitle = isEditing ? 'Editar Movimiento' : 'Nuevo Movimiento'

  // Initialize form data when movimiento changes
  useEffect(() => {
    if (movimiento) {
      setFormData({
        fecha: format(new Date(movimiento.fecha), 'yyyy-MM-dd'),
        descripcion: movimiento.descripcion,
        importe: movimiento.importe.toString(),
        saldo: movimiento.saldo?.toString() || '',
        categoria: movimiento.categoria,
        subcategoria: movimiento.subcategoria || '',
        categoriaING: movimiento.categoriaING || '',
        subcategoriaING: movimiento.subcategoriaING || '',
        esManual: movimiento.esManual,
      })
      setSelectedCategoria(movimiento.categoria)
    } else {
      // Reset form for new movimiento
      const today = format(new Date(), 'yyyy-MM-dd')
      setFormData({
        fecha: today,
        descripcion: '',
        importe: '',
        saldo: '',
        categoria: '',
        subcategoria: '',
        categoriaING: '',
        subcategoriaING: '',
        esManual: true,
      })
      setSelectedCategoria('')
    }
    setErrors({})
  }, [movimiento, isOpen])

  const subcategoriasDisponibles = CATEGORIAS_DISPONIBLES.find(
    cat => cat.nombre === selectedCategoria
  )?.subcategorias || []

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es requerida'
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida'
    }

    if (!formData.importe) {
      newErrors.importe = 'El importe es requerido'
    } else if (isNaN(parseFloat(formData.importe))) {
      newErrors.importe = 'El importe debe ser un número válido'
    }

    if (!formData.categoria) {
      newErrors.categoria = 'La categoría es requerida'
    }

    if (formData.saldo && isNaN(parseFloat(formData.saldo))) {
      newErrors.saldo = 'El saldo debe ser un número válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const movimientoData = {
        fecha: new Date(formData.fecha).toISOString(),
        descripcion: formData.descripcion.trim(),
        importe: parseFloat(formData.importe),
        saldo: formData.saldo ? parseFloat(formData.saldo) : null,
        categoria: formData.categoria,
        subcategoria: formData.subcategoria || null,
        categoriaING: formData.categoriaING || null,
        subcategoriaING: formData.subcategoriaING || null,
        esManual: formData.esManual,
        cuentaId,
      }

      let response: Response

      if (isEditing) {
        // Update existing movimiento
        response = await fetch(`/api/movimientos/${movimiento.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(movimientoData),
        })
      } else {
        // Create new movimiento
        response = await fetch('/api/movimientos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(movimientoData),
        })
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar el movimiento')
      }

      onSave(result.data)
      onClose()

    } catch (error) {
      console.error('Error saving movimiento:', error)
      setErrors({
        general: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!movimiento || !onDelete) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/movimientos/${movimiento.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar el movimiento')
      }

      onDelete()
      onClose()

    } catch (error) {
      console.error('Error deleting movimiento:', error)
      setErrors({
        general: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFieldChange = (field: keyof MovimientoFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Update selected categoria and clear subcategoria if categoria changes
    if (field === 'categoria') {
      setSelectedCategoria(value as string)
      if (formData.subcategoria && !subcategoriasDisponibles.includes(formData.subcategoria)) {
        setFormData(prev => ({ ...prev, subcategoria: '' }))
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {isEditing ? 
              'Modifica los datos del movimiento.' : 
              'Añade un nuevo movimiento manual a la cuenta.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => handleFieldChange('fecha', e.target.value)}
                className={errors.fecha ? 'border-destructive' : ''}
              />
              {errors.fecha && (
                <p className="text-sm text-destructive">{errors.fecha}</p>
              )}
            </div>

            {/* Importe */}
            <div className="space-y-2">
              <Label htmlFor="importe">Importe * (€)</Label>
              <Input
                id="importe"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.importe}
                onChange={(e) => handleFieldChange('importe', e.target.value)}
                className={errors.importe ? 'border-destructive' : ''}
              />
              {errors.importe && (
                <p className="text-sm text-destructive">{errors.importe}</p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              placeholder="Descripción del movimiento..."
              value={formData.descripcion}
              onChange={(e) => handleFieldChange('descripcion', e.target.value)}
              className={errors.descripcion ? 'border-destructive' : ''}
              rows={2}
            />
            {errors.descripcion && (
              <p className="text-sm text-destructive">{errors.descripcion}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Categoría */}
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => handleFieldChange('categoria', value)}
              >
                <SelectTrigger className={errors.categoria ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DISPONIBLES.map((categoria) => (
                    <SelectItem key={categoria.nombre} value={categoria.nombre}>
                      {categoria.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria && (
                <p className="text-sm text-destructive">{errors.categoria}</p>
              )}
            </div>

            {/* Subcategoría */}
            <div className="space-y-2">
              <Label>Subcategoría</Label>
              <Select
                value={formData.subcategoria}
                onValueChange={(value) => handleFieldChange('subcategoria', value)}
                disabled={!selectedCategoria}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona subcategoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin subcategoría</SelectItem>
                  {subcategoriasDisponibles.map((subcategoria) => (
                    <SelectItem key={subcategoria} value={subcategoria}>
                      {subcategoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Saldo */}
          <div className="space-y-2">
            <Label htmlFor="saldo">Saldo (€)</Label>
            <Input
              id="saldo"
              type="number"
              step="0.01"
              placeholder="Opcional"
              value={formData.saldo}
              onChange={(e) => handleFieldChange('saldo', e.target.value)}
              className={errors.saldo ? 'border-destructive' : ''}
            />
            {errors.saldo && (
              <p className="text-sm text-destructive">{errors.saldo}</p>
            )}
          </div>

          {/* Categorías ING (solo si es movimiento importado) */}
          {!formData.esManual && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoriaING">Categoría ING</Label>
                <Input
                  id="categoriaING"
                  value={formData.categoriaING}
                  onChange={(e) => handleFieldChange('categoriaING', e.target.value)}
                  placeholder="Categoría original de ING"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategoriaING">Subcategoría ING</Label>
                <Input
                  id="subcategoriaING"
                  value={formData.subcategoriaING}
                  onChange={(e) => handleFieldChange('subcategoriaING', e.target.value)}
                  placeholder="Subcategoría original de ING"
                />
              </div>
            </div>
          )}

          {/* Es Manual */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="esManual"
              checked={formData.esManual}
              onCheckedChange={(checked) => handleFieldChange('esManual', !!checked)}
            />
            <Label htmlFor="esManual">Movimiento manual</Label>
            {formData.esManual && (
              <Badge variant="secondary">Manual</Badge>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>

            {isEditing && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminará permanentemente este movimiento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}