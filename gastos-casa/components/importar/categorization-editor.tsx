'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'

interface CategorizationEditorProps {
  movimiento: CategorizedMovimiento
  onSave: (updates: Partial<CategorizedMovimiento>) => void
  onCancel: () => void
  onRuleCreated?: () => void
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

export function CategorizationEditor({ movimiento, onSave, onCancel, onRuleCreated }: CategorizationEditorProps) {
  const [categoria, setCategoria] = useState(movimiento.categoriaDetectada || '')
  const [subcategoria, setSubcategoria] = useState(movimiento.subcategoriaDetectada || '')
  const [nota, setNota] = useState('')
  const [createRule, setCreateRule] = useState(false)
  const [newCategoria, setNewCategoria] = useState('')
  const [newSubcategoria, setNewSubcategoria] = useState('')
  const [showNewCategoriaForm, setShowNewCategoriaForm] = useState(false)
  const [showNewSubcategoriaForm, setShowNewSubcategoriaForm] = useState(false)
  const [categoriasPersonalizadas, setCategoriasPersonalizadas] = useState(CATEGORIAS_DISPONIBLES)
  const [categoriasBD, setCategoriasBD] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Combinar categorías hardcodeadas con las de BD, evitando duplicados
  const categoriasBDMapeadas = categoriasBD.map(cat => ({
    nombre: cat.nombre,
    subcategorias: cat.subcategorias?.map((sub: any) => sub.nombre) || []
  }))
  
  const nombresEnBD = new Set(categoriasBDMapeadas.map(cat => cat.nombre))
  const categoriasHardcodeadasFiltradas = categoriasPersonalizadas.filter(cat => !nombresEnBD.has(cat.nombre))
  
  const todasLasCategorias = [...categoriasHardcodeadasFiltradas, ...categoriasBDMapeadas]

  const categoriaSeleccionada = todasLasCategorias.find(cat => cat.nombre === categoria)
  const subcategoriasDisponibles = categoriaSeleccionada?.subcategorias || []

  // Cargar categorías de la base de datos
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const response = await fetch('/api/categorias')
        if (response.ok) {
          const result = await response.json()
          setCategoriasBD(result.data || [])
        }
      } catch (error) {
        console.error('Error cargando categorías:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadCategorias()
  }, [])

  // Reset subcategoria when categoria changes
  useEffect(() => {
    if (categoria && !subcategoriasDisponibles.includes(subcategoria)) {
      setSubcategoria('')
    }
  }, [categoria, subcategoria, subcategoriasDisponibles])

  const addNewCategoria = async () => {
    if (newCategoria.trim()) {
      try {
        const response = await fetch('/api/categorias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: newCategoria.trim(),
            color: '#6B7280', // Color por defecto gris
            icono: null,
            presupuesto: null
          })
        })

