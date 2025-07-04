'use client';

import { obtenerColorPorcentaje } from '@/lib/utils/plan503020';

interface MedidorProgresoProps {
  titulo: string;
  actual: number;
  limite: number;
  porcentaje: number;
  color: 'blue' | 'purple' | 'green';
}

export function MedidorProgreso({ titulo, actual, limite, porcentaje, color }: MedidorProgresoProps) {
  const colorBase = {
    blue: 'rgb(59, 130, 246)',
    purple: 'rgb(147, 51, 234)',
    green: 'rgb(34, 197, 94)'
  }[color];

  const colorFondo = {
    blue: 'rgb(219, 234, 254)',
    purple: 'rgb(237, 233, 254)',
    green: 'rgb(220, 252, 231)'
  }[color];

  const strokeColor = obtenerColorPorcentaje(porcentaje);
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(porcentaje, 100) / 100) * circumference;

  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold mb-4">{titulo}</h3>
      
      <div className="relative inline-flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          <circle
            stroke={colorFondo}
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold" style={{ color: strokeColor }}>
            {porcentaje.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {actual.toFixed(0)}€ / {limite.toFixed(0)}€
          </p>
        </div>
      </div>
      
      <div className="mt-2">
        <p className="text-sm text-gray-600">
          Restante: <span className="font-medium">{Math.max(0, limite - actual).toFixed(2)}€</span>
        </p>
      </div>
    </div>
  );
}