'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings, RotateCcw, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConfiguracionFlexibleProps {
  onConfiguracionChange: () => void;
}

interface ConfiguracionPorcentajes {
  porcentajeNecesidades: number;
  porcentajeDeseos: number;
  porcentajeAhorro: number;
}

const CONFIGURACIONES_PREDEFINIDAS = [
  { nombre: 'Clásico 50/30/20', necesidades: 50, deseos: 30, ahorro: 20, descripcion: 'Equilibrio estándar' },
  { nombre: 'Ahorro Agresivo', necesidades: 60, deseos: 20, ahorro: 20, descripcion: 'Maximiza ahorro' },
  { nombre: 'Conservador 60/25/15', necesidades: 60, deseos: 25, ahorro: 15, descripcion: 'Más gastos básicos' },
  { nombre: 'Joven Ambicioso', necesidades: 45, deseos: 25, ahorro: 30, descripcion: 'Inversión a futuro' },
  { nombre: 'Supervivencia 70/20/10', necesidades: 70, deseos: 20, ahorro: 10, descripcion: 'Ingresos ajustados' }
];

export function ConfiguracionFlexible({ onConfiguracionChange }: ConfiguracionFlexibleProps) {
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [configuracion, setConfiguracion] = useState<ConfiguracionPorcentajes>({
    porcentajeNecesidades: 50,
    porcentajeDeseos: 30,
    porcentajeAhorro: 20
  });
  const [configuracionTemp, setConfiguracionTemp] = useState<ConfiguracionPorcentajes>(configuracion);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    try {
      const response = await fetch('/api/configuracion-usuario');
      const data = await response.json();
      
      if (data) {
        const config = {
          porcentajeNecesidades: data.porcentajeNecesidades || 50,
          porcentajeDeseos: data.porcentajeDeseos || 30,
          porcentajeAhorro: data.porcentajeAhorro || 20
        };
        setConfiguracion(config);
        setConfiguracionTemp(config);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const actualizarPorcentaje = (campo: keyof ConfiguracionPorcentajes, valor: number) => {
    const nuevaConfig = { ...configuracionTemp, [campo]: valor };
    
    // Asegurar que la suma sea 100%
    const total = nuevaConfig.porcentajeNecesidades + nuevaConfig.porcentajeDeseos + nuevaConfig.porcentajeAhorro;
    
    if (total <= 100) {
      setConfiguracionTemp(nuevaConfig);
    }
  };

  const aplicarConfiguracionPredefinida = (config: typeof CONFIGURACIONES_PREDEFINIDAS[0]) => {
    setConfiguracionTemp({
      porcentajeNecesidades: config.necesidades,
      porcentajeDeseos: config.deseos,
      porcentajeAhorro: config.ahorro
    });
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      const response = await fetch('/api/configuracion-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuracionTemp)
      });

      if (response.ok) {
        setConfiguracion(configuracionTemp);
        setMostrarConfig(false);
        onConfiguracionChange();
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
    } finally {
      setGuardando(false);
    }
  };

  const resetearConfiguracion = () => {
    setConfiguracionTemp(configuracion);
  };

  const totalPorcentaje = configuracionTemp.porcentajeNecesidades + 
                         configuracionTemp.porcentajeDeseos + 
                         configuracionTemp.porcentajeAhorro;

  const isValidConfiguration = totalPorcentaje === 100;

  return (
    <div>
      {!mostrarConfig ? (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm text-gray-600">Configuración actual</p>
            <div className="flex gap-4 mt-1">
              <Badge variant="outline" className="bg-blue-50">
                Necesidades: {configuracion.porcentajeNecesidades}%
              </Badge>
              <Badge variant="outline" className="bg-purple-50">
                Deseos: {configuracion.porcentajeDeseos}%
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                Ahorro: {configuracion.porcentajeAhorro}%
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarConfig(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Personalizar
          </Button>
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Configuración Personalizada</h3>
              <p className="text-sm text-gray-600">
                Ajusta los porcentajes según tu situación financiera
              </p>
            </div>
            <div className={`text-lg font-bold ${
              isValidConfiguration ? 'text-green-600' : 'text-red-600'
            }`}>
              Total: {totalPorcentaje}%
            </div>
          </div>

          {/* Configuraciones predefinidas */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">Configuraciones predefinidas</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {CONFIGURACIONES_PREDEFINIDAS.map((config, index) => (
                <button
                  key={index}
                  onClick={() => aplicarConfiguracionPredefinida(config)}
                  className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-sm">{config.nombre}</div>
                  <div className="text-xs text-gray-500 mt-1">{config.descripcion}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {config.necesidades}/{config.deseos}/{config.ahorro}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Controles de porcentajes */}
          <div className="space-y-6">
            {/* Necesidades */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Necesidades</Label>
                <Input
                  type="number"
                  value={configuracionTemp.porcentajeNecesidades}
                  onChange={(e) => actualizarPorcentaje('porcentajeNecesidades', parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center"
                  min="0"
                  max="100"
                />
              </div>
              <Slider
                value={[configuracionTemp.porcentajeNecesidades]}
                onValueChange={(value) => actualizarPorcentaje('porcentajeNecesidades', value[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gastos esenciales: vivienda, alimentación, transporte, salud
              </p>
            </div>

            {/* Deseos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Deseos</Label>
                <Input
                  type="number"
                  value={configuracionTemp.porcentajeDeseos}
                  onChange={(e) => actualizarPorcentaje('porcentajeDeseos', parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center"
                  min="0"
                  max="100"
                />
              </div>
              <Slider
                value={[configuracionTemp.porcentajeDeseos]}
                onValueChange={(value) => actualizarPorcentaje('porcentajeDeseos', value[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Entretenimiento, restaurantes, compras no esenciales, hobbies
              </p>
            </div>

            {/* Ahorro */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Ahorro e Inversión</Label>
                <Input
                  type="number"
                  value={configuracionTemp.porcentajeAhorro}
                  onChange={(e) => actualizarPorcentaje('porcentajeAhorro', parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center"
                  min="0"
                  max="100"
                />
              </div>
              <Slider
                value={[configuracionTemp.porcentajeAhorro]}
                onValueChange={(value) => actualizarPorcentaje('porcentajeAhorro', value[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fondo de emergencia, inversiones, pago de deudas, metas futuras
              </p>
            </div>
          </div>

          {/* Visualización de la distribución */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Vista previa de la distribución</h4>
            <div className="flex h-8 rounded overflow-hidden">
              <div 
                className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${configuracionTemp.porcentajeNecesidades}%` }}
              >
                {configuracionTemp.porcentajeNecesidades > 10 ? `${configuracionTemp.porcentajeNecesidades}%` : ''}
              </div>
              <div 
                className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${configuracionTemp.porcentajeDeseos}%` }}
              >
                {configuracionTemp.porcentajeDeseos > 10 ? `${configuracionTemp.porcentajeDeseos}%` : ''}
              </div>
              <div 
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${configuracionTemp.porcentajeAhorro}%` }}
              >
                {configuracionTemp.porcentajeAhorro > 10 ? `${configuracionTemp.porcentajeAhorro}%` : ''}
              </div>
            </div>
          </div>

          {!isValidConfiguration && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                ⚠️ Los porcentajes deben sumar exactamente 100%. Actual: {totalPorcentaje}%
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={guardarConfiguracion}
              disabled={!isValidConfiguration || guardando}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1" />
              {guardando ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            
            <Button
              variant="outline"
              onClick={resetearConfiguracion}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Resetear
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setMostrarConfig(false)}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}