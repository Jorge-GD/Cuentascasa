'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Tipo503020 } from '@/lib/types/database';

interface DetalleCategoriaProps {
  tipo: Tipo503020;
  titulo: string;
  categorias: Array<{
    categoria: string;
    total: number;
    subcategorias: Record<string, number>;
  }>;
  total: number;
  limite: number;
}

export function DetalleCategoria({ tipo, titulo, categorias, total, limite }: DetalleCategoriaProps) {
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  const toggleCategoria = (categoria: string) => {
    setExpandidas(prev => ({ ...prev, [categoria]: !prev[categoria] }));
  };

  const colorTipo = {
    [Tipo503020.NECESIDADES]: 'blue',
    [Tipo503020.DESEOS]: 'purple',
    [Tipo503020.AHORRO]: 'green'
  }[tipo];

  const bgColor = {
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    green: 'bg-green-50'
  }[colorTipo];

  const textColor = {
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    green: 'text-green-700'
  }[colorTipo];

  return (
    <Card className="p-4">
      <div className={`p-3 rounded-lg mb-4 ${bgColor}`}>
        <h3 className={`text-lg font-semibold ${textColor}`}>{titulo}</h3>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm">Total: {total.toFixed(2)}€</span>
          <span className="text-sm">Límite: {limite.toFixed(2)}€</span>
        </div>
        <Progress 
          value={(total / limite) * 100} 
          className="mt-2"
        />
      </div>

      <div className="space-y-2">
        {categorias.map((cat) => (
          <div key={cat.categoria} className="border rounded-lg p-3">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleCategoria(cat.categoria)}
            >
              <div className="flex items-center gap-2">
                {Object.keys(cat.subcategorias).length > 0 && (
                  expandidas[cat.categoria] ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">{cat.categoria}</span>
              </div>
              <span className="font-medium">{cat.total.toFixed(2)}€</span>
            </div>

            {expandidas[cat.categoria] && Object.keys(cat.subcategorias).length > 0 && (
              <div className="mt-2 ml-6 space-y-1">
                {Object.entries(cat.subcategorias).map(([sub, importe]) => (
                  <div key={sub} className="flex justify-between text-sm text-gray-600">
                    <span>{sub}</span>
                    <span>{importe.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}