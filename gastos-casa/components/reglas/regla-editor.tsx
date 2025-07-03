'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, TestTube, CheckCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import type { ReglaCategorizacion } from '@/lib/types/database'

interface ReglaEditorProps {
  regla?: ReglaCategorizacion | null
  cuentaId?: string
  onSave: () => void
  onCancel: () => void
}

const TIPOS_COINCIDENCIA = [
  { value: 'contiene', label: 'Contiene', description: 'La descripción contiene el patrón' },
  { value: 'empieza', label: 'Empieza con', description: 'La descripción empieza con el patrón' },
  { value: 'termina', label: 'Termina con', description: 'La descripción termina con el patrón' },
  { value: 'exacto', label: 'Exacto', description: 'La descripción es exactamente igual al patrón' },
  { value: 'regex', label: 'Expresión regular', description: 'Patrón regex avanzado' }
]

const CATEGORIAS_PREDEFINIDAS = [
  'Alimentación',
  'Transporte',
  'Compras Online',
  'Gastos Fijos',
  'Salidas',
  'Bizum',
  'Ingresos',
  'Transferencias',
  'Efectivo',
  'Suscripciones',
  'Mascotas',
  'Cumpleaños y Regalos',
  'Otros Gastos'
]

export function ReglaEditor({ regla, cuentaId, onSave, onCancel }: ReglaEditorProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    patron: '',
    tipoCoincidencia: 'contiene' as 'contiene' | 'empieza' | 'termina' | 'exacto' | 'regex',
    categoria: '',
    subcategoria: '',
    prioridad: '1',
    activa: true,
    aplicarASoloCuenta: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{
    matches: boolean
    confidence?: number
    description: string
  } | null>(null)
  const [testDescription, setTestDescription] = useState('')

  useEffect(() => {
    if (regla) {
      setFormData({
        nombre: regla.nombre,
        patron: regla.patron,
        tipoCoincidencia: regla.tipoCoincidencia as any,
        categoria: regla.categoria,
        subcategoria: regla.subcategoria || '',
        prioridad: regla.prioridad.toString(),
        activa: regla.activa,
        aplicarASoloCuenta: !!regla.cuentaId
      })
    }
  }, [regla])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.patron.trim()) {
      newErrors.patron = 'El patrón es requerido'
    } else if (formData.tipoCoincidencia === 'regex') {
      try {
        new RegExp(formData.patron)
      } catch (error) {
        newErrors.patron = 'El patrón regex no es válido'
      }
    }

    if (!formData.categoria.trim()) {
      newErrors.categoria = 'La categoría es requerida'
    }

    if (!formData.prioridad || isNaN(Number(formData.prioridad)) || Number(formData.prioridad) < 1) {
      newErrors.prioridad = 'La prioridad debe ser un número positivo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTestRule = () => {
    if (!formData.patron.trim() || !testDescription.trim()) {
      return
    }

    const testRegla = {
      id: 'test',
      nombre: formData.nombre,
      patron: formData.patron,
      tipoCoincidencia: formData.tipoCoincidencia,
      categoria: formData.categoria,
      subcategoria: formData.subcategoria,
      prioridad: Number(formData.prioridad),
      activa: true
    }

    let matches = false
    let confidence: number | undefined

    try {
      const descripcionUpper = testDescription.toUpperCase()
      const patronUpper = formData.patron.toUpperCase()

      switch (formData.tipoCoincidencia) {
        case 'contiene':
          matches = descripcionUpper.includes(patronUpper)
          confidence = matches ? 85 : undefined
          break
        case 'empieza':
          matches = descripcionUpper.startsWith(patronUpper)
          confidence = matches ? 90 : undefined
          break
        case 'termina':
          matches = descripcionUpper.endsWith(patronUpper)
          confidence = matches ? 80 : undefined
          break
        case 'exacto':
          matches = descripcionUpper === patronUpper
          confidence = matches ? 100 : undefined
          break
        case 'regex':
          const regex = new RegExp(formData.patron, 'i')
          matches = regex.test(testDescription)
          confidence = matches ? 95 : undefined
          break
      }
    } catch (error) {
      matches = false
    }

    setTestResult({
      matches,
      confidence,
      description: testDescription
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const url = regla ? `/api/reglas/${regla.id}` : '/api/reglas'
      const method = regla ? 'PUT' : 'POST'

      const payload = {
        nombre: formData.nombre.trim(),
        patron: formData.patron.trim(),
        tipoCoincidencia: formData.tipoCoincidencia,
        categoria: formData.categoria,
        subcategoria: formData.subcategoria.trim() || null,
        prioridad: Number(formData.prioridad),
        activa: formData.activa,
        cuentaId: formData.aplicarASoloCuenta ? cuentaId : null
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
      console.error('Error saving regla:', error)
      setErrors({ general: 'Error al guardar la regla' })
    } finally {
      setIsLoading(false)
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración básica */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Regla</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, nombre: e.target.value }))
                if (errors.nombre) {
                  setErrors(prev => ({ ...prev, nombre: '' }))
                }
              }}
              placeholder="Ej: Supermercados, Gasolineras..."
              className={errors.nombre ? 'border-red-500' : ''}
            />
            {errors.nombre && (
              <p className="text-sm text-red-500">{errors.nombre}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="patron">Patrón de Búsqueda</Label>
            <Input
              id="patron"
              value={formData.patron}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, patron: e.target.value }))
                if (errors.patron) {
                  setErrors(prev => ({ ...prev, patron: '' }))
                }
                setTestResult(null)
              }}
              placeholder="Ej: MERCADONA, REPSOL, ^BIZUM.*"
              className={errors.patron ? 'border-red-500' : ''}
            />
            {errors.patron && (
              <p className="text-sm text-red-500">{errors.patron}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Coincidencia</Label>
            <Select
              value={formData.tipoCoincidencia}
              onValueChange={(value: any) => {
                setFormData(prev => ({ ...prev, tipoCoincidencia: value }))
                setTestResult(null)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_COINCIDENCIA.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div>
                      <div className="font-medium">{tipo.label}</div>
                      <div className="text-xs text-muted-foreground">{tipo.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, categoria: value }))
                  if (errors.categoria) {
                    setErrors(prev => ({ ...prev, categoria: '' }))
                  }
                }}
              >
                <SelectTrigger className={errors.categoria ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PREDEFINIDAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria && (
                <p className="text-sm text-red-500">{errors.categoria}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategoria">Subcategoría (opcional)</Label>
              <Input
                id="subcategoria"
                value={formData.subcategoria}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategoria: e.target.value }))}
                placeholder="Ej: Supermercado, Gasolina..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad</Label>
              <Input
                id="prioridad"
                type="number"
                min="1"
                value={formData.prioridad}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, prioridad: e.target.value }))
                  if (errors.prioridad) {
                    setErrors(prev => ({ ...prev, prioridad: '' }))
                  }
                }}
                className={errors.prioridad ? 'border-red-500' : ''}
              />
              {errors.prioridad && (
                <p className="text-sm text-red-500">{errors.prioridad}</p>
              )}
              <p className="text-xs text-muted-foreground">
                1 = mayor prioridad, números mayores = menor prioridad
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.activa}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activa: checked }))}
                />
                <Label>Regla activa</Label>
              </div>

              {cuentaId && (
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.aplicarASoloCuenta}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aplicarASoloCuenta: checked }))}
                  />
                  <Label className="text-sm">Solo para cuenta actual</Label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Probador de reglas */}
        <div className="space-y-6">
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  <Label>Probar Regla</Label>
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={testDescription}
                    onChange={(e) => {
                      setTestDescription(e.target.value)
                      setTestResult(null)
                    }}
                    placeholder="Introduce una descripción de movimiento para probar..."
                    rows={3}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestRule}
                    disabled={!formData.patron.trim() || !testDescription.trim()}
                    className="w-full"
                  >
                    Probar Regla
                  </Button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-lg border ${
                    testResult.matches 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.matches ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        testResult.matches ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {testResult.matches ? 'Coincidencia encontrada' : 'Sin coincidencia'}
                      </span>
                    </div>

                    {testResult.matches && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{formData.categoria}</Badge>
                          {formData.subcategoria && (
                            <Badge variant="secondary">{formData.subcategoria}</Badge>
                          )}
                        </div>
                        {testResult.confidence && (
                          <p className="text-sm text-green-600">
                            Confianza: {testResult.confidence}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vista previa de la regla */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Vista Previa</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Nombre:</strong> {formData.nombre || 'Sin nombre'}</div>
                <div><strong>Patrón:</strong> <code className="bg-gray-100 px-1 rounded">{formData.patron || 'Sin patrón'}</code></div>
                <div><strong>Tipo:</strong> {TIPOS_COINCIDENCIA.find(t => t.value === formData.tipoCoincidencia)?.label}</div>
                <div className="flex items-center gap-2">
                  <strong>Categoría:</strong>
                  <Badge variant="outline">{formData.categoria || 'Sin categoría'}</Badge>
                  {formData.subcategoria && (
                    <Badge variant="secondary">{formData.subcategoria}</Badge>
                  )}
                </div>
                <div><strong>Prioridad:</strong> {formData.prioridad}</div>
                <div className="flex items-center gap-2">
                  <strong>Estado:</strong>
                  <Badge variant={formData.activa ? 'default' : 'secondary'}>
                    {formData.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
          {isLoading ? 'Guardando...' : regla ? 'Actualizar' : 'Crear Regla'}
        </Button>
      </div>
    </form>
  )
}