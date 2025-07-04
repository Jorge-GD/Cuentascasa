'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Calendar, Brain } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalisisPredictivoProps {
  cuentaIds: string[];
}

interface Prediccion {
  categoria: 'necesidades' | 'deseos' | 'ahorro';
  gastoActual: number;
  gastoPredichoFinMes: number;
  probabilidadSuperarLimite: number;
  tendencia: 'up' | 'down' | 'stable';
  confianza: number;
  alertas: string[];
}

interface PatronGasto {
  diaSemana: number;
  promedio: number;
  categoria: string;
}

export function AnalisisPredictivo({ cuentaIds }: AnalisisPredictivoProps) {
  const [predicciones, setPredicciones] = useState<Prediccion[]>([]);
  const [patrones, setPatrones] = useState<PatronGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertasPreventivas, setAlertasPreventivas] = useState<string[]>([]);

  useEffect(() => {
    fetchAnalisisPredictivo();
  }, [cuentaIds]);

  const fetchAnalisisPredictivo = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        cuentaIds: cuentaIds.join(',')
      });

      const response = await fetch(`/api/plan-503020/predicciones?${params}`);
      const data = await response.json();
      
      setPredicciones(data.predicciones || []);
      setPatrones(data.patrones || []);
      setAlertasPreventivas(data.alertasPreventivas || []);
    } catch (error) {
      console.error('Error al cargar análisis predictivo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const getColorByCategory = (categoria: string) => {
    switch (categoria) {
      case 'necesidades': return 'blue';
      case 'deseos': return 'purple';
      case 'ahorro': return 'green';
      default: return 'gray';
    }
  };

  const getProbabilityColor = (probabilidad: number) => {
    if (probabilidad >= 80) return 'text-red-600 bg-red-50';
    if (probabilidad >= 60) return 'text-amber-600 bg-amber-50';
    if (probabilidad >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getConfidenceLabel = (confianza: number) => {
    if (confianza >= 80) return 'Alta';
    if (confianza >= 60) return 'Media';
    return 'Baja';
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;
  }

  const diasRestantes = endOfMonth(new Date()).getDate() - new Date().getDate();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-xl font-semibold">Análisis Predictivo</h3>
          <Badge variant="outline" className="ml-auto">
            {diasRestantes} días restantes
          </Badge>
        </div>

        {/* Alertas preventivas */}
        {alertasPreventivas.length > 0 && (
          <div className="mb-6 space-y-2">
            {alertasPreventivas.map((alerta, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-amber-800 text-sm">{alerta}</p>
              </div>
            ))}
          </div>
        )}

        {/* Predicciones por categoría */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {predicciones.map((prediccion, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold capitalize flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-${getColorByCategory(prediccion.categoria)}-500`} />
                  {prediccion.categoria}
                </h4>
                {getTrendIcon(prediccion.tendencia)}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Gasto actual</span>
                    <span className="font-medium">{prediccion.gastoActual.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Predicción fin de mes</span>
                    <span className="font-bold">{prediccion.gastoPredichoFinMes.toFixed(2)}€</span>
                  </div>
                  
                  <Progress 
                    value={(prediccion.gastoActual / prediccion.gastoPredichoFinMes) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className={`p-2 rounded text-center text-sm font-medium ${
                    getProbabilityColor(prediccion.probabilidadSuperarLimite)
                  }`}>
                    {prediccion.probabilidadSuperarLimite.toFixed(0)}% probabilidad de exceder límite
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center">
                    Confianza: {getConfidenceLabel(prediccion.confianza)} ({prediccion.confianza.toFixed(0)}%)
                  </div>
                </div>

                {prediccion.alertas.length > 0 && (
                  <div className="space-y-1">
                    {prediccion.alertas.map((alerta, alertaIndex) => (
                      <p key={alertaIndex} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {alerta}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Patrones de gasto */}
      {patrones.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Patrones de Gasto Detectados
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patrones.slice(0, 6).map((patron, index) => {
              const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
              
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{diasSemana[patron.diaSemana]}</span>
                    <Badge variant="outline" className="text-xs">
                      {patron.categoria}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Promedio: <span className="font-medium">{patron.promedio.toFixed(2)}€</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              💡 <strong>Consejo:</strong> Los {patrones.length > 0 ? diasSemana[patrones[0].diaSemana].toLowerCase() : 'días'} 
              {' '}sueles gastar más. Planifica con antelación para mantener el control.
            </p>
          </div>
        </Card>
      )}

      {/* Recomendaciones inteligentes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recomendaciones Inteligentes</h3>
        
        <div className="space-y-3">
          {predicciones.map((prediccion, index) => {
            if (prediccion.probabilidadSuperarLimite < 50) return null;
            
            return (
              <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                <h4 className="font-medium capitalize mb-2">
                  Acción recomendada para {prediccion.categoria}
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  {getRecomendacion(prediccion)}
                </p>
                <div className="text-xs text-purple-600">
                  Ahorro potencial: {(prediccion.gastoPredichoFinMes * 0.1).toFixed(2)}€
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function getRecomendacion(prediccion: Prediccion): string {
  const ahorroPotencial = prediccion.gastoPredichoFinMes * 0.1;
  
  switch (prediccion.categoria) {
    case 'necesidades':
      return `Revisa tus gastos esenciales. Considera cambiar de proveedor o buscar alternativas más económicas. Podrías ahorrar hasta ${ahorroPotencial.toFixed(2)}€.`;
    
    case 'deseos':
      return `Limita las compras impulsivas. Establece un día específico para compras no esenciales o usa la regla de esperar 24 horas antes de comprar.`;
    
    case 'ahorro':
      return `¡Excelente! Estás superando tus metas de ahorro. Considera aumentar tus objetivos o explorar nuevas opciones de inversión.`;
    
    default:
      return 'Mantén el control de tus gastos revisando regularmente tus hábitos de consumo.';
  }
}

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];