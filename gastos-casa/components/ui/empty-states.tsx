'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  Search, 
  Database, 
  FileX, 
  AlertCircle, 
  Plus,
  Filter,
  Download,
  CreditCard,
  TrendingUp,
  Settings,
  Upload
} from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ 
  icon: Icon = Database,
  title,
  description,
  action,
  secondaryAction,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="mb-6 p-4 rounded-full bg-muted/50">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      
      {action && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={action.onClick}
            variant={action.variant || 'default'}
          >
            {action.label}
          </Button>
          
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Specific empty states for common scenarios
export function NoMovimientosEmpty({ onCreateNew }: { onCreateNew?: () => void }) {
  return (
    <EmptyState
      icon={CreditCard}
      title="No hay movimientos"
      description="Aún no tienes movimientos registrados en esta cuenta. Crea tu primer movimiento para comenzar a gestionar tus gastos."
      action={onCreateNew ? {
        label: "Crear Movimiento",
        onClick: onCreateNew
      } : undefined}
      secondaryAction={{
        label: "Importar CSV",
        onClick: () => window.location.href = '/import'
      }}
    />
  )
}

export function NoSearchResultsEmpty({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Sin resultados"
      description="No se encontraron movimientos que coincidan con los filtros aplicados. Prueba ajustando los criterios de búsqueda."
      action={onClearFilters ? {
        label: "Limpiar Filtros",
        onClick: onClearFilters,
        variant: "outline"
      } : undefined}
    />
  )
}

export function NoCuentasEmpty({ onCreateNew }: { onCreateNew?: () => void }) {
  return (
    <EmptyState
      icon={Plus}
      title="No tienes cuentas"
      description="Crea tu primera cuenta bancaria para empezar a gestionar tus gastos y ingresos de manera organizada."
      action={onCreateNew ? {
        label: "Crear Primera Cuenta",
        onClick: onCreateNew
      } : undefined}
    />
  )
}

export function NoDataChartsEmpty({ onViewData, onImportData }: { 
  onViewData?: () => void
  onImportData?: () => void 
}) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="Sin datos para mostrar"
      description="No hay suficientes datos para generar gráficos. Añade algunos movimientos para ver tus estadísticas financieras."
      action={onViewData ? {
        label: "Ver Movimientos",
        onClick: onViewData,
        variant: "outline"
      } : undefined}
      secondaryAction={onImportData ? {
        label: "Importar Datos",
        onClick: onImportData
      } : undefined}
    />
  )
}

export function ErrorEmpty({ 
  title = "Algo salió mal",
  description = "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
  onRetry 
}: { 
  title?: string
  description?: string
  onRetry?: () => void 
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? {
        label: "Reintentar",
        onClick: onRetry
      } : undefined}
      className="text-destructive"
    />
  )
}

export function NoFileSelectedEmpty({ onSelectFile }: { onSelectFile?: () => void }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="p-12">
        <EmptyState
          icon={Upload}
          title="Selecciona un archivo"
          description="Arrastra y suelta un archivo CSV aquí o haz clic para seleccionar uno desde tu dispositivo."
          action={onSelectFile ? {
            label: "Seleccionar Archivo",
            onClick: onSelectFile
          } : undefined}
          className="py-0"
        />
      </CardContent>
    </Card>
  )
}

export function NoConfigurationEmpty({ onConfigure }: { onConfigure?: () => void }) {
  return (
    <EmptyState
      icon={Settings}
      title="Configuración requerida"
      description="Necesitas configurar algunas opciones antes de continuar. Esto solo tomará unos minutos."
      action={onConfigure ? {
        label: "Configurar Ahora",
        onClick: onConfigure
      } : undefined}
    />
  )
}

// Wrapper for conditional empty states
interface ConditionalEmptyProps {
  condition: boolean
  children: React.ReactNode
  fallback: React.ReactNode
}

export function ConditionalEmpty({ condition, children, fallback }: ConditionalEmptyProps) {
  return condition ? <>{fallback}</> : <>{children}</>
}