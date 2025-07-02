'use client'

import { useEffect } from 'react'
import { ChevronDown, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
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
          onChange={(e) => handleChange(e.target.value)}
          className="min-w-48"
        >
          <option value="" disabled>
            Seleccionar cuenta
          </option>
          {cuentas.map((cuenta) => (
            <option key={cuenta.id} value={cuenta.id}>
              {cuenta.nombre} ({cuenta.tipo})
            </option>
          ))}
        </Select>
      </div>

      {cuentaActiva && (
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full border border-gray-300"
            style={{ backgroundColor: cuentaActiva.color }}
            title={`Color: ${cuentaActiva.color}`}
          />
        </div>
      )}
    </div>
  )
}

// Versión compacta para header/navegación
export function CuentaSelectorCompact({ className }: { className?: string }) {
  const { cuentaActiva, cuentas, selectCuenta } = useCuentaStore()

  if (!cuentaActiva || cuentas.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className="w-3 h-3 rounded-full border border-gray-300"
        style={{ backgroundColor: cuentaActiva.color }}
      />
      <span className="text-sm font-medium truncate max-w-32">
        {cuentaActiva.nombre}
      </span>
      
      {cuentas.length > 1 && (
        <Button variant="ghost" size="sm" asChild>
          <a href="/cuentas">
            <ChevronDown className="w-3 h-3" />
          </a>
        </Button>
      )}
    </div>
  )
}