        if (response.ok) {
          const result = await response.json()
          // Recargar categorías de la BD
          const categoriasResponse = await fetch('/api/categorias')
          if (categoriasResponse.ok) {
            const categoriasResult = await categoriasResponse.json()
            setCategoriasBD(categoriasResult.data || [])
          }
          
          setCategoria(newCategoria.trim())
          setNewCategoria('')
          setShowNewCategoriaForm(false)
        } else {
          console.error('Error creando categoría')
        }
      } catch (error) {
        console.error('Error creando categoría:', error)
      }
    }
  }

  const addNewSubcategoria = async () => {
    if (newSubcategoria.trim() && categoria) {
      try {
        // Buscar el ID de la categoría en la BD
        const categoriaEnBD = categoriasBD.find(cat => cat.nombre === categoria)
        
        if (categoriaEnBD) {
          // Crear subcategoría en BD
          const response = await fetch('/api/subcategorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: newSubcategoria.trim(),
              categoriaId: categoriaEnBD.id
            })
          })

          if (response.ok) {
            // Recargar categorías para obtener las subcategorías actualizadas
            const categoriasResponse = await fetch('/api/categorias')
            if (categoriasResponse.ok) {
              const categoriasResult = await categoriasResponse.json()
              setCategoriasBD(categoriasResult.data || [])
            }
          }
        } else {
          // Si no está en BD, agregar localmente (categoría hardcodeada)
          const updatedCategorias = categoriasPersonalizadas.map(cat => {
            if (cat.nombre === categoria) {
              return {
                ...cat,
                subcategorias: [...cat.subcategorias, newSubcategoria.trim()]
              }
            }
            return cat
          })
          setCategoriasPersonalizadas(updatedCategorias)
        }
        
        setSubcategoria(newSubcategoria.trim())
        setNewSubcategoria('')
        setShowNewSubcategoriaForm(false)
      } catch (error) {
        console.error('Error creando subcategoría:', error)
      }
    }
  }

  const createCategorizationRule = async (categoria: string, subcategoria?: string) => {
    if (!createRule) return

    try {
      // Extraer palabras clave de la descripción para crear un patrón inteligente
      const descripcion = movimiento.descripcion.toUpperCase()
      let patron = ''
      
      // Buscar patrones comunes en descripciones bancarias
      if (descripcion.includes('PAGO EN ')) {
        const comercio = descripcion.replace(/PAGO EN /, '').split(' ')[0]
        patron = comercio
      } else if (descripcion.includes('BIZUM')) {
        patron = 'BIZUM'
      } else if (descripcion.includes('TRANSFERENCIA') || descripcion.includes('TRASPASO')) {
        patron = descripcion.includes('TRASPASO') ? 'TRASPASO' : 'TRANSFERENCIA'
      } else {
        // Usar las primeras 2-3 palabras significativas
        const palabras = descripcion.split(' ').filter(p => p.length > 3)
        patron = palabras.slice(0, 2).join(' ')
      }

      const reglaData = {
        nombre: `Auto: ${patron}`,
        patron: patron,
        tipoCoincidencia: 'contiene' as const,
        categoria,
        subcategoria,
        prioridad: 5,
        activa: true
      }

      const response = await fetch('/api/reglas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reglaData)
      })

      if (response.ok) {
        console.log('Regla de categorización creada:', reglaData)
        // Pequeño delay para asegurar que la regla se haya guardado en la BD
        setTimeout(() => {
          console.log('Recargando preview con nuevas reglas...')
          onRuleCreated?.()
        }, 500)
      } else {
        console.error('Error creando regla de categorización')
      }
    } catch (error) {
      console.error('Error creando regla:', error)
    }
  }

  const handleSave = async () => {
    const updates: Partial<CategorizedMovimiento> = {
      categoriaDetectada: categoria,
      subcategoriaDetectada: subcategoria || undefined,
      confianza: 100, // Manual categorization gets max confidence
      reglaAplicada: createRule ? 'Regla automática' : 'Manual'
    }

    // Crear regla si está marcado el checkbox
    if (createRule) {
      await createCategorizationRule(categoria, subcategoria)
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
          <div className="flex items-center justify-between">
            <Label htmlFor="categoria">Categoría</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewCategoriaForm(!showNewCategoriaForm)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Nueva
            </Button>
          </div>
          
          {showNewCategoriaForm && (
            <div className="flex gap-2">
              <Input
                placeholder="Nombre de la nueva categoría"
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value)}
              />
              <Button size="sm" onClick={addNewCategoria}>
                Añadir
              </Button>
            </div>
          )}
          
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {todasLasCategorias.map((cat) => (
                <SelectItem key={cat.nombre} value={cat.nombre}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {categoria && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subcategoria">Subcategoría</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewSubcategoriaForm(!showNewSubcategoriaForm)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Nueva
              </Button>
            </div>
            
            {showNewSubcategoriaForm && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la nueva subcategoría"
                  value={newSubcategoria}
                  onChange={(e) => setNewSubcategoria(e.target.value)}
                />
                <Button size="sm" onClick={addNewSubcategoria}>
                  Añadir
                </Button>
              </div>
            )}
            
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

        {/* Checkbox para crear regla automática */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="createRule"
              checked={createRule}
              onCheckedChange={(checked) => setCreateRule(checked as boolean)}
            />
            <div className="space-y-1">
              <Label 
                htmlFor="createRule" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Crear regla automática para movimientos similares
              </Label>
              <p className="text-xs text-muted-foreground">
                Se creará una regla que categorizará automáticamente movimientos futuros con descripción similar.
                Esto actualizará la confianza de otros movimientos en el preview.
              </p>
            </div>
          </div>
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