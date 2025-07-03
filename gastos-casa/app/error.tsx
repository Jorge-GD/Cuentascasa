'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">¡Oops! Algo salió mal</CardTitle>
          <CardDescription>
            Ha ocurrido un error inesperado en la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {error.digest && (
              <p className="font-mono bg-muted p-2 rounded text-xs">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={reset}
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

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Si el problema persiste, intenta recargar la página o{' '}
              <Link href="/dashboard" className="underline hover:text-foreground">
                volver al inicio
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}