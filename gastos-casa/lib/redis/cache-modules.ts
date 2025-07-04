import { cacheManager } from './cache-manager';
import { AnalyticsCache, Plan503020Cache, PresupuestosCache } from './analytics-cache';

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
 * Cache específico para Movimientos
 * TTL: 5 minutos (datos que cambian frecuentemente)
 */
export class MovimientosCache {
  private static TTL = 300; // 5 minutos

  static async getMovimientos(cuentaId?: string, limit?: number) {
    const key = `movimientos:${cuentaId || 'all'}:${limit || 'no-limit'}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Consultando movimientos desde BD (cuenta: ${cuentaId || 'todas'}, limit: ${limit || 'sin límite'})...`);
        const { getMovimientos } = await import('@/lib/db/queries');
        return await getMovimientos(cuentaId, limit);
      },
      this.TTL
    );
  }

  static async invalidateAccount(cuentaId: string) {
    console.log(`🗑️ Invalidando cache movimientos para cuenta ${cuentaId}...`);
    await cacheManager.invalidatePattern(`movimientos:${cuentaId}:*`);
    await cacheManager.invalidatePattern('movimientos:all:*'); // También invalidar "todas las cuentas"
  }

  static async invalidateAll() {
    console.log('🗑️ Invalidando TODO el cache de movimientos...');
    await cacheManager.invalidatePattern('movimientos:*');
  }
}

/**
 * Cache específico para Configuración de Usuario
 * TTL: 30 minutos (cambia ocasionalmente)
 */
export class ConfiguracionCache {
  private static TTL = 1800; // 30 minutos

  static async getConfiguracion() {
    return cacheManager.getOrSet(
      'configuracion:usuario',
      async () => {
        console.log('🔍 Consultando configuración de usuario desde BD...');
        const { prisma } = await import('@/lib/db/prisma');
        return await prisma.configuracionUsuario.findFirst({
          include: {
            metas: {
              orderBy: { prioridad: 'asc' }
            }
          }
        });
      },
      this.TTL
    );
  }

  static async invalidate() {
    console.log('🗑️ Invalidando cache de configuración...');
    await cacheManager.del('configuracion:usuario');
  }
}

/**
 * Cache específico para Reglas de Categorización
 * TTL: 20 minutos (cambian poco pero se consultan mucho)
 */
export class ReglasCache {
  private static TTL = 1200; // 20 minutos

  static async getReglas(cuentaId?: string) {
    const key = `reglas:${cuentaId || 'global'}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Consultando reglas desde BD (cuenta: ${cuentaId || 'global'})...`);
        const { getReglas } = await import('@/lib/db/queries');
        return await getReglas(cuentaId);
      },
      this.TTL
    );
  }

  static async invalidateAll() {
    console.log('🗑️ Invalidando TODO el cache de reglas...');
    await cacheManager.invalidatePattern('reglas:*');
  }

  static async invalidateAccount(cuentaId: string) {
    console.log(`🗑️ Invalidando cache reglas para cuenta ${cuentaId}...`);
    await Promise.all([
      cacheManager.del(`reglas:${cuentaId}`),
      cacheManager.del('reglas:global') // Las reglas globales también pueden afectar
    ]);
  }
}

/**
 * Cache específico para Metas de Ahorro
 * TTL: 1 hora (cambian poco frecuentemente)
 */
export class MetasAhorroCache {
  private static TTL = 3600; // 1 hora

  static async getAll() {
    return cacheManager.getOrSet(
      'metas-ahorro:all',
      async () => {
        const { prisma } = await import('@/lib/db/prisma');
        console.log('🔍 Consultando metas de ahorro desde BD...');
        
        const configuracion = await prisma.configuracionUsuario.findFirst();
        
        if (!configuracion) {
          return [];
        }

        return await prisma.metaAhorro.findMany({
          where: { configuracionId: configuracion.id },
          orderBy: { prioridad: 'asc' }
        });
      },
      this.TTL
    );
  }

  static async invalidateAll() {
    console.log('🗑️ Invalidando cache de metas de ahorro...');
    await cacheManager.invalidatePattern('metas-ahorro:*');
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
      AnalyticsCache.invalidateAccountPeriod(cuentaId, year, month),
      Plan503020Cache.invalidateCuentas([cuentaId], year, month),
      PresupuestosCache.invalidateAnalysis(cuentaId),
      MovimientosCache.invalidateAccount(cuentaId), // NUEVO
    ]);
  }

  // Cuando se crea/actualiza/elimina una categoría
  static async onCategoriaChange() {
    console.log('🔄 Invalidando caches por cambio en categorías');
    
    await Promise.all([
      CategoriesCache.invalidateAll(),
      DashboardCache.invalidateAll(), // Las categorías afectan a los dashboards
      AnalyticsCache.invalidateAll(),
      Plan503020Cache.invalidateAll(),
      PresupuestosCache.invalidateAll(),
      ReglasCache.invalidateAll(), // NUEVO - Las categorías afectan las reglas
    ]);
  }

  // Cuando se crea/actualiza/elimina una regla de categorización
  static async onReglaChange(cuentaId?: string) {
    console.log(`🔄 Invalidando caches por cambio en reglas: ${cuentaId || 'global'}`);
    
    if (cuentaId) {
      await ReglasCache.invalidateAccount(cuentaId);
    } else {
      await ReglasCache.invalidateAll();
    }
  }

  // Cuando se actualiza la configuración de usuario
  static async onConfiguracionChange() {
    console.log('🔄 Invalidando caches por cambio en configuración');
    
    await Promise.all([
      ConfiguracionCache.invalidate(),
      Plan503020Cache.invalidateAll(), // La configuración afecta el plan 50/30/20
      MetasAhorroCache.invalidateAll(), // Las metas están incluidas en configuración
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