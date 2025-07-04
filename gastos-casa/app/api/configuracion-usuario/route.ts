import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const configuracion = await prisma.configuracionUsuario.findFirst({
      include: {
        metas: {
          orderBy: { prioridad: 'asc' }
        }
      }
    });

    return NextResponse.json(configuracion);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingresoMensual, porcentajeNecesidades, porcentajeDeseos, porcentajeAhorro } = body;

    // Buscar configuración existente
    const configuracionExistente = await prisma.configuracionUsuario.findFirst();

    let configuracion;
    if (configuracionExistente) {
      // Actualizar existente
      const dataToUpdate: any = {};
      if (ingresoMensual !== undefined) dataToUpdate.ingresoMensual = ingresoMensual;
      if (porcentajeNecesidades !== undefined) dataToUpdate.porcentajeNecesidades = porcentajeNecesidades;
      if (porcentajeDeseos !== undefined) dataToUpdate.porcentajeDeseos = porcentajeDeseos;
      if (porcentajeAhorro !== undefined) dataToUpdate.porcentajeAhorro = porcentajeAhorro;

      configuracion = await prisma.configuracionUsuario.update({
        where: { id: configuracionExistente.id },
        data: dataToUpdate,
        include: { metas: true }
      });
    } else {
      // Crear nueva con metas por defecto
      configuracion = await prisma.configuracionUsuario.create({
        data: {
          ingresoMensual,
          porcentajeNecesidades: porcentajeNecesidades || 50,
          porcentajeDeseos: porcentajeDeseos || 30,
          porcentajeAhorro: porcentajeAhorro || 20,
          metas: {
            create: [
              {
                nombre: 'Fondo de Emergencia',
                objetivo: ingresoMensual ? ingresoMensual * 3 : 9000, // 3 meses de gastos
                tipo: 'emergencia',
                prioridad: 1
              }
            ]
          }
        },
        include: { metas: true }
      });
    }

    return NextResponse.json(configuracion);
  } catch (error) {
    console.error('Error al crear/actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error al crear/actualizar configuración' },
      { status: 500 }
    );
  }
}