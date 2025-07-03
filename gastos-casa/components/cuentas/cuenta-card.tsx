'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog'
// import { AnimatedCard, PressableDiv } from '@/components/ui/animations'
import { Edit, Trash2, CreditCard } from 'lucide-react'
import type { Cuenta } from '@/lib/types/database'
import { useCuentaStore } from '@/lib/stores/cuentaStore'

interface CuentaCardProps {
  cuenta: Cuenta
  onEdit?: (cuenta: Cuenta) => void
  onDelete?: (cuenta: Cuenta) => void
  isActive?: boolean
}

export function CuentaCard({ cuenta, onEdit, onDelete, isActive }: CuentaCardProps) {
  const { selectCuenta } = useCuentaStore()

  const handleSelect = () => {
    selectCuenta(cuenta.id)
  }

  const tipoVariant = cuenta.tipo === 'personal' ? 'default' : 'secondary'
  const tipoLabel = cuenta.tipo === 'personal' ? 'Personal' : 'Compartida'

  return (
    <Card className={`transition-all card-hover ${isActive ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: cuenta.color }}
            />
            <div>
              <CardTitle className="text-lg">{cuenta.nombre}</CardTitle>
              <Badge variant={tipoVariant} className="mt-1">
                {tipoLabel}
              </Badge>
            </div>
          </div>
          
          {isActive && (
            <Badge variant="success" className="text-xs">
              Activa
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span>Creada {new Date(cuenta.createdAt).toLocaleDateString('es-ES')}</span>
          </div>
          
          <div className="flex space-x-2">
            {!isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelect}
              >
                Seleccionar
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(cuenta)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            
            {onDelete && (
              <DeleteConfirmDialog
                itemName={cuenta.nombre}
                itemType="cuenta"
                onConfirm={() => onDelete(cuenta)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DeleteConfirmDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}