'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useOnline } from '@/hooks/use-online'
import { toastUtils } from '@/lib/utils/toast'

export function OfflineBanner() {
  const { isOnline, isOffline, wasOffline } = useOnline()
  const [isVisible, setIsVisible] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    if (isOffline) {
      setIsVisible(true)
    } else if (wasOffline && isOnline) {
      // Show reconnection success message
      toastUtils.success('Conexión restablecida', {
        description: 'Ya puedes seguir utilizando la aplicación normalmente'
      })
      // Hide banner after a delay
      setTimeout(() => setIsVisible(false), 2000)
    }
  }, [isOffline, isOnline, wasOffline])

  useEffect(() => {
    const handleReconnected = () => {
      setIsReconnecting(false)
    }

    const handleOffline = () => {
      toastUtils.error('Sin conexión', {
        description: 'Verifica tu conexión a internet'
      })
    }

    window.addEventListener('app:reconnected', handleReconnected)
    window.addEventListener('app:offline', handleOffline)

    return () => {
      window.removeEventListener('app:reconnected', handleReconnected)
      window.removeEventListener('app:offline', handleOffline)
    }
  }, [])

  const handleRetry = async () => {
    setIsReconnecting(true)
    
    try {
      // Test connection
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      if (response.ok) {
        toastUtils.success('Conexión restablecida')
        setIsVisible(false)
      } else {
        toastUtils.error('Sin conexión', {
          description: 'No se pudo conectar al servidor'
        })
      }
    } catch (error) {
      toastUtils.error('Sin conexión', {
        description: 'Verifica tu conexión a internet'
      })
    } finally {
      setIsReconnecting(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className={cn(
      "fixed top-16 left-0 right-0 z-50 border-b transition-all duration-300",
      isOffline 
        ? "bg-destructive text-destructive-foreground" 
        : "bg-green-500 text-white"
    )}>
      <div className="container flex items-center justify-between py-2">
        <div className="flex items-center space-x-2">
          {isOffline ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isOffline 
              ? "Sin conexión a internet" 
              : "Conexión restablecida"
            }
          </span>
          {isOffline && (
            <span className="text-sm opacity-90">
              • Algunos datos pueden no estar actualizados
            </span>
          )}
        </div>

        {isOffline && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isReconnecting}
            className="h-7 text-xs bg-white/10 border-white/20 hover:bg-white/20 text-white"
          >
            {isReconnecting ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Reintentar
          </Button>
        )}
      </div>
    </div>
  )
}

// Hook for managing offline queue
export function useOfflineQueue() {
  const [queue, setQueue] = useState<Array<{
    id: string
    action: () => Promise<void>
    description: string
    timestamp: Date
  }>>([])
  
  const { isOnline } = useOnline()

  const addToQueue = (action: () => Promise<void>, description: string) => {
    const id = crypto.randomUUID()
    setQueue(prev => [...prev, {
      id,
      action,
      description,
      timestamp: new Date()
    }])
    
    toastUtils.info('Acción guardada', {
      description: 'Se ejecutará cuando se restablezca la conexión'
    })
    
    return id
  }

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id))
  }

  const processQueue = async () => {
    if (!isOnline || queue.length === 0) return

    toastUtils.info('Sincronizando datos', {
      description: `Procesando ${queue.length} acciones pendientes...`
    })

    const errors: string[] = []
    
    for (const item of queue) {
      try {
        await item.action()
        removeFromQueue(item.id)
      } catch (error) {
        errors.push(item.description)
      }
    }

    if (errors.length === 0) {
      toastUtils.success('Sincronización completa', {
        description: 'Todas las acciones se ejecutaron correctamente'
      })
    } else {
      toastUtils.warning('Sincronización parcial', {
        description: `${errors.length} acciones fallaron`
      })
    }
  }

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue()
    }
  }, [isOnline])

  // Load queue from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gastos-casa-offline-queue')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setQueue(parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })))
        } catch (error) {
          console.error('Error loading offline queue:', error)
        }
      }
    }
  }, [])

  // Save queue to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gastos-casa-offline-queue', JSON.stringify(queue))
    }
  }, [queue])

  return {
    queue,
    addToQueue,
    removeFromQueue,
    processQueue,
    queueLength: queue.length
  }
}