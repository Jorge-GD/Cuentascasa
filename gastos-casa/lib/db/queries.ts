import { prisma } from './prisma'
import type {
  Cuenta,
  Movimiento,
  Categoria,
  Subcategoria,
  CreateCuentaInput,
  CreateMovimientoInput,
  CreateCategoriaInput,
  CreateSubcategoriaInput,
  CuentaWithMovimientos,
  CategoriaWithSubcategorias
} from '../types/database'

// ========== CUENTAS ==========

export async function getCuentas(): Promise<Cuenta[]> {
  return prisma.cuenta.findMany({
    orderBy: { createdAt: 'asc' }
  })
}

export async function getCuentaById(id: string): Promise<Cuenta | null> {
  return prisma.cuenta.findUnique({
    where: { id }
  })
}

export async function getCuentaWithMovimientos(id: string): Promise<CuentaWithMovimientos | null> {
  return prisma.cuenta.findUnique({
    where: { id },
    include: {
      movimientos: {
        orderBy: { fecha: 'desc' }
      }
    }
  })
}

export async function createCuenta(data: CreateCuentaInput): Promise<Cuenta> {
  return prisma.cuenta.create({
    data
  })
}

export async function updateCuenta(id: string, data: Partial<CreateCuentaInput>): Promise<Cuenta> {
  return prisma.cuenta.update({
    where: { id },
    data
  })
}

export async function deleteCuenta(id: string): Promise<Cuenta> {
  return prisma.cuenta.delete({
    where: { id }
  })
}

// ========== MOVIMIENTOS ==========

export async function getMovimientos(cuentaId?: string, limit?: number): Promise<Movimiento[]> {
  return prisma.movimiento.findMany({
    where: cuentaId ? { cuentaId } : undefined,
    orderBy: { fecha: 'desc' },
    take: limit,
    include: {
      cuenta: true,
      etiquetas: true
    }
  })
}

export async function getMovimientoById(id: string): Promise<Movimiento | null> {
  return prisma.movimiento.findUnique({
    where: { id },
    include: {
      cuenta: true,
      etiquetas: true
    }
  })
}

export async function getMovimientosByDateRange(
  cuentaId: string,
  startDate: Date,
  endDate: Date
): Promise<Movimiento[]> {
  return prisma.movimiento.findMany({
    where: {
      cuentaId,
      fecha: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { fecha: 'desc' },
    include: {
      etiquetas: true
    }
  })
}

export async function getMovimientosByCuenta(cuentaId: string): Promise<Movimiento[]> {
  return prisma.movimiento.findMany({
    where: { cuentaId },
    orderBy: { fecha: 'desc' }
  })
}

export async function getMovimientosByCategoria(
  cuentaId: string,
  categoria: string
): Promise<Movimiento[]> {
  return prisma.movimiento.findMany({
    where: {
      cuentaId,
      categoria
    },
    orderBy: { fecha: 'desc' }
  })
}

export async function createMovimiento(data: CreateMovimientoInput): Promise<Movimiento> {
  return prisma.movimiento.create({
    data,
    include: {
      cuenta: true,
      etiquetas: true
    }
  })
}

export async function createMovimientosBatch(
  movimientos: Array<{
    fecha: Date
    descripcion: string
    importe: number
    saldo?: number
    categoriaING?: string
    subcategoriaING?: string
    categoria: string
    subcategoria?: string
    esManual?: boolean
    cuentaId: string
  }>
): Promise<{ count: number }> {
  return prisma.movimiento.createMany({
    data: movimientos
  })
}

export async function updateMovimiento(id: string, data: Partial<CreateMovimientoInput>): Promise<Movimiento> {
  return prisma.movimiento.update({
    where: { id },
    data,
    include: {
      cuenta: true,
      etiquetas: true
    }
  })
}

export async function deleteMovimiento(id: string): Promise<Movimiento> {
  return prisma.movimiento.delete({
    where: { id },
    include: {
      cuenta: true,
      etiquetas: true
    }
  })
}

// ========== CATEGORÍAS ==========

export async function getCategorias(): Promise<CategoriaWithSubcategorias[]> {
  return prisma.categoria.findMany({
    include: {
      subcategorias: true
    },
    orderBy: { nombre: 'asc' }
  })
}

export async function getCategoriaById(id: string): Promise<CategoriaWithSubcategorias | null> {
  return prisma.categoria.findUnique({
    where: { id },
    include: {
      subcategorias: true
    }
  })
}

export async function createCategoria(data: CreateCategoriaInput): Promise<Categoria> {
  return prisma.categoria.create({
    data
  })
}

export async function updateCategoria(id: string, data: Partial<CreateCategoriaInput>): Promise<Categoria> {
  return prisma.categoria.update({
    where: { id },
    data
  })
}

export async function deleteCategoria(id: string): Promise<Categoria> {
  return prisma.categoria.delete({
    where: { id }
  })
}

// ========== SUBCATEGORÍAS ==========

export async function createSubcategoria(data: CreateSubcategoriaInput): Promise<Subcategoria> {
  return prisma.subcategoria.create({
    data
  })
}

export async function updateSubcategoria(id: string, data: Partial<CreateSubcategoriaInput>): Promise<Subcategoria> {
  return prisma.subcategoria.update({
    where: { id },
    data
  })
}

export async function deleteSubcategoria(id: string): Promise<Subcategoria> {
  return prisma.subcategoria.delete({
    where: { id }
  })
}

// ========== REGLAS DE CATEGORIZACIÓN ==========

export async function getReglas(cuentaId?: string) {
  return prisma.reglaCategorizacion.findMany({
    where: {
      OR: [
        { cuentaId: null }, // Reglas globales
        { cuentaId }        // Reglas específicas de cuenta
      ],
      activa: true
    },
    orderBy: { prioridad: 'asc' }
  })
}

export async function createRegla(data: any) {
  return prisma.reglaCategorizacion.create({
    data
  })
}

// ========== ESTADÍSTICAS ==========

export async function getGastosPorCategoria(cuentaId: string, startDate: Date, endDate: Date) {
  return prisma.movimiento.groupBy({
    by: ['categoria'],
    where: {
      cuentaId,
      fecha: {
        gte: startDate,
        lte: endDate
      },
      importe: {
        lt: 0 // Solo gastos (importes negativos)
      }
    },
    _sum: {
      importe: true
    },
    _count: {
      id: true
    }
  })
}

export async function getTotalGastosMes(cuentaId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  
  const result = await prisma.movimiento.aggregate({
    where: {
      cuentaId,
      fecha: {
        gte: startDate,
        lte: endDate
      },
      importe: {
        lt: 0 // Solo gastos
      }
    },
    _sum: {
      importe: true
    }
  })
  
  return Math.abs(result._sum.importe || 0)
}