import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { startOfMonth, endOfMonth, startOfDay, subMonths, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cuentaIds = searchParams.get('cuentaIds')?.split(',').filter(Boolean);

    const fechaActual = new Date();
    const fechaInicio = startOfMonth(fechaActual);
    const fechaFin = endOfMonth(fechaActual);
    const diaActual = fechaActual.getDate();
    const diasEnMes = fechaFin.getDate();
    const diasRestantes = diasEnMes - diaActual;
    const porcentajeMesTranscurrido = (diaActual / diasEnMes) * 100;

    // Obtener configuración del usuario
    const configuracion = await prisma.configuracionUsuario.findFirst();
    
    // Obtener categorías con su tipo 50/30/20
    const categorias = await prisma.categoria.findMany();

    // Obtener movimientos del mes actual
    const whereClauseActual: any = {
      fecha: { gte: fechaInicio, lte: fechaActual }
    };
    if (cuentaIds && cuentaIds.length > 0) {
      whereClauseActual.cuentaId = { in: cuentaIds };
    }

    const movimientosActuales = await prisma.movimiento.findMany({
      where: whereClauseActual
    });

    // Obtener datos históricos (últimos 6 meses) para análisis de patrones
    const movimientosHistoricos = await prisma.movimiento.findMany({
      where: {
        ...whereClauseActual,
        fecha: {
          gte: subMonths(fechaActual, 6),
          lte: fechaActual
        }
      }
    });

    // Calcular ingresos
    const ingresosMes = movimientosActuales
      .filter(m => m.importe > 0)
      .reduce((sum, m) => sum + m.importe, 0);

    const ingresoBase = configuracion?.ingresoMensual || ingresosMes;

    // Obtener porcentajes configurados
    const porcentajes = {
      necesidades: configuracion?.porcentajeNecesidades || 50,
      deseos: configuracion?.porcentajeDeseos || 30,
      ahorro: configuracion?.porcentajeAhorro || 20
    };

    // Calcular límites
    const limites = {
      necesidades: ingresoBase * (porcentajes.necesidades / 100),
      deseos: ingresoBase * (porcentajes.deseos / 100),
      ahorro: ingresoBase * (porcentajes.ahorro / 100)
    };

    // Agrupar gastos actuales por tipo
    const gastosActuales = {
      necesidades: 0,
      deseos: 0,
      ahorro: 0
    };

    movimientosActuales
      .filter(m => m.importe < 0)
      .forEach(movimiento => {
        const importe = Math.abs(movimiento.importe);
        const categoria = categorias.find(c => c.nombre === movimiento.categoria);
        
        if (categoria?.tipo503020 && gastosActuales.hasOwnProperty(categoria.tipo503020)) {
          gastosActuales[categoria.tipo503020 as keyof typeof gastosActuales] += importe;
        }
      });

    // Calcular patrones de gasto por día de la semana
    const patronesPorDia = calcularPatronesDiarios(movimientosHistoricos, categorias);

    // Generar predicciones para cada categoría
    const predicciones = Object.entries(gastosActuales).map(([categoria, gastoActual]) => {
      const limite = limites[categoria as keyof typeof limites];
      
      // Predicción simple basada en tendencia actual
      const gastoPromedioDiario = gastoActual / diaActual;
      const gastoPredichoFinMes = gastoPromedioDiario * diasEnMes;
      
      // Predicción mejorada basada en patrones históricos
      const patronesCategoria = patronesPorDia.filter(p => p.categoria === categoria);
      const gastoPredichoConPatrones = calcularPrediccionConPatrones(
        gastoActual, 
        patronesCategoria, 
        diasRestantes, 
        fechaActual
      );

      // Usar la predicción más conservadora
      const gastoPredichoFinal = Math.max(gastoPredichoFinMes, gastoPredichoConPatrones);
      
      const probabilidadSuperarLimite = calcularProbabilidadExceso(
        gastoActual, 
        gastoPredichoFinal, 
        limite, 
        porcentajeMesTranscurrido
      );

      const tendencia = calcularTendencia(gastoActual, gastoPromedioDiario, diasRestantes);
      const confianza = calcularConfianza(patronesCategoria.length, porcentajeMesTranscurrido);

      const alertas = generarAlertasCategoria(
        categoria as 'necesidades' | 'deseos' | 'ahorro',
        gastoActual,
        gastoPredichoFinal,
        limite,
        probabilidadSuperarLimite
      );

      return {
        categoria,
        gastoActual,
        gastoPredichoFinMes: gastoPredichoFinal,
        probabilidadSuperarLimite,
        tendencia,
        confianza,
        alertas
      };
    });

    // Generar alertas preventivas generales
    const alertasPreventivas = generarAlertasPreventivas(predicciones, diasRestantes);

    return NextResponse.json({
      predicciones,
      patrones: patronesPorDia.slice(0, 10), // Top 10 patrones
      alertasPreventivas,
      metadatos: {
        diasRestantes,
        porcentajeMesTranscurrido,
        ingresoBase,
        limites
      }
    });
  } catch (error) {
    console.error('Error al generar predicciones:', error);
    return NextResponse.json(
      { error: 'Error al generar predicciones' },
      { status: 500 }
    );
  }
}

