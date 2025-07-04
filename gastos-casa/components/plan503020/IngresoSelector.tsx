'use client';

import { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface IngresoSelectorProps {
  ingresoActual: number;
  ingresoCalculado: number;
  onUpdate: (nuevoIngreso: number) => void;
}

export function IngresoSelector({ ingresoActual, ingresoCalculado, onUpdate }: IngresoSelectorProps) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(ingresoActual.toString());

  const handleSave = () => {
    const nuevoValor = parseFloat(valor);
    if (!isNaN(nuevoValor) && nuevoValor > 0) {
      onUpdate(nuevoValor);
      setEditando(false);
    }
  };

  const handleCancel = () => {
    setValor(ingresoActual.toString());
    setEditando(false);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <p className="text-sm text-gray-600">Ingreso neto mensual</p>
        {editando ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-32"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{ingresoActual.toFixed(2)}€</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditando(true)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {ingresoCalculado > 0 && Math.abs(ingresoCalculado - ingresoActual) > 0.01 && (
        <div className="text-sm text-gray-500">
          <p>Ingresos reales este mes:</p>
          <p className="font-medium">{ingresoCalculado.toFixed(2)}€</p>
          <button
            onClick={() => onUpdate(ingresoCalculado)}
            className="text-blue-600 hover:underline text-xs"
          >
            Usar este valor
          </button>
        </div>
      )}
    </div>
  );
}