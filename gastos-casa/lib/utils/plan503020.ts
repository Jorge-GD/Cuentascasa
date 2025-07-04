import { Movimiento, Categoria, Tipo503020 } from '@/lib/types/database';
import { prisma } from '@/lib/db/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

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

// New interface for database-based analysis
export interface Plan503020Analysis {
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
  metas: any[];
  alertas: string[];
}

export async function calculatePlan503020(
  cuentaIds: string[],
  year: number,
  month: number
): Promise<Plan503020Analysis> {
  // Obtener fecha de inicio y fin del mes
  const fecha = new Date(year, month - 1);
  const fechaInicio = startOfMonth(fecha);
  const fechaFin = endOfMonth(fecha);

  // Obtener configuración del usuario
  const configuracion = await prisma.configuracionUsuario.findFirst({
    include: {
      metas: {
        where: { activa: true },
        orderBy: { prioridad: 'asc' }
      }
    }
  });

  // Obtener categorías con su tipo 50/30/20
  const categorias = await prisma.categoria.findMany({
    include: {
      subcategorias: true
    }
  });

  // Obtener movimientos del período
  const whereClause: any = {
    fecha: {
      gte: fechaInicio,
      lte: fechaFin
    }
  };

  if (cuentaIds && cuentaIds.length > 0) {
    whereClause.cuentaId = { in: cuentaIds };
  }

  const movimientos = await prisma.movimiento.findMany({
    where: whereClause
  });

  // Calcular ingresos del mes (buscar nóminas del mes anterior, 5-7 días antes del inicio del mes)
  const inicioMesActual = fechaInicio;
  const fecha7DiasAntes = new Date(inicioMesActual);
  fecha7DiasAntes.setDate(inicioMesActual.getDate() - 7);
  const fecha5DiasAntes = new Date(inicioMesActual);
  fecha5DiasAntes.setDate(inicioMesActual.getDate() - 5);
  
  // Buscar nóminas en el rango de 5-7 días antes del inicio del mes actual
  // EXCLUYENDO las que pertenezcan al mes actual (evitar doble contabilización)
  const nominasAnterior = await prisma.movimiento.findMany({
    where: {
      ...(cuentaIds && cuentaIds.length > 0 ? { cuentaId: { in: cuentaIds } } : {}),
      fecha: {
        gte: fecha7DiasAntes,
        lte: fecha5DiasAntes
      },
      categoria: 'Ingresos',
      subcategoria: 'Nómina',
      importe: { gt: 0 },
      // EXCLUIR las nóminas del mes actual para evitar duplicados
      NOT: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    }
  });

  const ingresosMes = nominasAnterior.reduce((sum, m) => sum + m.importe, 0);

  // Usar ingreso configurado o calculado
  const ingresoBase = configuracion?.ingresoMensual || ingresosMes;

  // Calcular límites 50/30/20
  const limites = {
    necesidades: ingresoBase * 0.5,
    deseos: ingresoBase * 0.3,
    ahorro: ingresoBase * 0.2
  };

  // Agrupar gastos por tipo 50/30/20
  const gastosPorTipo = {
    necesidades: 0,
    deseos: 0,
    ahorro: 0,
    sinCategorizar: 0
  };

  // Detalle de gastos por categoría
  const detallePorCategoria: Record<string, {
    categoria: string;
    tipo: string | null;
    total: number;
    subcategorias: Record<string, number>;
  }> = {};

  // Procesar movimientos (solo gastos)
  movimientos
    .filter(m => m.importe < 0)
    .forEach(movimiento => {
      const importe = Math.abs(movimiento.importe);
      const categoria = categorias.find(c => c.nombre === movimiento.categoria);
      
      if (categoria?.tipo503020) {
        gastosPorTipo[categoria.tipo503020 as keyof typeof gastosPorTipo] += importe;
        
        // Agregar al detalle
        if (!detallePorCategoria[categoria.nombre]) {
          detallePorCategoria[categoria.nombre] = {
            categoria: categoria.nombre,
            tipo: categoria.tipo503020,
            total: 0,
            subcategorias: {}
          };
        }
        
        detallePorCategoria[categoria.nombre].total += importe;
        
        if (movimiento.subcategoria) {
          detallePorCategoria[categoria.nombre].subcategorias[movimiento.subcategoria] = 
            (detallePorCategoria[categoria.nombre].subcategorias[movimiento.subcategoria] || 0) + importe;
        }
      } else {
        gastosPorTipo.sinCategorizar += importe;
      }
    });

  // Calcular porcentajes y estados
  const analisis: Plan503020Analysis = {
    ingresoBase,
    ingresosMes,
    limites,
    gastos: gastosPorTipo,
    porcentajes: {
      necesidades: ingresoBase > 0 ? (gastosPorTipo.necesidades / limites.necesidades) * 100 : 0,
      deseos: ingresoBase > 0 ? (gastosPorTipo.deseos / limites.deseos) * 100 : 0,
      ahorro: ingresoBase > 0 ? (gastosPorTipo.ahorro / limites.ahorro) * 100 : 0
    },
    detallePorCategoria: Object.values(detallePorCategoria),
    metas: configuracion?.metas || [],
    alertas: generarAlertas(gastosPorTipo, limites, fecha.getDate())
  };

  return analisis;
}

function generarAlertas(gastos: any, limites: any, diaDelMes: number): string[] {
  const alertas: string[] = [];
  const diasEnMes = 30;
  const porcentajeMesTranscurrido = (diaDelMes / diasEnMes) * 100;

  // Alerta para necesidades
  const porcentajeNecesidades = (gastos.necesidades / limites.necesidades) * 100;
  if (porcentajeNecesidades > 55) {
    alertas.push(`⚠️ Tus gastos en Necesidades han alcanzado el ${porcentajeNecesidades.toFixed(0)}% del límite recomendado.`);
  }

  // Alerta para deseos
  const porcentajeDeseos = (gastos.deseos / limites.deseos) * 100;
  if (porcentajeDeseos > 70 && diaDelMes < 15) {
    alertas.push(`🎯 Llevas un ${porcentajeDeseos.toFixed(0)}% de tu presupuesto de Deseos gastado y solo estamos a día ${diaDelMes}.`);
  }

  // Alerta para ahorro
  const porcentajeAhorro = (gastos.ahorro / limites.ahorro) * 100;
  if (porcentajeAhorro >= 100) {
    alertas.push(`🎉 ¡Enhorabuena! Has alcanzado tu meta de ahorro del 20% este mes.`);
  } else if (diaDelMes > 20 && porcentajeAhorro < 50) {
    alertas.push(`💰 Quedan pocos días del mes y solo has ahorrado el ${porcentajeAhorro.toFixed(0)}% de tu objetivo.`);
  }

  // Alerta para sin categorizar
  if (gastos.sinCategorizar > 0) {
    alertas.push(`📊 Tienes ${gastos.sinCategorizar.toFixed(2)}€ en gastos sin categorizar. Asígnalos para un mejor control.`);
  }

  return alertas;
}

// Placeholder functions for additional cache methods
export async function calculatePlan503020Predictions(cuentaIds: string[], months: number = 6) {
  // Implementation would go here
  console.log(`🔍 Calculando predicciones Plan 50/30/20 para ${months} meses...`);
  return { message: 'Predicciones not implemented yet' };
}

export async function calculatePlan503020Trends(cuentaIds: string[], months: number = 12) {
  // Implementation would go here
  console.log(`🔍 Calculando tendencias Plan 50/30/20 para ${months} meses...`);
  return { message: 'Tendencias not implemented yet' };
}