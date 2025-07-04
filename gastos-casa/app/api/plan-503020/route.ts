import { NextRequest, NextResponse } from 'next/server';
import { Plan503020Cache } from '@/lib/redis/analytics-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mes = searchParams.get('mes');
    const year = searchParams.get('year');
    const cuentaIds = searchParams.get('cuentaIds')?.split(',').filter(Boolean) || [];

    // Usar fecha actual si no se proporcionan mes/año
    const fecha = mes && year 
      ? new Date(parseInt(year), parseInt(mes) - 1)
      : new Date();
    
    const yearToUse = fecha.getFullYear();
    const monthToUse = fecha.getMonth() + 1;

    // Usar cache
    const analisis = await Plan503020Cache.getAnalysis(cuentaIds, yearToUse, monthToUse);

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

