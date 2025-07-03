"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Algo salió mal</CardTitle>
              <CardDescription>
                Ha ocurrido un error inesperado en este componente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="text-center text-sm text-muted-foreground">
                  <p className="font-mono bg-muted p-2 rounded text-xs break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Intentar de nuevo
                </Button>
                
                <Button 
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <Link href="/dashboard">
                    <Home className="mr-2 h-4 w-4" />
                    Ir al Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook para usar error boundary en componentes funcionales
import { useCallback } from "react"

export function useErrorHandler() {
  return useCallback((error: Error, errorInfo?: any) => {
    console.error('Error caught by hook:', error, errorInfo)
    // Aquí podrías enviar el error a un servicio de monitoreo
  }, [])
}