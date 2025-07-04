'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Target, Shield, CreditCard } from 'lucide-react';
import { TipoMeta } from '@/lib/types/database';

interface Meta {
  id: string;
  nombre: string;
  objetivo: number;
  ahorrado: number;
  tipo: string;
}

interface MetasAhorroProps {
  metas: Meta[];
  limiteAhorro: number;
  ahorroActual: number;
  onUpdate: () => void;
}

export function MetasAhorro({ metas, limiteAhorro, ahorroActual, onUpdate }: MetasAhorroProps) {
  const [creandoMeta, setCreandoMeta] = useState(false);
  const [nuevaMeta, setNuevaMeta] = useState({
    nombre: '',
    objetivo: '',
    tipo: TipoMeta.META_PERSONAL
  });

  const getIconoMeta = (tipo: string) => {
    switch (tipo) {
      case TipoMeta.EMERGENCIA:
        return <Shield className="h-5 w-5 text-blue-600" />;
      case TipoMeta.DEUDA:
        return <CreditCard className="h-5 w-5 text-red-600" />;
      default:
        return <Target className="h-5 w-5 text-green-600" />;
    }
  };

  const handleCrearMeta = async () => {
    if (!nuevaMeta.nombre || !nuevaMeta.objetivo) return;

    try {
      await fetch('/api/metas-ahorro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevaMeta.nombre,
          objetivo: parseFloat(nuevaMeta.objetivo),
          tipo: nuevaMeta.tipo
        })
      });
      
      setCreandoMeta(false);
      setNuevaMeta({ nombre: '', objetivo: '', tipo: TipoMeta.META_PERSONAL });
      onUpdate();
    } catch (error) {
      console.error('Error al crear meta:', error);
    }
  };

  const handleEliminarMeta = async (id: string) => {
    try {
      await fetch(`/api/metas-ahorro?id=${id}`, {
        method: 'DELETE'
      });
      onUpdate();
    } catch (error) {
      console.error('Error al eliminar meta:', error);
    }
  };

  const handleActualizarAhorro = async (id: string, nuevoAhorro: number) => {
    try {
      await fetch('/api/metas-ahorro', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ahorrado: nuevoAhorro
        })
      });
      onUpdate();
    } catch (error) {
      console.error('Error al actualizar ahorro:', error);
    }
  };

  const ahorroDisponible = limiteAhorro - metas.reduce((sum, meta) => sum + meta.ahorrado, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Metas de Ahorro e Inversión</h3>
          <p className="text-sm text-gray-600">
            Presupuesto mensual: {limiteAhorro.toFixed(2)}€ | 
            Disponible: {ahorroDisponible.toFixed(2)}€
          </p>
        </div>
        <Button
          onClick={() => setCreandoMeta(true)}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva Meta
        </Button>
      </div>

      <div className="space-y-4">
        {metas.map((meta) => {
          const porcentaje = (meta.ahorrado / meta.objetivo) * 100;
          
          return (
            <div key={meta.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getIconoMeta(meta.tipo)}
                  <h4 className="font-medium">{meta.nombre}</h4>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEliminarMeta(meta.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{meta.ahorrado.toFixed(2)}€ de {meta.objetivo.toFixed(2)}€</span>
                  <span className="font-medium">{porcentaje.toFixed(0)}%</span>
                </div>
                <Progress value={porcentaje} />
                
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleActualizarAhorro(meta.id, meta.ahorrado + 50)}
                  >
                    +50€
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleActualizarAhorro(meta.id, meta.ahorrado + 100)}
                  >
                    +100€
                  </Button>
                  {ahorroDisponible >= limiteAhorro * 0.2 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActualizarAhorro(meta.id, meta.ahorrado + limiteAhorro * 0.2)}
                    >
                      +20% ({(limiteAhorro * 0.2).toFixed(0)}€)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {creandoMeta && (
          <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
            <Input
              placeholder="Nombre de la meta"
              value={nuevaMeta.nombre}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, nombre: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Objetivo (€)"
              value={nuevaMeta.objetivo}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, objetivo: e.target.value })}
            />
            <select
              className="w-full p-2 border rounded"
              value={nuevaMeta.tipo}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, tipo: e.target.value as TipoMeta })}
            >
              <option value={TipoMeta.META_PERSONAL}>Meta Personal</option>
              <option value={TipoMeta.EMERGENCIA}>Fondo de Emergencia</option>
              <option value={TipoMeta.DEUDA}>Pago de Deuda</option>
            </select>
            <div className="flex gap-2">
              <Button onClick={handleCrearMeta} size="sm">
                Crear
              </Button>
              <Button 
                onClick={() => setCreandoMeta(false)} 
                size="sm" 
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}