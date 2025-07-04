'use client';

import { useEffect, useState } from 'react';
import { TransaccionesAvanzadas } from '@/components/movimientos/TransaccionesAvanzadas';
import { useClientCuentaStore } from '@/hooks/use-cuenta-store';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TransaccionesPage() {
  const { cuentaActiva, cuentas, fetchCuentas, isLoading, isHydrated } = useClientCuentaStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (isHydrated) {
      fetchCuentas();
    }
  }, [fetchCuentas, isHydrated]);

  if (!isClient || !isHydrated || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Cargando transacciones...</h3>
            <p className="text-muted-foreground">
              Inicializando vista avanzada de transacciones
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cuentaActiva && cuentas.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cuentas configuradas
            </h3>
            <p className="text-gray-500 mb-6">
              Crea tu primera cuenta para ver las transacciones.
            </p>
            <Button asChild>
              <Link href="/cuentas/nueva">
                <CreditCard className="w-4 h-4 mr-2" />
                Crear primera cuenta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cuentaActiva) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cuenta seleccionada
            </h3>
            <p className="text-gray-500 mb-6">
              Selecciona una cuenta para ver las transacciones.
            </p>
            <Button asChild>
              <Link href="/cuentas">
                Ver cuentas disponibles
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Transacciones Detalladas</h1>
          <p className="text-muted-foreground">
            Vista avanzada con filtros y búsqueda de transacciones de {cuentaActiva.nombre}
          </p>
        </div>
      </div>

      {/* Componente principal */}
      <TransaccionesAvanzadas cuentaId={cuentaActiva.id} />
    </div>
  );
}