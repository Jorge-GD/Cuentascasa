'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ComparacionTemporalProps {
  cuentaIds: string[];
}

interface AnalisisMes {
  mes: string;
  fecha: Date;
  ingresoBase: number;
  gastos: {
    necesidades: number;
    deseos: number;
    ahorro: number;
    sinCategorizar: number;
  };
  porcentajesUtilizados: {
    necesidades: number;
    deseos: number;
    ahorro: number;
  };
  score: {
    necesidades: number;
    deseos: number;
    ahorro: number;
    promedio: number;
  };
  cumplioObjetivos: {
    necesidades: boolean;
    deseos: boolean;
    ahorro: boolean;
  };
}

interface TendenciasData {
  analisisMeses: AnalisisMes[];
  tendencias: any;
  resumen: {
    mejorMes: AnalisisMes;
    peorMes: AnalisisMes;
    promedioScore: number;
    mesesCumplidos: number;
  };
}

export function ComparacionTemporal({ cuentaIds }: ComparacionTemporalProps) {
  const [data, setData] = useState<TendenciasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mesesAnalisis, setMesesAnalisis] = useState(6);

  useEffect(() => {
    fetchTendencias();
  }, [cuentaIds, mesesAnalisis]);

  const fetchTendencias = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        meses: mesesAnalisis.toString(),
        cuentaIds: cuentaIds.join(',')
      });

      const response = await fetch(`/api/plan-503020/tendencias?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error al cargar tendencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direccion: string) => {
    switch (direccion) {
      case 'mejorando':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'empeorando':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direccion: string) => {
    switch (direccion) {
      case 'mejorando': return 'text-green-600';
      case 'empeorando': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;
  }

  if (!data) {
    return <div>Error al cargar datos de tendencias</div>;
  }

  // Preparar datos para gráficos
  const chartData = data.analisisMeses.map(mes => ({
    mes: mes.mes,
    necesidades: mes.porcentajesUtilizados.necesidades,
    deseos: mes.porcentajesUtilizados.deseos,
    ahorro: mes.porcentajesUtilizados.ahorro,
    score: mes.score.promedio,
    gastosNecesidades: mes.gastos.necesidades,
    gastosDeseos: mes.gastos.deseos,
    gastosAhorro: mes.gastos.ahorro
  }));

  const COLORS = {
    necesidades: '#3B82F6',
    deseos: '#8B5CF6',
    ahorro: '#10B981'
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Evolución del Plan 50/30/20</h3>
          <p className="text-gray-600">Análisis temporal de cumplimiento y tendencias</p>
        </div>
        
        <div className="flex gap-2">
          {[3, 6, 12].map(meses => (
            <button
              key={meses}
              onClick={() => setMesesAnalisis(meses)}
              className={`px-3 py-1 text-sm rounded ${
                mesesAnalisis === meses
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {meses} meses
            </button>
          ))}
        </div>
      </div>

      {/* Resumen de tendencias */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Score Promedio</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {data.resumen.promedioScore.toFixed(0)}%
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            <span className="font-medium">Meses Exitosos</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {data.resumen.mesesCumplidos}/{data.analisisMeses.length}
          </p>
        </div>

        <div className="p-4 bg-emerald-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span className="font-medium">Mejor Mes</span>
          </div>
          <p className="text-lg font-bold text-emerald-600">
            {data.resumen.mejorMes.mes}
          </p>
          <p className="text-sm text-emerald-500">
            {data.resumen.mejorMes.score.promedio.toFixed(0)}% score
          </p>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-medium">Área de Mejora</span>
          </div>
          <p className="text-lg font-bold text-amber-600">
            {data.resumen.peorMes.mes}
          </p>
          <p className="text-sm text-amber-500">
            {data.resumen.peorMes.score.promedio.toFixed(0)}% score
          </p>
        </div>
      </div>

      {/* Indicadores de tendencia */}
      {data.tendencias && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            {getTrendIcon(data.tendencias.scoreGeneral.direccion)}
            <span className="font-medium">Score General</span>
            <Badge variant="outline" className={getTrendColor(data.tendencias.scoreGeneral.direccion)}>
              {data.tendencias.scoreGeneral.direccion}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            {getTrendIcon(data.tendencias.gastoNecesidades.direccion)}
            <span className="font-medium">Necesidades</span>
            <Badge variant="outline" className={getTrendColor(data.tendencias.gastoNecesidades.direccion)}>
              {data.tendencias.gastoNecesidades.direccion}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            {getTrendIcon(data.tendencias.gastoDeseos.direccion)}
            <span className="font-medium">Deseos</span>
            <Badge variant="outline" className={getTrendColor(data.tendencias.gastoDeseos.direccion)}>
              {data.tendencias.gastoDeseos.direccion}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            {getTrendIcon(data.tendencias.ahorro.direccion)}
            <span className="font-medium">Ahorro</span>
            <Badge variant="outline" className={getTrendColor(data.tendencias.ahorro.direccion)}>
              {data.tendencias.ahorro.direccion}
            </Badge>
          </div>
        </div>
      )}

      <Tabs defaultValue="porcentajes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="porcentajes">% Utilizado</TabsTrigger>
          <TabsTrigger value="gastos">Gastos Absolutos</TabsTrigger>
          <TabsTrigger value="score">Score de Cumplimiento</TabsTrigger>
        </TabsList>
        
        <TabsContent value="porcentajes" className="mt-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis label={{ value: '% Utilizado', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="necesidades" stroke={COLORS.necesidades} name="Necesidades" strokeWidth={2} />
              <Line type="monotone" dataKey="deseos" stroke={COLORS.deseos} name="Deseos" strokeWidth={2} />
              <Line type="monotone" dataKey="ahorro" stroke={COLORS.ahorro} name="Ahorro" strokeWidth={2} />
              {/* Línea de referencia en 100% */}
              <Line type="monotone" dataKey={() => 100} stroke="#94A3B8" strokeDasharray="5 5" name="Objetivo (100%)" />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="gastos" className="mt-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis label={{ value: 'Euros (€)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)}€`} />
              <Legend />
              <Bar dataKey="gastosNecesidades" fill={COLORS.necesidades} name="Necesidades" />
              <Bar dataKey="gastosDeseos" fill={COLORS.deseos} name="Deseos" />
              <Bar dataKey="gastosAhorro" fill={COLORS.ahorro} name="Ahorro" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="score" className="mt-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#EF4444" name="Score Mensual" strokeWidth={3} />
              {/* Líneas de referencia */}
              <Line type="monotone" dataKey={() => 80} stroke="#10B981" strokeDasharray="5 5" name="Excelente (80%)" />
              <Line type="monotone" dataKey={() => 60} stroke="#F59E0B" strokeDasharray="5 5" name="Bueno (60%)" />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </Card>
  );
}