import { cacheManager } from './cache-manager';

/**
 * Cache específico para Analytics y Dashboard
 * Optimizado para consultas pesadas con agregaciones
 */
export class AnalyticsCache {
  
  // Dashboard Metrics - TTL 15 minutos (datos que cambian frecuentemente)
  static async getDashboardMetrics(cuentaId: string, periodo: string) {
    const key = `analytics:dashboard:${cuentaId}:${periodo}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando métricas dashboard para cuenta ${cuentaId}...`);
        const { getDashboardMetrics } = await import('@/lib/analytics/metrics');
        return await getDashboardMetrics(cuentaId, periodo);
      },
      900 // 15 minutos
    );
  }

  // Analytics por Categorías - TTL 20 minutos
  static async getCategoryAnalytics(cuentaId: string, year: number, month?: number) {
    const periodo = month ? `${year}-${month}` : `${year}`;
    const key = `analytics:categories:${cuentaId}:${periodo}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando analytics por categorías para ${cuentaId}...`);
        const { calculateCategoryMetrics } = await import('@/lib/analytics/calculations');
        return await calculateCategoryMetrics(cuentaId, year, month);
      },
      1200 // 20 minutos
    );
  }

  // Análisis de Tendencias - TTL 30 minutos (datos históricos estables)
  static async getTrendAnalysis(cuentaId: string, months: number = 12) {
    const key = `analytics:trends:${cuentaId}:${months}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando análisis de tendencias para ${cuentaId}...`);
        const { calculateTrendAnalysis } = await import('@/lib/analytics/calculations');
        return await calculateTrendAnalysis(cuentaId, months);
      },
      1800 // 30 minutos
    );
  }

  // Análisis Comparativo (MUY PESADO) - TTL 1 hora
  static async getComparativeAnalysis(
    cuentaIds: string[], 
    tipo: 'gastos' | 'ingresos' = 'gastos',
    categoriaIds: string[] = [],
    subcategoriaIds: string[] = [],
    años?: number[]
  ) {
    const key = `analytics:comparative:${cuentaIds.sort().join('-')}:${tipo}:${categoriaIds.join('-')}:${subcategoriaIds.join('-')}:${años?.join('-') || 'auto'}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando análisis comparativo para cuentas ${cuentaIds.join(', ')}...`);
        const { calculateComparativeAnalysis } = await import('@/lib/analytics/comparative');
        return await calculateComparativeAnalysis(cuentaIds, tipo, categoriaIds, subcategoriaIds, años);
      },
      3600 // 1 hora - porque es MUY pesado y datos históricos son estables
    );
  }

  // Comparación entre Cuentas - TTL 25 minutos
  static async getAccountComparison(cuentaIds: string[], year: number, month?: number) {
    const periodo = month ? `${year}-${month}` : `${year}`;
    const key = `analytics:comparison:${cuentaIds.sort().join('-')}:${periodo}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando comparación entre cuentas...`);
        const { calculateAccountComparison } = await import('@/lib/analytics/calculations');
        return await calculateAccountComparison(cuentaIds, year, month);
      },
      1500 // 25 minutos
    );
  }

  // Años disponibles - TTL 4 horas (muy estable)
  static async getAvailableYears(cuentaId: string) {
    const key = `analytics:years:${cuentaId}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Obteniendo años disponibles para ${cuentaId}...`);
        const { getAvailableYears } = await import('@/lib/analytics/calculations');
        return await getAvailableYears(cuentaId);
      },
      14400 // 4 horas
    );
  }

  // Invalidación específica por cuenta y periodo
  static async invalidateAccountPeriod(cuentaId: string, year?: number, month?: number) {
    const patterns = [
      `analytics:dashboard:${cuentaId}:*`,
      `analytics:categories:${cuentaId}:*`,
      `analytics:trends:${cuentaId}:*`,
      `analytics:comparative:${cuentaId}:*`,
      `analytics:comparison:*${cuentaId}*:*`
    ];

    if (year) {
      const periodo = month ? `${year}-${month}` : `${year}`;
      patterns.push(
        `analytics:categories:${cuentaId}:${periodo}`,
        `analytics:comparison:*:${periodo}`
      );
    }

    await Promise.all(
      patterns.map(pattern => cacheManager.invalidatePattern(pattern))
    );

    console.log(`🗑️ Invalidado cache analytics para cuenta ${cuentaId}${year ? ` año ${year}` : ''}${month ? ` mes ${month}` : ''}`);
  }

  // Invalidar todo el cache de analytics
  static async invalidateAll() {
    console.log('🗑️ Invalidando TODO el cache de analytics...');
    await cacheManager.invalidatePattern('analytics:*');
  }

  // Invalidar cache cuando cambian datos históricos
  static async invalidateHistoricalData(cuentaId: string) {
    console.log(`🗑️ Invalidando datos históricos para cuenta ${cuentaId}...`);
    await Promise.all([
      cacheManager.invalidatePattern(`analytics:trends:${cuentaId}:*`),
      cacheManager.invalidatePattern(`analytics:comparative:${cuentaId}:*`),
      cacheManager.invalidatePattern(`analytics:years:${cuentaId}`)
    ]);
  }
}

