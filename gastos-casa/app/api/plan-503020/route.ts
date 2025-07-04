import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Tipo503020 } from '@/lib/types/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mes = searchParams.get('mes');
    const year = searchParams.get('year');
    const cuentaIds = searchParams.get('cuentaIds')?.split(',').filter(Boolean);

    // Obtener fecha de inicio y fin del mes
    const fecha = mes && year 
      ? new Date(parseInt(year), parseInt(mes) - 1)
      : new Date();
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

    // Calcular ingresos del mes
    const ingresosMes = movimientos
      .filter(m => m.importe > 0)
      .reduce((sum, m) => sum + m.importe, 0);

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
    const analisis = {
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

    return NextResponse.json(analisis);
  } catch (error) {
    console.error('Error al obtener análisis 50/30/20:', error);
    return NextResponse.json(
      { error: 'Error al obtener análisis' },
      { status: 500 }
    );
  }
}

// Actualizar tipo de categoría
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoriaId, tipo503020 } = body;

    const categoria = await prisma.categoria.update({
      where: { id: categoriaId },
      data: { tipo503020 }
    });

    return NextResponse.json(categoria);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return NextResponse.json(
      { error: 'Error al actualizar categoría' },
      { status: 500 }
    );
  }
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