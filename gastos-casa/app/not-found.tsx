'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <FileQuestion className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Página no encontrada</CardTitle>
          <CardDescription>
            La página que buscas no existe o ha sido movida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-6xl font-bold text-muted-foreground mb-2">
              404
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              asChild
              className="w-full"
              variant="default"
            >
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Ir al Dashboard
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline"
              className="w-full"
              onClick={() => window.history.back()}
            >
              <span className="cursor-pointer" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver atrás
              </span>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Puedes navegar a{' '}
              <Link href="/cuentas" className="underline hover:text-foreground">
                Cuentas
              </Link>
              {', '}
              <Link href="/configuracion/categorias" className="underline hover:text-foreground">
                Configuración
              </Link>
              {' o '}
              <Link href="/importar" className="underline hover:text-foreground">
                Importar datos
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}