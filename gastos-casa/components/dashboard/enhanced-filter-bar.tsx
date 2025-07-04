'use client'

import { useState, useEffect } from 'react'
import { Calendar, CalendarIcon, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { CategoriaWithSubcategorias } from '@/lib/types/database'
import { DateRange } from 'react-day-picker'

export interface FilterState {
  periodo: string
  fechaCustom?: DateRange
  cuentaIds: string[]
  categoriaIds: string[]
  subcategoriaIds: string[]
}

interface EnhancedFilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  cuentas: Array<{ id: string; nombre: string }>
  categorias: CategoriaWithSubcategorias[]
  isLoading?: boolean
}

const PERIODO_OPTIONS = [
  { value: 'mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'trimestre', label: 'Este trimestre' },
  { value: 'trimestre-anterior', label: 'Trimestre anterior' },
  { value: 'semestre', label: 'Este semestre' },
  { value: 'año', label: 'Este año' },
  { value: 'año-anterior', label: 'Año anterior' },
  { value: 'ultimos-3-meses', label: 'Últimos 3 meses' },
  { value: 'ultimos-6-meses', label: 'Últimos 6 meses' },
  { value: 'ultimos-12-meses', label: 'Últimos 12 meses' },
  { value: 'personalizado', label: 'Rango personalizado' }
]

export function EnhancedFilterBar({ 
  filters, 
  onFiltersChange, 
  cuentas, 
  categorias, 
  isLoading 
}: EnhancedFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCustomDate, setShowCustomDate] = useState(false)

  // Update custom date visibility when periodo changes
  useEffect(() => {
    setShowCustomDate(filters.periodo === 'personalizado')
  }, [filters.periodo])

  const handlePeriodoChange = (value: string) => {
    const newFilters = { ...filters, periodo: value }
    if (value !== 'personalizado') {
      newFilters.fechaCustom = undefined
    }
    onFiltersChange(newFilters)
  }

  const handleCustomDateChange = (dateRange: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      fechaCustom: dateRange
    })
  }

  const handleCuentaToggle = (cuentaId: string) => {
    const newCuentaIds = filters.cuentaIds.includes(cuentaId)
      ? filters.cuentaIds.filter(id => id !== cuentaId)
      : [...filters.cuentaIds, cuentaId]
    
    onFiltersChange({
      ...filters,
      cuentaIds: newCuentaIds
    })
  }

  const handleCategoriaToggle = (categoriaId: string) => {
    const newCategoriaIds = filters.categoriaIds.includes(categoriaId)
      ? filters.categoriaIds.filter(id => id !== categoriaId)
      : [...filters.categoriaIds, categoriaId]
    
    onFiltersChange({
      ...filters,
      categoriaIds: newCategoriaIds
    })
  }

  const handleSubcategoriaToggle = (subcategoriaId: string) => {
    const newSubcategoriaIds = filters.subcategoriaIds.includes(subcategoriaId)
      ? filters.subcategoriaIds.filter(id => id !== subcategoriaId)
      : [...filters.subcategoriaIds, subcategoriaId]
    
    onFiltersChange({
      ...filters,
      subcategoriaIds: newSubcategoriaIds
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      periodo: 'mes',
      cuentaIds: [],
      categoriaIds: [],
      subcategoriaIds: []
    })
    setIsExpanded(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.periodo !== 'mes') count++
    if (filters.cuentaIds.length > 0) count++
    if (filters.categoriaIds.length > 0) count++
    if (filters.subcategoriaIds.length > 0) count++
    return count
  }

  const getSelectedCuentasText = () => {
    if (filters.cuentaIds.length === 0) return 'Todas las cuentas'
    if (filters.cuentaIds.length === 1) {
      const cuenta = cuentas.find(c => c.id === filters.cuentaIds[0])
      return cuenta?.nombre || 'Cuenta seleccionada'
    }
    return `${filters.cuentaIds.length} cuentas seleccionadas`
  }

  const getSelectedCategoriasText = () => {
    if (filters.categoriaIds.length === 0) return 'Todas las categorías'
    if (filters.categoriaIds.length === 1) {
      const categoria = categorias.find(c => c.id === filters.categoriaIds[0])
      return categoria?.nombre || 'Categoría seleccionada'
    }
    return `${filters.categoriaIds.length} categorías seleccionadas`
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Basic Filter Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="periodo" className="text-sm font-medium whitespace-nowrap">
                Período:
              </Label>
              <Select value={filters.periodo} onValueChange={handlePeriodoChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODO_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {showCustomDate && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-72 justify-start text-left font-normal",
                        !filters.fechaCustom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.fechaCustom?.from ? (
                        filters.fechaCustom.to ? (
                          <>
                            {format(filters.fechaCustom.from, "dd/MM/yyyy", { locale: es })} -{" "}
                            {format(filters.fechaCustom.to, "dd/MM/yyyy", { locale: es })}
                          </>
                        ) : (
                          format(filters.fechaCustom.from, "dd/MM/yyyy", { locale: es })
                        )
                      ) : (
                        <span>Selecciona un rango</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={filters.fechaCustom?.from}
                      selected={filters.fechaCustom}
                      onSelect={handleCustomDateChange}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Filter Toggle Button */}
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {isExpanded ? 'Ocultar filtros' : 'Más filtros'}
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span>Filtros activos:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {filters.cuentaIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {getSelectedCuentasText()}
                </Badge>
              )}
              {filters.categoriaIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {getSelectedCategoriasText()}
                </Badge>
              )}
              {filters.subcategoriaIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {filters.subcategoriaIds.length} subcategoría{filters.subcategoriaIds.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          </div>
        )}

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Account Filters */}
            {cuentas.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cuentas:</Label>
                <div className="flex flex-wrap gap-2">
                  {cuentas.map(cuenta => (
                    <div key={cuenta.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cuenta-${cuenta.id}`}
                        checked={filters.cuentaIds.includes(cuenta.id)}
                        onCheckedChange={() => handleCuentaToggle(cuenta.id)}
                      />
                      <Label 
                        htmlFor={`cuenta-${cuenta.id}`} 
                        className="text-sm cursor-pointer"
                      >
                        {cuenta.nombre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filters */}
            {categorias.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Categorías:</Label>
                <div className="space-y-3">
                  {categorias.map(categoria => (
                    <div key={categoria.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`categoria-${categoria.id}`}
                          checked={filters.categoriaIds.includes(categoria.id)}
                          onCheckedChange={() => handleCategoriaToggle(categoria.id)}
                        />
                        <Label 
                          htmlFor={`categoria-${categoria.id}`} 
                          className="text-sm font-medium cursor-pointer"
                        >
                          {categoria.nombre}
                        </Label>
                      </div>
                      
                      {/* Subcategories */}
                      {categoria.subcategorias.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {categoria.subcategorias.map(subcategoria => (
                            <div key={subcategoria.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`subcategoria-${subcategoria.id}`}
                                checked={filters.subcategoriaIds.includes(subcategoria.id)}
                                onCheckedChange={() => handleSubcategoriaToggle(subcategoria.id)}
                              />
                              <Label 
                                htmlFor={`subcategoria-${subcategoria.id}`} 
                                className="text-sm text-muted-foreground cursor-pointer"
                              >
                                {subcategoria.nombre}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}