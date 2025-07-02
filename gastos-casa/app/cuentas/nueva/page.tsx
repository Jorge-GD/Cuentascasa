'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CuentaForm } from '@/components/cuentas/cuenta-form'
import { useCuentaStore } from '@/lib/stores/cuentaStore'

export default function NuevaCuentaPage() {
  const router = useRouter()
  const { createCuenta, isLoading } = useCuentaStore()

  const handleSubmit = async (data: { nombre: string; tipo: string; color: string }) => {
    const nuevaCuenta = await createCuenta(data)
    
    if (nuevaCuenta) {
      // Redirigir a la lista de cuentas tras crear exitosamente
      router.push('/cuentas')
    }
  }

  const handleCancel = () => {
    router.push('/cuentas')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cuentas">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Cuenta</h1>
          <p className="text-muted-foreground">
            Crea una nueva cuenta para gestionar tus gastos
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <CuentaForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        <h3 className="font-medium mb-2">Consejos:</h3>
        <ul className="space-y-1 ml-4">
          <li>• Usa nombres descriptivos como "Gastos Jorge" o "Cuenta Común"</li>
          <li>• Las cuentas personales son para gastos individuales</li>
          <li>• Las cuentas compartidas son para gastos familiares o de pareja</li>
          <li>• El color te ayudará a identificar rápidamente la cuenta</li>
        </ul>
      </div>
    </div>
  )
}