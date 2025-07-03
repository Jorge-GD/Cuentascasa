'use client'

import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, CreditCard, Upload, BarChart3, CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { toastUtils } from '@/lib/utils/toast'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  delay?: number
}

export function LoadingSpinner({ size = 'md', className, delay = 0 }: LoadingSpinnerProps) {
  const [show, setShow] = useState(delay === 0)
  
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay)
      return () => clearTimeout(timer)
    }
  }, [delay])
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  if (!show) return null

  return (
    <Loader2 
      className={cn(
        'animate-spin transition-opacity duration-300', 
        sizeClasses[size], 
        className
      )} 
    />
  )
}

interface SkeletonProps {
  className?: string
  delay?: number
}

export function Skeleton({ className, delay = 0 }: SkeletonProps) {
  const [show, setShow] = useState(delay === 0)
  
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay)
      return () => clearTimeout(timer)
    }
  }, [delay])
  
  if (!show) {
    return <div className={className} />
  }

  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted transition-opacity duration-300',
        className
      )}
    />
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-5 gap-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card>
      <div className="p-6">
        <div className="space-y-3 mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className={`h-8 w-${Math.floor(Math.random() * 40) + 20}`} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

interface LoadingPageProps {
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function LoadingPage({ 
  title = "Cargando...", 
  description = "Por favor espera mientras procesamos la información",
  icon: Icon = TrendingUp 
}: LoadingPageProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] space-y-6 transition-opacity duration-500",
      mounted ? "opacity-100" : "opacity-0"
    )}>
      <div className="relative">
        <div className="animate-pulse">
          <Icon className="h-16 w-16 text-muted-foreground transition-colors duration-300" />
        </div>
        <div className="absolute -bottom-2 -right-2">
          <LoadingSpinner size="md" className="text-primary" delay={200} />
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold transition-colors duration-300">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-md transition-colors duration-300">{description}</p>
      </div>
      
      <div className="flex space-x-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-primary rounded-full animate-bounce transition-colors duration-300"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Additional chart skeleton */}
      <ChartSkeleton />
    </div>
  )
}

export function MovimientosSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 flex-1" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-6">
          <TableSkeleton rows={8} />
        </CardContent>
      </Card>
    </div>
  )
}

export function ImportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <Upload className="h-12 w-12 text-muted-foreground animate-pulse" />
            <div className="space-y-2 text-center">
              <Skeleton className="h-6 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
}

export function LoadingOverlay({ isVisible, message = "Procesando..." }: LoadingOverlayProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    if (isVisible) {
      setMounted(true)
      // Show toast for long operations
      const timer = setTimeout(() => {
        toastUtils.info('Operación en progreso', {
          description: 'Esta operación está tomando más tiempo del esperado'
        })
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])
  
  if (!mounted) return null

  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      <Card className="shadow-xl border-2">
        <CardContent className="p-8 flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-lg font-medium transition-colors duration-300">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook para estados de loading con timeout
export function useLoadingTimeout(isLoading: boolean, timeout: number = 5000) {
  const [showTimeout, setShowTimeout] = useState(false)
  
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowTimeout(true)
        toastUtils.warning('Cargando...', {
          description: 'La operación está tardando más de lo esperado'
        })
      }, timeout)
      return () => {
        clearTimeout(timer)
        setShowTimeout(false)
      }
    }
  }, [isLoading, timeout])
  
  return showTimeout
}

// Loading states específicos por contexto
export const LoadingStates = {
  Dashboard: () => <LoadingPage icon={BarChart3} title="Cargando Dashboard" description="Preparando tus métricas financieras" />,
  Movimientos: () => <LoadingPage icon={CreditCard} title="Cargando Movimientos" description="Obteniendo la lista de transacciones" />,
  Import: () => <LoadingPage icon={Upload} title="Procesando Archivo" description="Analizando y categorizando movimientos" />,
  Charts: () => <LoadingPage icon={TrendingUp} title="Generando Gráficos" description="Calculando estadísticas y tendencias" />,
  Offline: () => <LoadingPage icon={WifiOff} title="Sin Conexión" description="Verifica tu conexión a internet" />,
  Connecting: () => <LoadingPage icon={Wifi} title="Conectando" description="Reestableciendo conexión..." />,
}

// Simple loading skeleton component
export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}