import { Movimiento, Categoria, Tipo503020 } from '@/lib/types/database';

export interface Analisis503020 {
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
  balance: {
    necesidades: number;
    deseos: number;
    ahorro: number;
  };
}

export function calcularAnalisis503020(
  movimientos: Movimiento[],
  categorias: Categoria[],
  ingresoConfigurado?: number
): Analisis503020 {
  // Calcular ingresos del período
  const ingresosMes = movimientos
    .filter(m => m.importe > 0)
    .reduce((sum, m) => sum + m.importe, 0);

  // Usar ingreso configurado o calculado
  const ingresoBase = ingresoConfigurado || ingresosMes;

  // Calcular límites 50/30/20
  const limites = {
    necesidades: ingresoBase * 0.5,
    deseos: ingresoBase * 0.3,
    ahorro: ingresoBase * 0.2
  };

  // Inicializar gastos
  const gastos = {
    necesidades: 0,
    deseos: 0,
    ahorro: 0,
    sinCategorizar: 0
  };

  // Procesar movimientos (solo gastos)
  movimientos
    .filter(m => m.importe < 0)
    .forEach(movimiento => {
      const importe = Math.abs(movimiento.importe);
      const categoria = categorias.find(c => c.nombre === movimiento.categoria);
      
      if (categoria?.tipo503020) {
        gastos[categoria.tipo503020 as keyof typeof gastos] += importe;
      } else {
        gastos.sinCategorizar += importe;
      }
    });

  // Calcular porcentajes
  const porcentajes = {
    necesidades: limites.necesidades > 0 ? (gastos.necesidades / limites.necesidades) * 100 : 0,
    deseos: limites.deseos > 0 ? (gastos.deseos / limites.deseos) * 100 : 0,
    ahorro: limites.ahorro > 0 ? (gastos.ahorro / limites.ahorro) * 100 : 0
  };

  // Calcular balance (lo que queda)
  const balance = {
    necesidades: limites.necesidades - gastos.necesidades,
    deseos: limites.deseos - gastos.deseos,
    ahorro: limites.ahorro - gastos.ahorro
  };

  return {
    ingresoBase,
    ingresosMes,
    limites,
    gastos,
    porcentajes,
    balance
  };
}

export function obtenerColorPorcentaje(porcentaje: number): string {
  if (porcentaje <= 70) return '#10b981'; // verde
  if (porcentaje <= 90) return '#f59e0b'; // ámbar
  return '#ef4444'; // rojo
}

export function obtenerEstadoPorcentaje(porcentaje: number): 'good' | 'warning' | 'danger' {
  if (porcentaje <= 70) return 'good';
  if (porcentaje <= 90) return 'warning';
  return 'danger';
}

// Mapeo sugerido de categorías a tipos 50/30/20
export const CATEGORIA_TIPO_SUGERIDO: Record<string, Tipo503020> = {
  // Necesidades
  'Alimentación': Tipo503020.NECESIDADES,
  'Vivienda': Tipo503020.NECESIDADES,
  'Transporte': Tipo503020.NECESIDADES,
  'Salud': Tipo503020.NECESIDADES,
  'Educación': Tipo503020.NECESIDADES,
  'Seguros': Tipo503020.NECESIDADES,
  'Servicios básicos': Tipo503020.NECESIDADES,
  'Supermercado': Tipo503020.NECESIDADES,
  
  // Deseos
  'Ocio': Tipo503020.DESEOS,
  'Restaurantes': Tipo503020.DESEOS,
  'Entretenimiento': Tipo503020.DESEOS,
  'Compras': Tipo503020.DESEOS,
  'Viajes': Tipo503020.DESEOS,
  'Hobbies': Tipo503020.DESEOS,
  'Suscripciones': Tipo503020.DESEOS,
  
  // Ahorro
  'Ahorro': Tipo503020.AHORRO,
  'Inversión': Tipo503020.AHORRO,
  'Pensiones': Tipo503020.AHORRO,
  'Emergencia': Tipo503020.AHORRO
};