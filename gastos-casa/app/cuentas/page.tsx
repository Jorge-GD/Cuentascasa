'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CuentaCard } from '@/components/cuentas/cuenta-card'
import { NoCuentasEmpty } from '@/components/ui/empty-states'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { useClientCuentaStore } from '@/hooks/use-cuenta-store'
import { toastUtils } from '@/lib/utils/toast'
import type { Cuenta } from '@/lib/types/database'

export default function CuentasPage() {
  const { 
    cuentas, 
    cuentaActiva, 
    isLoading, 
    error, 
    fetchCuentas, 
    deleteCuenta,
    isHydrated
  } = useClientCuentaStore()

  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (isHydrated) {
      fetchCuentas()
    }
  }, [fetchCuentas, isHydrated])

  const handleEdit = (cuenta: Cuenta) => {
    setEditingCuenta(cuenta)
    // Navegar a página de edición específica
    window.location.href = `/cuentas/${cuenta.id}/editar`
  }

  const handleDelete = async (cuenta: Cuenta) => {
    const success = await deleteCuenta(cuenta.id)
    if (success) {
      toastUtils.app.deleteSuccess('Cuenta')
    } else {
      toastUtils.error('Error al eliminar la cuenta', {
        description: 'No se pudo eliminar la cuenta. Inténtalo de nuevo.'
      })
    }
  }

  // Mostrar loading mientras se inicializa el cliente
  if (!isClient || !isHydrated || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cuentas</h1>
            <p className="text-muted-foreground">
              Gestiona tus cuentas bancarias
            </p>
          </div>
          <Button asChild>
            <Link href="/cuentas/nueva">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cuentas</h1>
            <p className="text-muted-foreground">
              Gestiona tus cuentas bancarias
            </p>
          </div>
          <Button asChild>
            <Link href="/cuentas/nueva">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-medium">Error al cargar cuentas</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchCuentas()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuentas</h1>
          <p className="text-muted-foreground">
            Gestiona tus cuentas bancarias y selecciona la activa
          </p>
        </div>
        <Button asChild>
          <Link href="/cuentas/nueva">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cuenta
          </Link>
        </Button>
      </div>

      {cuentas.length === 0 ? (
        <NoCuentasEmpty onCreateNew={() => window.location.href = '/cuentas/nueva'} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cuentas.map((cuenta) => (
              <CuentaCard
                key={cuenta.id}
                cuenta={cuenta}
                isActive={cuentaActiva?.id === cuenta.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Total: {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}
            {cuentaActiva && (
              <span className="ml-2">
                • Activa: <strong>{cuentaActiva.nombre}</strong>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}