import { NextRequest, NextResponse } from 'next/server';
import { MetasAhorroCache } from '@/lib/redis/cache-modules';

export async function GET() {
  try {
    const metas = await MetasAhorroCache.getAll();
    return NextResponse.json(metas);
  } catch (error) {
    console.error('Error al obtener metas:', error);
    return NextResponse.json(
      { error: 'Error al obtener metas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, objetivo, tipo } = body;

    const { prisma } = await import('@/lib/db/prisma');
    
    // Obtener configuración
    let configuracion = await prisma.configuracionUsuario.findFirst();
    
    if (!configuracion) {
      // Crear configuración si no existe
      configuracion = await prisma.configuracionUsuario.create({
        data: {}
      });
    }

    // Obtener la prioridad más alta
    const ultimaMeta = await prisma.metaAhorro.findFirst({
      where: { configuracionId: configuracion.id },
      orderBy: { prioridad: 'desc' }
    });

    const nuevaPrioridad = ultimaMeta ? ultimaMeta.prioridad + 1 : 1;

    const meta = await prisma.metaAhorro.create({
      data: {
        nombre,
        objetivo,
        tipo,
        prioridad: nuevaPrioridad,
        configuracionId: configuracion.id
      }
    });

    // Invalidar cache
    await MetasAhorroCache.invalidateAll();

    return NextResponse.json(meta);
  } catch (error) {
    console.error('Error al crear meta:', error);
    return NextResponse.json(
      { error: 'Error al crear meta' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ahorrado, activa } = body;

    const { prisma } = await import('@/lib/db/prisma');

    const dataToUpdate: any = {};
    if (ahorrado !== undefined) dataToUpdate.ahorrado = ahorrado;
    if (activa !== undefined) dataToUpdate.activa = activa;

    const meta = await prisma.metaAhorro.update({
      where: { id },
      data: dataToUpdate
    });

    // Invalidar cache
    await MetasAhorroCache.invalidateAll();

    return NextResponse.json(meta);
  } catch (error) {
    console.error('Error al actualizar meta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar meta' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de meta requerido' },
        { status: 400 }
      );
    }

    const { prisma } = await import('@/lib/db/prisma');

    await prisma.metaAhorro.delete({
      where: { id }
    });

    // Invalidar cache
    await MetasAhorroCache.invalidateAll();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar meta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar meta' },
      { status: 500 }
    );
  }
}