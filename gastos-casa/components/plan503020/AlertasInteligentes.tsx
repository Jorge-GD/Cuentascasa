'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, Trophy, Info } from 'lucide-react';

interface AlertasInteligentesProps {
  alertas: string[];
}

export function AlertasInteligentes({ alertas }: AlertasInteligentesProps) {
  const getIconoAlerta = (alerta: string) => {
    if (alerta.includes('⚠️')) return <AlertTriangle className="h-4 w-4" />;
    if (alerta.includes('🎉')) return <Trophy className="h-4 w-4" />;
    if (alerta.includes('🎯')) return <TrendingUp className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  const getVarianteAlerta = (alerta: string) => {
    if (alerta.includes('⚠️')) return 'destructive';
    if (alerta.includes('🎉')) return 'default';
    return 'default';
  };

  return (
    <div className="mt-6 space-y-2">
      {alertas.map((alerta, index) => (
        <Alert key={index} variant={getVarianteAlerta(alerta)}>
          {getIconoAlerta(alerta)}
          <AlertDescription className="ml-2">
            {alerta.replace(/[⚠️🎉🎯💰📊]/g, '').trim()}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}