/**
 * Cache específico para Plan 50/30/20
 * Cálculos complejos de presupuesto personal
 */
export class Plan503020Cache {
  private static TTL = 900; // 15 minutos por defecto

  // Análisis principal del Plan 50/30/20
  static async getAnalysis(cuentaIds: string[], year: number, month: number) {
    const key = `plan503020:analysis:${cuentaIds.sort().join('-')}:${year}:${month}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando análisis Plan 50/30/20...`);
        const { calculatePlan503020 } = await import('@/lib/utils/plan503020');
        return await calculatePlan503020(cuentaIds, year, month);
      },
      this.TTL
    );
  }

  // Predicciones del Plan 50/30/20 - TTL 30 minutos (más estable)
  static async getPredicciones(cuentaIds: string[], months: number = 6) {
    const key = `plan503020:predicciones:${cuentaIds.sort().join('-')}:${months}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando predicciones Plan 50/30/20...`);
        const { calculatePlan503020Predictions } = await import('@/lib/utils/plan503020');
        return await calculatePlan503020Predictions(cuentaIds, months);
      },
      1800 // 30 minutos
    );
  }

  // Tendencias del Plan 50/30/20 - TTL 25 minutos
  static async getTendencias(cuentaIds: string[], months: number = 12) {
    const key = `plan503020:tendencias:${cuentaIds.sort().join('-')}:${months}`;
    
    return cacheManager.getOrSet(
      key,
      async () => {
        console.log(`🔍 Calculando tendencias Plan 50/30/20...`);
        const { calculatePlan503020Trends } = await import('@/lib/utils/plan503020');
        return await calculatePlan503020Trends(cuentaIds, months);
      },
      1500 // 25 minutos
    );
  }

  // Invalidar cache del Plan 50/30/20 para cuentas específicas
  static async invalidateCuentas(cuentaIds: string[], year?: number, month?: number) {
    const sortedIds = cuentaIds.sort().join('-');
    
    const patterns = [
      `plan503020:analysis:${sortedIds}:*`,
      `plan503020:predicciones:${sortedIds}:*`,
      `plan503020:tendencias:${sortedIds}:*`
    ];

    if (year && month) {
      patterns.push(`plan503020:analysis:${sortedIds}:${year}:${month}`);
    }

    await Promise.all(
      patterns.map(pattern => cacheManager.invalidatePattern(pattern))
    );

    console.log(`🗑️ Invalidado cache Plan 50/30/20 para cuentas ${cuentaIds.join(', ')}`);
  }

  // Invalidar todo el cache del Plan 50/30/20
  static async invalidateAll() {
    console.log('🗑️ Invalidando TODO el cache Plan 50/30/20...');
    await cacheManager.invalidatePattern('plan503020:*');
  }
}