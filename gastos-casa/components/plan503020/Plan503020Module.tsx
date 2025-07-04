'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { IngresoSelector } from './IngresoSelector';
import { MedidorProgreso } from './MedidorProgreso';
import { DetalleCategoria } from './DetalleCategoria';
import { MetasAhorro } from './MetasAhorro';
import { AlertasInteligentes } from './AlertasInteligentes';
import { ConfiguracionInicial } from './ConfiguracionInicial';
import { ConfiguracionFlexible } from './ConfiguracionFlexible';
import { ComparacionTemporal } from './ComparacionTemporal';
import { AnalisisPredictivo } from './AnalisisPredictivo';
import { useCuentaStore } from '@/hooks/use-cuenta-store';
import { Tipo503020 } from '@/lib/types/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Plan503020Data {
  ingresoBase: number;
  ingresosMes: number;
  limites: {
    necesidades: number;
    deseos: number;
    ahorro: number;
  };
  gastos: {
    necesidades: number;
    deseos: number;
    ahorro: number;
    sinCategorizar: number;
  };
  porcentajes: {
    necesidades: number;
    deseos: number;
    ahorro: number;
  };
  detallePorCategoria: Array<{
    categoria: string;
    tipo: string | null;
    total: number;
    subcategorias: Record<string, number>;
  }>;
  metas: Array<{
    id: string;
    nombre: string;
    objetivo: number;
    ahorrado: number;
    tipo: string;
  }>;
  alertas: string[];
}

export function Plan503020Module() {
  const [data, setData] = useState<Plan503020Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [configuracionCompleta, setConfiguracionCompleta] = useState(true);
  const { cuentaActiva, cuentas } = useCuentaStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mes: new Date().getMonth() + 1 + '',
        year: new Date().getFullYear() + '',
        cuentaIds: cuentas.map(c => c.id).join(',')
      });

      const response = await fetch(`/api/plan-503020?${params}`);
      const result = await response.json();
      
      setData(result);
      
      // Verificar si necesita configuración inicial
      const categoriasConTipo = result.detallePorCategoria.filter((d: any) => d.tipo !== null);
      setConfiguracionCompleta(categoriasConTipo.length > 0 || result.gastos.sinCategorizar === 0);
    } catch (error) {
      console.error('Error al cargar datos 50/30/20:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cuentaActiva]);

  const handleIngresoUpdate = async (nuevoIngreso: number) => {
    try {
      await fetch('/api/configuracion-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingresoMensual: nuevoIngreso })
      });
      fetchData();
    } catch (error) {
      console.error('Error al actualizar ingreso:', error);
    }
  };

  const handleConfiguracionCompleta = () => {
    setConfiguracionCompleta(true);
    fetchData();
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;
  }

  if (!data) {
    return <div>Error al cargar datos</div>;
  }

  if (!configuracionCompleta) {
    return <ConfiguracionInicial onComplete={handleConfiguracionCompleta} />;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Mi Plan 50/30/20</h2>
        
        <IngresoSelector 
          ingresoActual={data.ingresoBase}
          ingresoCalculado={data.ingresosMes}
          onUpdate={handleIngresoUpdate}
        />

        <ConfiguracionFlexible onConfiguracionChange={fetchData} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <MedidorProgreso
            titulo="Necesidades (50%)"
            actual={data.gastos.necesidades}
            limite={data.limites.necesidades}
            porcentaje={data.porcentajes.necesidades}
            color="blue"
          />
          
          <MedidorProgreso
            titulo="Deseos (30%)"
            actual={data.gastos.deseos}
            limite={data.limites.deseos}
            porcentaje={data.porcentajes.deseos}
            color="purple"
          />
          
          <MedidorProgreso
            titulo="Ahorro (20%)"
            actual={data.gastos.ahorro}
            limite={data.limites.ahorro}
            porcentaje={data.porcentajes.ahorro}
            color="green"
          />
        </div>

        {data.alertas.length > 0 && (
          <AlertasInteligentes alertas={data.alertas} />
        )}
      </Card>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          <TabsTrigger value="predicciones">Predicciones</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="resumen" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DetalleCategoria
              tipo={Tipo503020.NECESIDADES}
              titulo="Necesidades"
              categorias={data.detallePorCategoria.filter(c => c.tipo === 'necesidades')}
              total={data.gastos.necesidades}
              limite={data.limites.necesidades}
            />
            
            <DetalleCategoria
              tipo={Tipo503020.DESEOS}
              titulo="Deseos"
              categorias={data.detallePorCategoria.filter(c => c.tipo === 'deseos')}
              total={data.gastos.deseos}
              limite={data.limites.deseos}
            />
          </div>
        </TabsContent>

        <TabsContent value="tendencias" className="mt-6">
          <ComparacionTemporal cuentaIds={cuentas.map(c => c.id)} />
        </TabsContent>

        <TabsContent value="predicciones" className="mt-6">
          <AnalisisPredictivo cuentaIds={cuentas.map(c => c.id)} />
        </TabsContent>

        <TabsContent value="metas" className="mt-6">
          <MetasAhorro
            metas={data.metas}
            limiteAhorro={data.limites.ahorro}
            ahorroActual={data.gastos.ahorro}
            onUpdate={fetchData}
          />
        </TabsContent>
      </Tabs>

      {data.gastos.sinCategorizar > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-amber-800">
            ⚠️ Tienes {data.gastos.sinCategorizar.toFixed(2)}€ en gastos sin categorizar en el plan 50/30/20.
            <button 
              onClick={() => setConfiguracionCompleta(false)}
              className="ml-2 text-amber-600 underline hover:text-amber-700"
            >
              Configurar ahora
            </button>
          </p>
        </Card>
      )}
    </div>
  );
}

// Export por defecto para compatibilidad con dynamic imports
export default Plan503020Module