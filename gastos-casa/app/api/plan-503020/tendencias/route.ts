import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const meses = parseInt(searchParams.get('meses') || '6');
    const cuentaIds = searchParams.get('cuentaIds')?.split(',').filter(Boolean);

    const fechaActual = new Date();
    const analisisMeses: any[] = [];

    // Obtener configuración del usuario
    const configuracion = await prisma.configuracionUsuario.findFirst();

    // Obtener categorías con su tipo 50/30/20
    const categorias = await prisma.categoria.findMany();

    // Analizar cada mes hacia atrás
    for (let i = 0; i < meses; i++) {
      const fechaMes = subMonths(fechaActual, i);
      const fechaInicio = startOfMonth(fechaMes);
      const fechaFin = endOfMonth(fechaMes);

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

      // Obtener porcentajes configurados
      const porcentajes = {
        necesidades: configuracion?.porcentajeNecesidades || 50,
        deseos: configuracion?.porcentajeDeseos || 30,
        ahorro: configuracion?.porcentajeAhorro || 20
      };

      // Calcular límites con porcentajes personalizados
      const limites = {
        necesidades: ingresoBase * (porcentajes.necesidades / 100),
        deseos: ingresoBase * (porcentajes.deseos / 100),
        ahorro: ingresoBase * (porcentajes.ahorro / 100)
      };

      // Agrupar gastos por tipo 50/30/20
      const gastosPorTipo = {
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
            gastosPorTipo[categoria.tipo503020 as keyof typeof gastosPorTipo] += importe;
          } else {
            gastosPorTipo.sinCategorizar += importe;
          }
        });

      // Calcular porcentajes utilizados
      const porcentajesUtilizados = {
        necesidades: limites.necesidades > 0 ? (gastosPorTipo.necesidades / limites.necesidades) * 100 : 0,
        deseos: limites.deseos > 0 ? (gastosPorTipo.deseos / limites.deseos) * 100 : 0,
        ahorro: limites.ahorro > 0 ? (gastosPorTipo.ahorro / limites.ahorro) * 100 : 0
      };

      // Calcular score del mes (qué tan bien se siguió el plan)
      const scoreNecesidades = Math.max(0, 100 - Math.abs(porcentajesUtilizados.necesidades - 100));
      const scoreDeseos = Math.max(0, 100 - Math.abs(porcentajesUtilizados.deseos - 100));
      const scoreAhorro = Math.max(0, 100 - Math.abs(porcentajesUtilizados.ahorro - 100));
      const scorePromedio = (scoreNecesidades + scoreDeseos + scoreAhorro) / 3;

      analisisMeses.push({
        mes: format(fechaMes, 'MMM yyyy', { locale: es }),
        fecha: fechaMes,
        ingresoBase,
        ingresosMes,
        porcentajesConfiguracion: porcentajes,
        limites,
        gastos: gastosPorTipo,
        porcentajesUtilizados,
        score: {
          necesidades: scoreNecesidades,
          deseos: scoreDeseos,
          ahorro: scoreAhorro,
          promedio: scorePromedio
        },
        cumplioObjetivos: {
          necesidades: porcentajesUtilizados.necesidades <= 110, // Tolerancia 10%
          deseos: porcentajesUtilizados.deseos <= 110,
          ahorro: porcentajesUtilizados.ahorro >= 80 // Al menos 80% del objetivo de ahorro
        }
      });
    }

    // Calcular tendencias y patrones
    const tendencias = calcularTendencias(analisisMeses);

    return NextResponse.json({
      analisisMeses: analisisMeses.reverse(), // Más reciente primero
      tendencias,
      resumen: {
        mejorMes: analisisMeses.reduce((max, mes) => 
          mes.score.promedio > max.score.promedio ? mes : max
        ),
        peorMes: analisisMeses.reduce((min, mes) => 
          mes.score.promedio < min.score.promedio ? mes : min
        ),
        promedioScore: analisisMeses.reduce((sum, mes) => sum + mes.score.promedio, 0) / analisisMeses.length,
        mesesCumplidos: analisisMeses.filter(mes => 
          mes.cumplioObjetivos.necesidades && 
          mes.cumplioObjetivos.deseos && 
          mes.cumplioObjetivos.ahorro
        ).length
      }
    });
  } catch (error) {
    console.error('Error al obtener tendencias 50/30/20:', error);
    return NextResponse.json(
      { error: 'Error al obtener tendencias' },
      { status: 500 }
    );
  }
}

function calcularTendencias(meses: any[]) {
  if (meses.length < 2) return null;

  const calcularTendencia = (valores: number[]) => {
    const n = valores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = valores;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const pendiente = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return {
      pendiente,
      direccion: pendiente > 0.5 ? 'mejorando' : pendiente < -0.5 ? 'empeorando' : 'estable'
    };
  };

  return {
    scoreGeneral: calcularTendencia(meses.map(m => m.score.promedio)),
    gastoNecesidades: calcularTendencia(meses.map(m => m.porcentajesUtilizados.necesidades)),
    gastoDeseos: calcularTendencia(meses.map(m => m.porcentajesUtilizados.deseos)),
    ahorro: calcularTendencia(meses.map(m => m.porcentajesUtilizados.ahorro)),
    ingresos: calcularTendencia(meses.map(m => m.ingresosMes))
  };
}