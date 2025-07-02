'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { TipoCuenta } from '@/lib/types/database'
import type { Cuenta } from '@/lib/types/database'

interface CuentaFormProps {
  cuenta?: Cuenta
  onSubmit: (data: { nombre: string; tipo: string; color: string }) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const coloresPredefinidos = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#8b5cf6', label: 'Morado' },
  { value: '#06b6d4', label: 'Cian' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6b7280', label: 'Gris' },
]

export function CuentaForm({ cuenta, onSubmit, onCancel, isLoading }: CuentaFormProps) {
  const [formData, setFormData] = useState({
    nombre: cuenta?.nombre || '',
    tipo: cuenta?.tipo || TipoCuenta.PERSONAL,
    color: cuenta?.color || coloresPredefinidos[0].value,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    }

    if (!formData.tipo) {
      newErrors.tipo = 'El tipo es requerido'
    }

    if (!formData.color) {
      newErrors.color = 'El color es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {cuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la cuenta</Label>
            <Input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="ej. Gastos Jorge"
              className={errors.nombre ? 'border-red-500' : ''}
            />
            {errors.nombre && (
              <p className="text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de cuenta</Label>
            <Select
              id="tipo"
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              className={errors.tipo ? 'border-red-500' : ''}
            >
              <option value={TipoCuenta.PERSONAL}>Personal</option>
              <option value={TipoCuenta.COMPARTIDA}>Compartida</option>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-red-600">{errors.tipo}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color identificativo</Label>
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: formData.color }}
              />
              <Select
                id="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className={errors.color ? 'border-red-500' : ''}
              >
                {coloresPredefinidos.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </Select>
            </div>
            {errors.color && (
              <p className="text-sm text-red-600">{errors.color}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : cuenta ? 'Actualizar' : 'Crear Cuenta'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}