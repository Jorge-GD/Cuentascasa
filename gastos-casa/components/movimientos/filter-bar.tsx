'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, X, RotateCcw, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { MovimientoFilterManager, getPresetFilters } from '@/lib/utils/filters'
import type { Movimiento } from '@/lib/types/database'
import type { MovimientoFilters } from '@/lib/utils/filters'

interface FilterBarProps {
  movimientos: Movimiento[]
  onFiltersChange: (filters: MovimientoFilters, filteredMovimientos: Movimiento[]) => void
}

export function FilterBar({ movimientos, onFiltersChange }: FilterBarProps) {
  const [filters, setFilters] = useState<MovimientoFilters>({})
  const [filterManager] = useState(() => new MovimientoFilterManager(movimientos))
  const [filterOptions, setFilterOptions] = useState(() => filterManager.getFilterOptions())
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Update filter manager when movimientos change
  useEffect(() => {
    const newManager = new MovimientoFilterManager(movimientos)
    setFilterOptions(newManager.getFilterOptions())
  }, [movimientos])

  // Apply filters whenever they change
  useEffect(() => {
    const newManager = new MovimientoFilterManager(movimientos)
    const filteredMovimientos = newManager.applyFilters(filters)
    onFiltersChange(filters, filteredMovimientos)

    // Count active filters
    const count = Object.entries(filters).filter(([key, value]) => {
      if (value === null || value === undefined || value === '') return false
      if (Array.isArray(value) && value.length === 0) return false
      if (key === 'tipoMovimiento' && value === 'todos') return false
      return true
    }).length
    setActiveFiltersCount(count)
  }, [filters, movimientos, onFiltersChange])

  const updateFilter = (key: keyof MovimientoFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const applyPreset = (presetName: string) => {
    const presets = getPresetFilters()
    const preset = presets[presetName]
    if (preset) {
      setFilters(preset)
    }
  }

  const removeFilter = (key: keyof MovimientoFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const presets = getPresetFilters()

  return (
    <div className="space-y-4">
      {/* Preset Filters */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Filtros Rápidos</Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(presets).map(([key, preset]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(key)}
              className="text-xs"
            >
              <Bookmark className="h-3 w-3 mr-1" />
              {key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Filtros activos:</span>
          
          {filters.fechaInicio && (
            <Badge variant="secondary" className="gap-1">
              Desde: {filters.fechaInicio}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('fechaInicio')}
              />
            </Badge>
          )}
          
          {filters.fechaFin && (
            <Badge variant="secondary" className="gap-1">
              Hasta: {filters.fechaFin}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('fechaFin')}
              />
            </Badge>
          )}
          
          {filters.categorias && filters.categorias.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Categorías: {filters.categorias.length}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('categorias')}
              />
            </Badge>
          )}
          
          {filters.tipoMovimiento && filters.tipoMovimiento !== 'todos' && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {filters.tipoMovimiento}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('tipoMovimiento')}
              />
            </Badge>
          )}
          
          {filters.descripcion && (
            <Badge variant="secondary" className="gap-1">
              Texto: "{filters.descripcion}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('descripcion')}
              />
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpiar todo
          </Button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
          <Input
            id="fecha-inicio"
            type="date"
            value={filters.fechaInicio || ''}
            onChange={(e) => updateFilter('fechaInicio', e.target.value)}
            max={filterOptions.rangos.fechaMax}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha-fin">Fecha Fin</Label>
          <Input
            id="fecha-fin"
            type="date"
            value={filters.fechaFin || ''}
            onChange={(e) => updateFilter('fechaFin', e.target.value)}
            min={filters.fechaInicio}
            max={filterOptions.rangos.fechaMax}
          />
        </div>

        {/* Movement Type */}
        <div className="space-y-2">
          <Label>Tipo de Movimiento</Label>
          <Select
            value={filters.tipoMovimiento || 'todos'}
            onValueChange={(value) => updateFilter('tipoMovimiento', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ingresos">Solo Ingresos</SelectItem>
              <SelectItem value="gastos">Solo Gastos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <Label>Categorías</Label>
          <Select
            value={filters.categorias?.[0] || ''}
            onValueChange={(value) => {
              if (value) {
                updateFilter('categorias', [value])
              } else {
                updateFilter('categorias', [])
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {filterOptions.categorias.map((categoria) => (
                <SelectItem key={categoria.value} value={categoria.value}>
                  {categoria.label} ({categoria.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount Range */}
        <div className="space-y-2">
          <Label htmlFor="importe-min">Importe Mínimo</Label>
          <Input
            id="importe-min"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={filters.importeMin || ''}
            onChange={(e) => updateFilter('importeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="importe-max">Importe Máximo</Label>
          <Input
            id="importe-max"
            type="number"
            placeholder="999999.99"
            step="0.01"
            value={filters.importeMax || ''}
            onChange={(e) => updateFilter('importeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>

        {/* Description Search */}
        <div className="space-y-2">
          <Label htmlFor="descripcion">Buscar en Descripción</Label>
          <Input
            id="descripcion"
            type="text"
            placeholder="Buscar texto..."
            value={filters.descripcion || ''}
            onChange={(e) => updateFilter('descripcion', e.target.value)}
          />
        </div>

        {/* Manual/Imported Filter */}
        <div className="space-y-2">
          <Label>Origen</Label>
          <Select
            value={
              filters.esManual === true ? 'manual' : 
              filters.esManual === false ? 'importado' : 
              'todos'
            }
            onValueChange={(value) => {
              if (value === 'manual') {
                updateFilter('esManual', true)
              } else if (value === 'importado') {
                updateFilter('esManual', false)
              } else {
                updateFilter('esManual', null)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los orígenes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="manual">Solo manuales</SelectItem>
              <SelectItem value="importado">Solo importados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Statistics */}
      <div className="text-sm text-muted-foreground">
        {(() => {
          const newManager = new MovimientoFilterManager(movimientos)
          const filtered = newManager.applyFilters(filters)
          const stats = newManager.getStatistics(filtered)
          
          return (
            <div className="flex items-center gap-4">
              <span>
                Mostrando {filtered.length} de {movimientos.length} movimientos
              </span>
              <span>
                Balance: {stats.balance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
              <span>
                Promedio: {stats.promedioImporte.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}