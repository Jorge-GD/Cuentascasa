'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'

interface CategorizationEditorProps {
  movimiento: CategorizedMovimiento
  onSave: (updates: Partial<CategorizedMovimiento>) => void
  onCancel: () => void
}

// Categorías base disponibles
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

export function CategorizationEditor({ movimiento, onSave, onCancel }: CategorizationEditorProps) {
  const [categoria, setCategoria] = useState(movimiento.categoriaDetectada || '')
  const [subcategoria, setSubcategoria] = useState(movimiento.subcategoriaDetectada || '')
  const [nota, setNota] = useState('')

  const categoriaSeleccionada = CATEGORIAS_DISPONIBLES.find(cat => cat.nombre === categoria)
  const subcategoriasDisponibles = categoriaSeleccionada?.subcategorias || []

  // Reset subcategoria when categoria changes
  useEffect(() => {
    if (categoria && !subcategoriasDisponibles.includes(subcategoria)) {
      setSubcategoria('')
    }
  }, [categoria, subcategoria, subcategoriasDisponibles])

  const handleSave = () => {
    const updates: Partial<CategorizedMovimiento> = {
      categoriaDetectada: categoria,
      subcategoriaDetectada: subcategoria || undefined,
      confianza: 100, // Manual categorization gets max confidence
      reglaAplicada: 'Manual'
    }

    onSave(updates)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Información del movimiento */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Fecha:</span>
            <div>{new Date(movimiento.fecha).toLocaleDateString('es-ES')}</div>
          </div>
          <div>
            <span className="font-medium">Importe:</span>
            <div className={movimiento.importe > 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(movimiento.importe)}
            </div>
          </div>
        </div>
        <div>
          <span className="font-medium">Descripción:</span>
          <div className="text-sm break-words">{movimiento.descripcion}</div>
        </div>
        {movimiento.reglaAplicada && (
          <div>
            <span className="font-medium">Regla aplicada:</span>
            <div className="text-sm text-muted-foreground">{movimiento.reglaAplicada}</div>
          </div>
        )}
      </div>

      {/* Editor de categoría */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoría</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_DISPONIBLES.map((cat) => (
                <SelectItem key={cat.nombre} value={cat.nombre}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {categoria && subcategoriasDisponibles.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="subcategoria">Subcategoría</Label>
            <Select value={subcategoria} onValueChange={setSubcategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una subcategoría (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {subcategoriasDisponibles.map((subcat) => (
                  <SelectItem key={subcat} value={subcat}>
                    {subcat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="nota">Nota (opcional)</Label>
          <Textarea
            id="nota"
            placeholder="Añade una nota sobre este movimiento..."
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!categoria}>
          Guardar Cambios
        </Button>
      </div>
    </div>
  )
}