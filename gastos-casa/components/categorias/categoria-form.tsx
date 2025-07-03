'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Palette, DollarSign } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CategoriaWithSubcategorias } from '@/lib/types/database'

interface CategoriaFormProps {
  categoria?: CategoriaWithSubcategorias | null
  onSave: () => void
  onCancel: () => void
}

const PRESET_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#8b5cf6', // purple-500
]

export function CategoriaForm({ categoria, onSave, onCancel }: CategoriaFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    color: '#3b82f6',
    icono: '',
    presupuesto: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (categoria) {
      setFormData({
        nombre: categoria.nombre,
        color: categoria.color,
        icono: categoria.icono || '',
        presupuesto: categoria.presupuesto?.toString() || ''
      })
    }
  }, [categoria])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres'
    }

    if (!formData.color.trim()) {
      newErrors.color = 'El color es requerido'
    } else if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.color)) {
      newErrors.color = 'El color debe ser un valor hexadecimal válido'
    }

    if (formData.presupuesto && (isNaN(Number(formData.presupuesto)) || Number(formData.presupuesto) < 0)) {
      newErrors.presupuesto = 'El presupuesto debe ser un número positivo'
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
      const url = categoria ? `/api/categorias/${categoria.id}` : '/api/categorias'
      const method = categoria ? 'PUT' : 'POST'

      const payload = {
        nombre: formData.nombre.trim(),
        color: formData.color,
        icono: formData.icono.trim() || null,
        presupuesto: formData.presupuesto ? Number(formData.presupuesto) : null
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        onSave()
      } else {
        setErrors({ general: result.error })
      }
    } catch (error) {
      console.error('Error saving categoria:', error)
      setErrors({ general: 'Error al guardar la categoría' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color }))
    if (errors.color) {
      setErrors(prev => ({ ...prev, color: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre de la Categoría</Label>
          <Input
            id="nombre"
            value={formData.nombre}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, nombre: e.target.value }))
              if (errors.nombre) {
                setErrors(prev => ({ ...prev, nombre: '' }))
              }
            }}
            placeholder="Ej: Alimentación, Transporte..."
            className={errors.nombre ? 'border-red-500' : ''}
          />
          {errors.nombre && (
            <p className="text-sm text-red-500">{errors.nombre}</p>
          )}
        </div>

        {/* Icono */}
        <div className="space-y-2">
          <Label htmlFor="icono">Icono (opcional)</Label>
          <Input
            id="icono"
            value={formData.icono}
            onChange={(e) => setFormData(prev => ({ ...prev, icono: e.target.value }))}
            placeholder="🍽️ 🚗 🏠 (emoji o texto)"
          />
          <p className="text-xs text-muted-foreground">
            Puedes usar emojis o texto corto para identificar la categoría
          </p>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color de la Categoría
        </Label>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => handleColorChange(presetColor)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                formData.color === presetColor ? 'border-gray-400 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: presetColor }}
              title={presetColor}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="color"
            value={formData.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-16 h-10 p-1 border rounded"
          />
          <Input
            type="text"
            value={formData.color}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#3b82f6"
            className={`max-w-28 ${errors.color ? 'border-red-500' : ''}`}
          />
          <div
            className="w-10 h-10 rounded border-2 border-gray-200"
            style={{ backgroundColor: formData.color }}
          />
        </div>
        
        {errors.color && (
          <p className="text-sm text-red-500">{errors.color}</p>
        )}
      </div>

      {/* Presupuesto */}
      <div className="space-y-2">
        <Label htmlFor="presupuesto" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Presupuesto Mensual (opcional)
        </Label>
        <Input
          id="presupuesto"
          type="number"
          step="0.01"
          min="0"
          value={formData.presupuesto}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, presupuesto: e.target.value }))
            if (errors.presupuesto) {
              setErrors(prev => ({ ...prev, presupuesto: '' }))
            }
          }}
          placeholder="0.00"
          className={`max-w-40 ${errors.presupuesto ? 'border-red-500' : ''}`}
        />
        {errors.presupuesto && (
          <p className="text-sm text-red-500">{errors.presupuesto}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Define un límite de gasto mensual para esta categoría
        </p>
      </div>

      {/* Preview */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: formData.color }}
            />
            <div>
              <p className="font-medium">
                {formData.icono && `${formData.icono} `}
                {formData.nombre || 'Nombre de la categoría'}
              </p>
              {formData.presupuesto && (
                <p className="text-sm text-muted-foreground">
                  Presupuesto: €{Number(formData.presupuesto).toFixed(2)}/mes
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Guardando...' : categoria ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}