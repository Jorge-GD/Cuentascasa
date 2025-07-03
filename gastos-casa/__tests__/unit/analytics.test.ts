import { 
  calculateCategoryBreakdown, 
  calculateMonthlyProjection, 
  detectSpendingPatterns,
  calculatePeriodComparison,
  formatCurrency,
  formatPercentage,
  getVariationColor,
  generateCategoryColors,
  calculateAggregatedStats
} from '@/lib/analytics/calculations'
import type { MovimientoSimple } from '@/lib/analytics/calculations'

describe('Analytics Calculations', () => {
  const sampleMovimientos: MovimientoSimple[] = [
    {
      fecha: new Date('2023-12-01'),
      importe: -45.67,
      categoria: 'Alimentación'
    },
    {
      fecha: new Date('2023-12-02'),
      importe: -20.00,
      categoria: 'Transporte'
    },
    {
      fecha: new Date('2023-12-03'),
      importe: -30.50,
      categoria: 'Alimentación'
    },
    {
      fecha: new Date('2023-12-04'),
      importe: 2500.00,
      categoria: 'Ingresos'
    },
    {
      fecha: new Date('2023-12-05'),
      importe: -15.75,
      categoria: 'Transporte'
    }
  ]

  describe('calculateCategoryBreakdown', () => {
    it('should calculate category breakdown correctly', () => {
      const breakdown = calculateCategoryBreakdown(sampleMovimientos)
      
      expect(breakdown).toHaveLength(2) // Solo gastos (excluye ingresos)
      
      const alimentacion = breakdown.find(c => c.categoria === 'Alimentación')
      expect(alimentacion).toBeDefined()
      expect(alimentacion?.total).toBe(76.17) // 45.67 + 30.50
      expect(alimentacion?.transacciones).toBe(2)
      expect(alimentacion?.promedio).toBe(38.085)
      
      const transporte = breakdown.find(c => c.categoria === 'Transporte')
      expect(transporte).toBeDefined()
      expect(transporte?.total).toBe(35.75) // 20.00 + 15.75
      expect(transporte?.transacciones).toBe(2)
      
      // Verificar que está ordenado por total descendente
      expect(breakdown[0].categoria).toBe('Alimentación')
      expect(breakdown[1].categoria).toBe('Transporte')
    })

    it('should handle empty movements array', () => {
      const breakdown = calculateCategoryBreakdown([])
      expect(breakdown).toHaveLength(0)
    })

    it('should handle movements with only income', () => {
      const incomeMovements: MovimientoSimple[] = [
        { fecha: new Date(), importe: 1000, categoria: 'Salario' },
        { fecha: new Date(), importe: 500, categoria: 'Freelance' }
      ]
      
      const breakdown = calculateCategoryBreakdown(incomeMovements)
      expect(breakdown).toHaveLength(0)
    })
  })

  describe('calculateMonthlyProjection', () => {
    it('should calculate monthly projection correctly', () => {
      const fechaReferencia = new Date('2023-12-15') // Mitad del mes
      const projection = calculateMonthlyProjection(sampleMovimientos, fechaReferencia)
      
      expect(projection.gastoActual).toBeCloseTo(111.92) // Total gastos
      expect(projection.diasTranscurridos).toBe(15)
      expect(projection.diasRestantes).toBe(16) // Diciembre tiene 31 días
      expect(projection.gastoDiarioPromedio).toBeCloseTo(7.46)
      expect(projection.gastoProyectado).toBeCloseTo(231.30, 1)
      expect(projection.confianza).toBeCloseTo(48.39) // 15/31 * 100
    })

    it('should handle beginning of month', () => {
      const fechaReferencia = new Date('2023-12-01')
      const projection = calculateMonthlyProjection(sampleMovimientos, fechaReferencia)
      
      expect(projection.diasTranscurridos).toBe(1)
      expect(projection.confianza).toBeCloseTo(3.23) // 1/31 * 100
    })

    it('should handle end of month', () => {
      const fechaReferencia = new Date('2023-12-31')
      const projection = calculateMonthlyProjection(sampleMovimientos, fechaReferencia)
      
      expect(projection.diasTranscurridos).toBe(31)
      expect(projection.diasRestantes).toBe(0)
      expect(projection.confianza).toBe(100)
    })
  })

  describe('detectSpendingPatterns', () => {
    const previousMovimientos: MovimientoSimple[] = [
      { fecha: new Date('2023-11-01'), importe: -40.00, categoria: 'Alimentación' },
      { fecha: new Date('2023-11-02'), importe: -25.00, categoria: 'Alimentación' },
      { fecha: new Date('2023-11-03'), importe: -10.00, categoria: 'Transporte' }
    ]

    it('should detect spending patterns correctly', () => {
      const patterns = detectSpendingPatterns(sampleMovimientos, previousMovimientos)
      
      const alimentacionPattern = patterns.find(p => p.categoria === 'Alimentación')
      expect(alimentacionPattern).toBeDefined()
      expect(alimentacionPattern?.tendencia).toBe('creciente') // 76.17 vs 65.00
      expect(alimentacionPattern?.variacion).toBeGreaterThan(10)
      expect(alimentacionPattern?.esRecurrente).toBe(false) // Solo 2 transacciones
      
      const transportePattern = patterns.find(p => p.categoria === 'Transporte')
      expect(transportePattern).toBeDefined()
      expect(transportePattern?.tendencia).toBe('creciente') // 35.75 vs 10.00
      expect(transportePattern?.variacion).toBeGreaterThan(100)
    })

    it('should detect new categories', () => {
      const newMovimientos: MovimientoSimple[] = [
        { fecha: new Date(), importe: -50.00, categoria: 'Nueva Categoría' }
      ]
      
      const patterns = detectSpendingPatterns(newMovimientos, previousMovimientos)
      const newPattern = patterns.find(p => p.categoria === 'Nueva Categoría')
      
      expect(newPattern).toBeDefined()
      expect(newPattern?.tendencia).toBe('creciente')
      expect(newPattern?.variacion).toBe(100)
    })

    it('should detect recurring expenses', () => {
      const recurringMovimientos: MovimientoSimple[] = [
        ...Array(5).fill(null).map((_, i) => ({
          fecha: new Date(`2023-12-${i + 1}`),
          importe: -10.00,
          categoria: 'Recurrente'
        }))
      ]
      
      const patterns = detectSpendingPatterns(recurringMovimientos, [])
      const recurringPattern = patterns.find(p => p.categoria === 'Recurrente')
      
      expect(recurringPattern?.esRecurrente).toBe(true)
      expect(recurringPattern?.frecuencia).toBe('mensual')
    })
  })

  describe('calculatePeriodComparison', () => {
    const previousPeriod: MovimientoSimple[] = [
      { fecha: new Date('2023-11-01'), importe: -100.00, categoria: 'Gastos' },
      { fecha: new Date('2023-11-02'), importe: 2000.00, categoria: 'Ingresos' }
    ]

    it('should calculate period comparison correctly', () => {
      const comparison = calculatePeriodComparison(sampleMovimientos, previousPeriod)
      
      expect(comparison.gastosActuales).toBeCloseTo(111.92)
      expect(comparison.gastosAnteriores).toBe(100.00)
      expect(comparison.ingresosActuales).toBe(2500.00)
      expect(comparison.ingresosAnteriores).toBe(2000.00)
      
      expect(comparison.variacionGastos).toBeCloseTo(11.92) // (111.92 - 100) / 100 * 100
      expect(comparison.variacionIngresos).toBe(25) // (2500 - 2000) / 2000 * 100
      
      expect(comparison.balanceActual).toBeCloseTo(2388.08)
      expect(comparison.balanceAnterior).toBe(1900.00)
    })

    it('should handle zero previous values', () => {
      const comparison = calculatePeriodComparison(sampleMovimientos, [])
      
      expect(comparison.variacionGastos).toBe(0)
      expect(comparison.variacionIngresos).toBe(0)
      expect(comparison.gastosAnteriores).toBe(0)
      expect(comparison.ingresosAnteriores).toBe(0)
    })
  })

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toContain('1234,56')
      expect(formatCurrency(1234.56)).toContain('€')
      expect(formatCurrency(-45.67)).toContain('-45,67')
      expect(formatCurrency(0)).toContain('0,00')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(formatPercentage(25.5)).toBe('+25.5%')
      expect(formatPercentage(-15.2)).toBe('-15.2%')
      expect(formatPercentage(0)).toBe('+0.0%')
      expect(formatPercentage(25.567, 2)).toBe('+25.57%')
    })
  })

  describe('getVariationColor', () => {
    it('should return correct colors for expenses', () => {
      expect(getVariationColor(20, true)).toBe('text-red-600') // Más gastos = rojo
      expect(getVariationColor(-20, true)).toBe('text-green-600') // Menos gastos = verde
      expect(getVariationColor(2, true)).toBe('text-gray-600') // Estable
    })

    it('should return correct colors for income', () => {
      expect(getVariationColor(20, false)).toBe('text-green-600') // Más ingresos = verde
      expect(getVariationColor(-20, false)).toBe('text-red-600') // Menos ingresos = rojo
      expect(getVariationColor(3, false)).toBe('text-gray-600') // Estable
    })
  })

  describe('generateCategoryColors', () => {
    it('should generate unique colors for categories', () => {
      const categories = ['Alimentación', 'Transporte', 'Ocio', 'Salud']
      const colors = generateCategoryColors(categories)
      
      expect(Object.keys(colors)).toHaveLength(4)
      expect(colors['Alimentación']).toBeDefined()
      expect(colors['Transporte']).toBeDefined()
      
      // Colors should be different
      const uniqueColors = new Set(Object.values(colors))
      expect(uniqueColors.size).toBe(4)
    })

    it('should handle more categories than available colors', () => {
      const manyCategories = Array.from({ length: 20 }, (_, i) => `Category ${i}`)
      const colors = generateCategoryColors(manyCategories)
      
      expect(Object.keys(colors)).toHaveLength(20)
      // Should cycle through colors
      expect(colors['Category 0']).toBe(colors['Category 15']) // Same color after cycling
    })
  })

  describe('calculateAggregatedStats', () => {
    const cuentasData = [
      { nombre: 'Cuenta 1', gastos: 100, ingresos: 1000, transacciones: 10 },
      { nombre: 'Cuenta 2', gastos: 200, ingresos: 1500, transacciones: 15 },
      { nombre: 'Cuenta 3', gastos: 150, ingresos: 1200, transacciones: 12 }
    ]

    it('should calculate aggregated stats correctly', () => {
      const stats = calculateAggregatedStats(cuentasData)
      
      expect(stats.totales.gastos).toBe(450)
      expect(stats.totales.ingresos).toBe(3700)
      expect(stats.totales.transacciones).toBe(37)
      
      expect(stats.promedios.gastos).toBe(150)
      expect(stats.promedios.ingresos).toBeCloseTo(1233.33, 1)
      expect(stats.promedios.transacciones).toBeCloseTo(12.33)
    })

    it('should handle empty accounts array', () => {
      const stats = calculateAggregatedStats([])
      
      expect(stats.totales.gastos).toBe(0)
      expect(stats.totales.ingresos).toBe(0)
      expect(stats.totales.transacciones).toBe(0)
      
      expect(stats.promedios.gastos).toBe(0)
      expect(stats.promedios.ingresos).toBe(0)
      expect(stats.promedios.transacciones).toBe(0)
    })

    it('should handle single account', () => {
      const singleAccount = [cuentasData[0]]
      const stats = calculateAggregatedStats(singleAccount)
      
      expect(stats.totales.gastos).toBe(100)
      expect(stats.promedios.gastos).toBe(100)
    })
  })
})