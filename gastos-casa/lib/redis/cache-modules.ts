import { cacheManager } from './cache-manager';

/**
 * Cache específico para Categorías
 * TTL: 1 hora (las categorías no cambian frecuentemente)
 */
export class CategoriesCache {
  private static TTL = 3600; // 1 hora

  static async getAll() {
    return cacheManager.getOrSet(
      'categories:all',
      async () => {
        const { prisma } = await import('@/lib/db/prisma');
        console.log('🔍 Consultando categorías desde BD...');
        
        return await prisma.categoria.findMany({
          include: { 
            subcategorias: {
              orderBy: { nombre: 'asc' }
            }
          },
          orderBy: { nombre: 'asc' }
        });
      },
      this.TTL
    );
  }

  static async getById(id: string) {
    return cacheManager.getOrSet(
      `categories:${id}`,
      async () => {
        const { prisma } = await import('@/lib/db/prisma');
        console.log(`🔍 Consultando categoría ${id} desde BD...`);
        
        return await prisma.categoria.findUnique({
          where: { id },
          include: { 
            subcategorias: {
              orderBy: { nombre: 'asc' }
            }
          }
        });
      },
      this.TTL
    );
  }

  static async getSubcategoriesByCategory(categoriaId: string) {
    return cacheManager.getOrSet(
      `subcategories:${categoriaId}`,
      async () => {
        const { prisma } = await import('@/lib/db/prisma');
        console.log(`🔍 Consultando subcategorías de ${categoriaId} desde BD...`);
        
        return await prisma.subcategoria.findMany({
          where: { categoriaId },
          orderBy: { nombre: 'asc' }
        });
      },
      this.TTL
    );
  }

  // Invalidar todos los caches de categorías
  static async invalidateAll() {
    console.log('🗑️ Invalidando todos los caches de categorías...');
    await Promise.all([
      cacheManager.invalidatePattern('categories:*'),
      cacheManager.invalidatePattern('subcategories:*')
    ]);
  }

  // Invalidar categoría específica
  static async invalidateById(id: string) {
    console.log(`🗑️ Invalidando cache de categoría ${id}...`);
    await Promise.all([
      cacheManager.del(`categories:${id}`),
      cacheManager.del(`subcategories:${id}`),
      cacheManager.del('categories:all') // También invalidar la lista completa
    ]);
  }
}

/**
 * Cache específico para Cuentas
 * TTL: 30 minutos (pueden cambiar ocasionalmente)
 */
export class CuentasCache {
  private static TTL = 1800; // 30 minutos

  static async getAll() {
    return cacheManager.getOrSet(
      'accounts:all',
      async () => {
        const { prisma } = await import('@/lib/db/prisma');
        console.log('🔍 Consultando cuentas desde BD...');
        
        return await prisma.cuenta.findMany({
          orderBy: { nombre: 'asc' }
        });
      },
      this.TTL
    );
  }

  static async getById(id: string) {
    return cacheManager.getOrSet(
      `accounts:${id}`,
      async () => {
        const { prisma } = await import('@/lib/db/prisma');
        console.log(`🔍 Consultando cuenta ${id} desde BD...`);
        
        return await prisma.cuenta.findUnique({
          where: { id }
        });
      },
      this.TTL
    );
  }

  // Invalidar todos los caches de cuentas
  static async invalidateAll() {
    console.log('🗑️ Invalidando todos los caches de cuentas...');
    await cacheManager.invalidatePattern('accounts:*');
  }

  // Invalidar cuenta específica
  static async invalidateById(id: string) {
    console.log(`🗑️ Invalidando cache de cuenta ${id}...`);
    await Promise.all([
      cacheManager.del(`accounts:${id}`),
      cacheManager.del('accounts:all') // También invalidar la lista completa
    ]);
  }
}

/**
 * Cache básico para Dashboard
 * TTL: 15 minutos (datos que cambian con frecuencia)
 */
export class DashboardCache {
  private static TTL = 900; // 15 minutos

  static async getMetrics(cuentaId: string, year?: number, month?: number) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);
    
    const key = `dashboard:${cuentaId}:${currentYear}:${currentMonth}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando métricas dashboard para cuenta ${cuentaId}...`);
        
        // Importar dinámicamente para evitar problemas de ciclos
        const { calculateDashboardMetrics } = await import('@/lib/analytics/calculations');
        
        return await calculateDashboardMetrics(cuentaId, currentYear, currentMonth);
      },
      this.TTL
    );
  }

  // Invalidar métricas de una cuenta específica
  static async invalidateAccount(cuentaId: string, year?: number, month?: number) {
    if (year && month) {
      const key = `dashboard:${cuentaId}:${year}:${month}`;
      await cacheManager.del(key);
      console.log(`🗑️ Invalidado cache dashboard específico: ${key}`);
    } else {
      // Invalidar todos los dashboards de esta cuenta
      await cacheManager.invalidatePattern(`dashboard:${cuentaId}:*`);
      console.log(`🗑️ Invalidados todos los caches dashboard de cuenta ${cuentaId}`);
    }
  }

  // Invalidar todos los dashboards
  static async invalidateAll() {
    console.log('🗑️ Invalidando todos los caches de dashboard...');
    await cacheManager.invalidatePattern('dashboard:*');
  }
}

/**
 * Utilidad para invalidación en cascada
 */
export class CacheInvalidator {
  
  // Cuando se crea/actualiza/elimina un movimiento
  static async onMovimientoChange(cuentaId: string, fecha?: Date) {
    const year = fecha?.getFullYear() || new Date().getFullYear();
    const month = fecha ? (fecha.getMonth() + 1) : (new Date().getMonth() + 1);
    
    console.log(`🔄 Invalidando caches por cambio en movimiento - Cuenta: ${cuentaId}, Fecha: ${year}/${month}`);
    
    await Promise.all([
      DashboardCache.invalidateAccount(cuentaId, year, month),
      // Podemos agregar más invalidaciones aquí según vayamos implementando más caches
    ]);
  }

  // Cuando se crea/actualiza/elimina una categoría
  static async onCategoriaChange() {
    console.log('🔄 Invalidando caches por cambio en categorías');
    
    await Promise.all([
      CategoriesCache.invalidateAll(),
      DashboardCache.invalidateAll(), // Las categorías afectan a los dashboards
    ]);
  }

  // Cuando se crea/actualiza/elimina una cuenta
  static async onCuentaChange(cuentaId?: string) {
    console.log(`🔄 Invalidando caches por cambio en cuenta: ${cuentaId || 'todas'}`);
    
    if (cuentaId) {
      await Promise.all([
        CuentasCache.invalidateById(cuentaId),
        DashboardCache.invalidateAccount(cuentaId),
      ]);
    } else {
      await Promise.all([
        CuentasCache.invalidateAll(),
        DashboardCache.invalidateAll(),
      ]);
    }
  }

  // Limpiar todo el cache
  static async clearAll() {
    console.log('🧹 Limpiando TODO el cache...');
    await cacheManager.clear();
  }
}