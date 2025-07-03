'use client'

import { useEffect } from 'react'
import { ChevronDown, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCuentaStore } from '@/lib/stores/cuentaStore'

interface CuentaSelectorProps {
  className?: string
  showLabel?: boolean
}

export function CuentaSelector({ className, showLabel = true }: CuentaSelectorProps) {
  const { 
    cuentas, 
    cuentaActiva, 
    isLoading, 
    fetchCuentas, 
    selectCuenta 
  } = useCuentaStore()

  useEffect(() => {
    if (cuentas.length === 0) {
      fetchCuentas()
    }
  }, [cuentas.length, fetchCuentas])

  const handleChange = (value: string) => {
    if (value !== cuentaActiva?.id) {
      selectCuenta(value)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <span className="text-sm font-medium">Cuenta:</span>}
        <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  if (cuentas.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <span className="text-sm font-medium">Cuenta:</span>}
        <Button variant="outline" size="sm" asChild>
          <a href="/cuentas/nueva">
            <CreditCard className="w-4 h-4 mr-2" />
            Crear primera cuenta
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && <span className="text-sm font-medium">Cuenta:</span>}
      
      <div className="relative">
        <Select
          value={cuentaActiva?.id || ''}
          onValueChange={handleChange}
        >
          <SelectTrigger className="min-w-48">
            <SelectValue placeholder="Seleccionar cuenta" />
          </SelectTrigger>
          <SelectContent>
            {cuentas.map((cuenta) => (
              <SelectItem key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre} ({cuenta.tipo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cuentaActiva && (
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="w-3 h-3 rounded-full border border-gray-300 cursor-help"
                style={{ backgroundColor: cuentaActiva.color }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Color: {cuentaActiva.color}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

// Versión compacta para header/navegación
export function CuentaSelectorCompact({ className, onChangeCuenta }: { 
  className?: string
  onChangeCuenta?: () => void 
}) {
  const { cuentaActiva, cuentas } = useCuentaStore()

  if (!cuentaActiva || cuentas.length === 0) {
    return null
  }

  const handleClick = () => {
    if (onChangeCuenta) {
      onChangeCuenta()
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleClick}
      className={`flex items-center space-x-2 h-8 px-2 hover:bg-muted ${className}`}
    >
      <div 
        className="w-3 h-3 rounded-full border border-gray-300"
        style={{ backgroundColor: cuentaActiva.color }}
      />
      <span className="text-sm font-medium truncate max-w-32">
        {cuentaActiva.nombre}
      </span>
      
      {cuentas.length > 1 && (
        <ChevronDown className="w-3 h-3 opacity-50" />
      )}
    </Button>
  )
}