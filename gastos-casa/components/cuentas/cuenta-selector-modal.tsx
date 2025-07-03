'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CreditCard, Plus, Check } from 'lucide-react'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { toastUtils } from '@/lib/utils/toast'
import type { Cuenta } from '@/lib/types/database'

interface CuentaSelectorModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CuentaSelectorModal({ isOpen, onClose }: CuentaSelectorModalProps) {
  const { 
    cuentas, 
    cuentaActiva, 
    isLoading, 
    fetchCuentas, 
    selectCuenta 
  } = useCuentaStore()

  useEffect(() => {
    if (isOpen) {
      fetchCuentas()
    }
  }, [isOpen, fetchCuentas])

  const handleSelectCuenta = (cuenta: Cuenta) => {
    selectCuenta(cuenta.id)
    toastUtils.success('Cuenta seleccionada', {
      description: `Ahora estás usando ${cuenta.nombre}`
    })
    onClose()
  }

  const handleCreateNew = () => {
    onClose()
    window.location.href = '/cuentas/nueva'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Seleccionar Cuenta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-sm font-medium mb-2">No hay cuentas</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Crea tu primera cuenta para empezar
              </p>
              <Button onClick={handleCreateNew} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Crear Cuenta
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {cuentas.map((cuenta) => (
                    <button
                      key={cuenta.id}
                      onClick={() => handleSelectCuenta(cuenta)}
                      className={`w-full p-3 rounded-lg border text-left transition-all hover:bg-muted/50 ${
                        cuentaActiva?.id === cuenta.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: cuenta.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{cuenta.nombre}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={cuenta.tipo === 'personal' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {cuenta.tipo === 'personal' ? 'Personal' : 'Compartida'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {cuentaActiva?.id === cuenta.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-4">
                <Button 
                  onClick={handleCreateNew}
                  variant="outline" 
                  className="w-full"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nueva Cuenta
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}