'use client'

import { useState, useEffect } from 'react'
import { VistaAnual } from '@/components/vistas/vista-anual'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AnualPageProps {
  params: Promise<{
    cuentaId: string
    año: string // Format: "2023"
  }>
}

export default function AnualPage({ params }: AnualPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{
    cuentaId: string
    año: string
  } | null>(null)
  const { cuentaActiva, getCuentaById, fetchCuentas } = useCuentaStore()
  const [cuenta, setCuenta] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [añoNum, setAñoNum] = useState<number | null>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    fetchCuentas()
  }, [fetchCuentas])

  useEffect(() => {
    if (resolvedParams) {
      // Buscar la cuenta específica
      const cuentaEncontrada = getCuentaById(resolvedParams.cuentaId)
      if (!cuentaEncontrada) {
        setError('Cuenta no encontrada')
        return
      }
      setCuenta(cuentaEncontrada)

      // Parsear el año
      try {
        const año = parseInt(resolvedParams.año, 10)
        const añoActual = new Date().getFullYear()
        
        if (isNaN(año) || año < 2000 || año > añoActual + 5) {
          throw new Error('Año inválido')
        }
        
        setAñoNum(año)
        setError(null)
      } catch (err) {
        setError('Formato de año inválido. Use un año entre 2000 y ' + (new Date().getFullYear() + 5))
      }
    }
  }, [resolvedParams, getCuentaById])

  if (!resolvedParams) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando vista anual...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-4">
          <Link href="/cuentas">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a Cuentas
            </Button>
          </Link>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!cuenta || añoNum === null) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Datos no disponibles
            </h3>
            <p className="text-gray-500">
              No se pudieron cargar los datos de la cuenta o el año solicitado.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header con navegación */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/cuentas/${resolvedParams.cuentaId}/movimientos`}>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a Movimientos
            </Button>
          </Link>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold">Vista Anual</h1>
          <p className="text-muted-foreground">
            {cuenta.nombre} - {añoNum}
          </p>
        </div>
      </div>

      {/* Vista anual */}
      <VistaAnual 
        cuentaId={resolvedParams.cuentaId}
        año={añoNum}
      />
    </div>
  )
}