function calcularPatronesDiarios(movimientos: any[], categorias: any[]) {
  const patronesPorDiaCategoria: Record<string, Record<number, number[]>> = {};

  movimientos
    .filter(m => m.importe < 0)
    .forEach(movimiento => {
      const categoria = categorias.find(c => c.nombre === movimiento.categoria);
      if (!categoria?.tipo503020) return;

      const diaSemana = new Date(movimiento.fecha).getDay();
      const importe = Math.abs(movimiento.importe);
      
      if (!patronesPorDiaCategoria[categoria.tipo503020]) {
        patronesPorDiaCategoria[categoria.tipo503020] = {};
      }
      
      if (!patronesPorDiaCategoria[categoria.tipo503020][diaSemana]) {
        patronesPorDiaCategoria[categoria.tipo503020][diaSemana] = [];
      }
      
      patronesPorDiaCategoria[categoria.tipo503020][diaSemana].push(importe);
    });

  // Calcular promedios
  const patrones: Array<{
    diaSemana: number;
    promedio: number;
    categoria: string;
  }> = [];

  Object.entries(patronesPorDiaCategoria).forEach(([categoria, diasData]) => {
    Object.entries(diasData).forEach(([dia, importes]) => {
      if (importes.length >= 3) { // Al menos 3 datos para ser confiable
        const promedio = importes.reduce((sum, imp) => sum + imp, 0) / importes.length;
        patrones.push({
          diaSemana: parseInt(dia),
          promedio,
          categoria
        });
      }
    });
  });

  return patrones.sort((a, b) => b.promedio - a.promedio);
}

function calcularPrediccionConPatrones(
  gastoActual: number,
  patrones: any[],
  diasRestantes: number,
  fechaActual: Date
): number {
  if (patrones.length === 0) {
    return gastoActual * (1 + diasRestantes / new Date().getDate());
  }

  // Calcular gasto esperado para los días restantes basado en patrones
  let gastoEsperadoRestante = 0;
  
  for (let i = 1; i <= diasRestantes; i++) {
    const fechaFutura = new Date(fechaActual);
    fechaFutura.setDate(fechaActual.getDate() + i);
    const diaSemana = fechaFutura.getDay();
    
    const patronDia = patrones.find(p => p.diaSemana === diaSemana);
    if (patronDia) {
      gastoEsperadoRestante += patronDia.promedio;
    }
  }

  return gastoActual + gastoEsperadoRestante;
}

function calcularProbabilidadExceso(
  gastoActual: number,
  gastoPredicho: number,
  limite: number,
  porcentajeMesTranscurrido: number
): number {
  if (gastoPredicho <= limite) return 0;
  
  const exceso = gastoPredicho - limite;
  const porcentajeExceso = (exceso / limite) * 100;
  
  // Factor de confianza basado en cuánto del mes ha transcurrido
  const factorConfianza = Math.min(porcentajeMesTranscurrido / 100, 1);
  
  // Probabilidad base del exceso
  let probabilidad = Math.min(porcentajeExceso * 2, 100);
  
  // Ajustar por confianza temporal
  probabilidad *= factorConfianza;
  
  return Math.min(Math.max(probabilidad, 0), 100);
}

function calcularTendencia(gastoActual: number, promedioDiario: number, diasRestantes: number): 'up' | 'down' | 'stable' {
  const gastoEsperado = promedioDiario * (new Date().getDate());
  const diferencia = (gastoActual - gastoEsperado) / gastoEsperado;
  
  if (diferencia > 0.1) return 'up';
  if (diferencia < -0.1) return 'down';
  return 'stable';
}

function calcularConfianza(numPatrones: number, porcentajeMesTranscurrido: number): number {
  // Confianza basada en datos históricos disponibles
  const confianzaPatrones = Math.min((numPatrones / 7) * 100, 100); // Máximo 7 días de la semana
  
  // Confianza basada en cuánto del mes ha transcurrido
  const confianzaTemporal = porcentajeMesTranscurrido;
  
  return (confianzaPatrones * 0.4 + confianzaTemporal * 0.6);
}

function generarAlertasCategoria(
  categoria: 'necesidades' | 'deseos' | 'ahorro',
  gastoActual: number,
  gastoPredicho: number,
  limite: number,
  probabilidad: number
): string[] {
  const alertas: string[] = [];
  
  if (probabilidad > 80) {
    alertas.push(`Muy probable que excedas el límite de ${categoria} en ${(gastoPredicho - limite).toFixed(2)}€`);
  } else if (probabilidad > 60) {
    alertas.push(`Riesgo moderado de exceder el límite de ${categoria}`);
  }
  
  if (categoria === 'necesidades' && gastoActual / limite > 0.8) {
    alertas.push('Considera revisar gastos esenciales para identificar ahorros');
  }
  
  if (categoria === 'deseos' && gastoActual / limite > 0.7) {
    alertas.push('Limita las compras no esenciales por el resto del mes');
  }
  
  if (categoria === 'ahorro' && gastoActual < limite * 0.5) {
    alertas.push('Buen momento para aumentar tus ahorros');
  }
  
  return alertas;
}

function generarAlertasPreventivas(predicciones: any[], diasRestantes: number): string[] {
  const alertas: string[] = [];
  
  const categoriasEnRiesgo = predicciones.filter(p => p.probabilidadSuperarLimite > 70);
  
  if (categoriasEnRiesgo.length > 0) {
    alertas.push(`⚠️ ${categoriasEnRiesgo.length} categoría(s) en riesgo de exceder límites`);
  }
  
  if (diasRestantes <= 7) {
    const gastosAltosProximamente = predicciones.some(p => p.tendencia === 'up');
    if (gastosAltosProximamente) {
      alertas.push('📅 Última semana del mes: controla especialmente los gastos');
    }
  }
  
  const categoriaDeseos = predicciones.find(p => p.categoria === 'deseos');
  if (categoriaDeseos && categoriaDeseos.probabilidadSuperarLimite > 60) {
    alertas.push('🎯 Considera implementar la regla "24 horas" antes de compras no esenciales');
  }
  
  return alertas;
}