'use client'

import React, { Component, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'

interface ChunkErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
  retryCount: number
  isRetrying: boolean
}

interface ChunkErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  maxRetries?: number
  componentName?: string
}

class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: ChunkErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ChunkErrorBoundaryState> {
    // Detectar si es un error de chunk loading
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Failed to import') ||
                        error.message.includes('fetch')

    return {
      hasError: isChunkError,
      error: isChunkError ? error : null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Solo manejar errores de chunk loading
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Failed to import') ||
                        error.message.includes('fetch')

    if (isChunkError) {
      console.error('ChunkErrorBoundary caught an error:', error, errorInfo)
      this.setState({
        errorInfo: errorInfo.componentStack,
        error
      })

      // Auto-retry una vez después de un breve delay
      if (this.state.retryCount === 0) {
        this.autoRetry()
      }
    }
  }

  componentWillUnmount() {
    // Limpiar timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  autoRetry = () => {
    if (this.state.retryCount >= (this.props.maxRetries || 3)) {
      return
    }

    this.setState({ isRetrying: true })

    const timeout = setTimeout(() => {
      this.handleRetry()
    }, 1000 + (this.state.retryCount * 1000)) // Incrementar delay con cada retry

    this.retryTimeouts.push(timeout)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
      isRetrying: false
    })

    // Forzar re-render del componente
    this.forceUpdate()
  }

  handleManualRetry = () => {
    // Reiniciar contador para retry manual
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    })
  }

  handleReload = () => {
    // Recargar toda la página como último recurso
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const { componentName, fallback } = this.props
      const { retryCount, isRetrying, error } = this.state
      const maxRetries = this.props.maxRetries || 3

      // Si hay un fallback personalizado, usarlo
      if (fallback) {
        return fallback
      }

      // UI de error robusta
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Error al cargar componente
                    {componentName && ` "${componentName}"`}
                  </h3>
                  <p className="text-sm text-red-600 mt-1">
                    Se produjo un error al cargar los recursos necesarios. 
                    Esto puede deberse a problemas de conexión o actualizaciones del sistema.
                  </p>
                </div>

                {error && (
                  <details className="text-xs text-red-500">
                    <summary className="cursor-pointer hover:text-red-700">
                      Detalles técnicos
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap bg-red-100 p-2 rounded text-xs overflow-x-auto">
                      {error.message}
                    </pre>
                  </details>
                )}

                <div className="flex flex-wrap gap-2">
                  {isRetrying ? (
                    <Button disabled size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Reintentando...
                    </Button>
                  ) : retryCount < maxRetries ? (
                    <Button 
                      onClick={this.handleManualRetry} 
                      size="sm" 
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar ({retryCount}/{maxRetries})
                    </Button>
                  ) : (
                    <Button 
                      onClick={this.handleReload} 
                      size="sm" 
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <WifiOff className="h-4 w-4 mr-2" />
                      Recargar página
                    </Button>
                  )}

                  {retryCount >= maxRetries && (
                    <Alert className="mt-2 border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-700 text-sm">
                        El componente no pudo cargarse después de {maxRetries} intentos. 
                        Prueba a recargar la página o verifica tu conexión a internet.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ChunkErrorBoundary