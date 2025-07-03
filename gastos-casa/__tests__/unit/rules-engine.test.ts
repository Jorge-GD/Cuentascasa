import { CategorizationEngine, type CategorizationRule } from '@/lib/categorization/engine'
import type { MovimientoRaw } from '@/lib/types/parser'

// Mock the database queries
jest.mock('@/lib/db/queries', () => ({
  getReglas: jest.fn(() => Promise.resolve([]))
}))

describe('CategorizationEngine', () => {
  let engine: CategorizationEngine

  beforeEach(() => {
    engine = new CategorizationEngine()
  })

  describe('Basic categorization with default rules', () => {
    it('should categorize Mercadona transactions', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'MERCADONA VALENCIA CENTRO',
        importe: -45.67,
        saldo: 1200.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Alimentación')
      expect(result.subcategoriaDetectada).toBe('Supermercado')
      expect(result.confianza).toBeGreaterThan(80)
      expect(result.reglaAplicada).toBe('Mercadona')
    })

    it('should categorize Bizum sent transactions', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'BIZUM ENVIADO A JUAN PEREZ',
        importe: -20.00,
        saldo: 1180.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Bizum')
      expect(result.subcategoriaDetectada).toBe('Enviado')
      expect(result.reglaAplicada).toBe('Bizum Enviado')
    })

    it('should categorize gas station transactions with regex', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'REPSOL ESTACION SERVICIO',
        importe: -55.00,
        saldo: 1125.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Transporte')
      expect(result.subcategoriaDetectada).toBe('Gasolina')
      expect(result.reglaAplicada).toBe('Gasolineras')
    })

    it('should use ING category mapping when available', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'ALGUNA TIENDA DESCONOCIDA',
        importe: -25.00,
        saldo: 1175.50,
        categoriaING: 'SUPERMERCADOS',
        subcategoriaING: 'ALIMENTACION'
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Alimentación')
      expect(result.subcategoriaDetectada).toBe('Supermercado')
      expect(result.confianza).toBe(60)
      expect(result.reglaAplicada).toBe('Mapeo ING')
    })

    it('should apply heuristic rules for unknown transactions', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'TIENDA SUPER DESCONOCIDA',
        importe: -30.00,
        saldo: 1170.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Alimentación')
      expect(result.subcategoriaDetectada).toBe('Supermercado')
      expect(result.confianza).toBe(60)
      expect(result.reglaAplicada).toBe('Heurística')
    })

    it('should use default category for unmatched transactions', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'SOMETHING COMPLETELY UNKNOWN',
        importe: -15.00,
        saldo: 1185.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Otros Gastos')
      expect(result.subcategoriaDetectada).toBe('Sin categorizar')
      expect(result.confianza).toBe(10)
      expect(result.reglaAplicada).toBe('Por defecto')
    })

    it('should categorize income correctly', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'NOMINA EMPRESA ABC SL',
        importe: 2500.00,
        saldo: 3685.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Ingresos')
      expect(result.subcategoriaDetectada).toBe('Nómina')
      expect(result.reglaAplicada).toBe('Nómina')
    })
  })

  describe('Custom rules handling', () => {
    const customRules: CategorizationRule[] = [
      {
        id: 'custom-1',
        nombre: 'Mi Regla Personalizada',
        patron: 'TIENDA ESPECIAL',
        tipoCoincidencia: 'contiene',
        categoria: 'Compras Especiales',
        subcategoria: 'Mi Subcategoría',
        prioridad: 1,
        activa: true
      },
      {
        id: 'custom-2',
        nombre: 'Regla Inactiva',
        patron: 'NUNCA APLICAR',
        tipoCoincidencia: 'contiene',
        categoria: 'No Aplicar',
        prioridad: 2,
        activa: false
      }
    ]

    beforeEach(() => {
      engine = new CategorizationEngine(customRules)
    })

    it('should apply custom rules with higher priority', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'TIENDA ESPECIAL VALENCIA',
        importe: -100.00,
        saldo: 1100.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).toBe('Compras Especiales')
      expect(result.subcategoriaDetectada).toBe('Mi Subcategoría')
      expect(result.reglaAplicada).toBe('Mi Regla Personalizada')
    })

    it('should ignore inactive custom rules', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'NUNCA APLICAR ESTA REGLA',
        importe: -50.00,
        saldo: 1150.50
      }

      const result = engine.categorizeMovimiento(movimiento)

      expect(result.categoriaDetectada).not.toBe('No Aplicar')
      expect(result.reglaAplicada).not.toBe('Regla Inactiva')
    })
  })

  describe('Rule matching types', () => {
    const testRules: CategorizationRule[] = [
      {
        id: 'contains-rule',
        nombre: 'Contains Rule',
        patron: 'MIDDLE',
        tipoCoincidencia: 'contiene',
        categoria: 'Test Category',
        prioridad: 1,
        activa: true
      },
      {
        id: 'starts-rule',
        nombre: 'Starts Rule',
        patron: 'START',
        tipoCoincidencia: 'empieza',
        categoria: 'Test Category',
        prioridad: 2,
        activa: true
      },
      {
        id: 'ends-rule',
        nombre: 'Ends Rule',
        patron: 'END',
        tipoCoincidencia: 'termina',
        categoria: 'Test Category',
        prioridad: 3,
        activa: true
      },
      {
        id: 'exact-rule',
        nombre: 'Exact Rule',
        patron: 'EXACT MATCH',
        tipoCoincidencia: 'exacto',
        categoria: 'Test Category',
        prioridad: 4,
        activa: true
      },
      {
        id: 'regex-rule',
        nombre: 'Regex Rule',
        patron: 'REGEX_\\d+',
        tipoCoincidencia: 'regex',
        categoria: 'Test Category',
        prioridad: 5,
        activa: true
      }
    ]

    beforeEach(() => {
      engine = new CategorizationEngine(testRules)
    })

    it('should match "contiene" rule correctly', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'BEFORE MIDDLE AFTER',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.reglaAplicada).toBe('Contains Rule')
    })

    it('should match "empieza" rule correctly', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'START OF DESCRIPTION',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.reglaAplicada).toBe('Starts Rule')
    })

    it('should match "termina" rule correctly', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'DESCRIPTION AT THE END',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.reglaAplicada).toBe('Ends Rule')
    })

    it('should match "exacto" rule correctly', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'EXACT MATCH',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.reglaAplicada).toBe('Exact Rule')
    })

    it('should match regex rule correctly', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'SOME REGEX_123 PATTERN',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.reglaAplicada).toBe('Regex Rule')
    })

    it('should handle invalid regex gracefully', () => {
      const invalidRegexRule: CategorizationRule = {
        id: 'invalid-regex',
        nombre: 'Invalid Regex',
        patron: '[invalid regex',
        tipoCoincidencia: 'regex',
        categoria: 'Test Category',
        prioridad: 1,
        activa: true
      }

      engine = new CategorizationEngine([invalidRegexRule])

      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'ANY DESCRIPTION',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.reglaAplicada).not.toBe('Invalid Regex')
    })
  })

  describe('Priority handling', () => {
    const priorityRules: CategorizationRule[] = [
      {
        id: 'low-priority',
        nombre: 'Low Priority Rule',
        patron: 'TEST',
        tipoCoincidencia: 'contiene',
        categoria: 'Low Priority',
        prioridad: 10,
        activa: true
      },
      {
        id: 'high-priority',
        nombre: 'High Priority Rule',
        patron: 'TEST',
        tipoCoincidencia: 'contiene',
        categoria: 'High Priority',
        prioridad: 1,
        activa: true
      }
    ]

    beforeEach(() => {
      engine = new CategorizationEngine(priorityRules)
    })

    it('should apply higher priority rule first', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'TEST DESCRIPTION',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      
      expect(result.categoriaDetectada).toBe('High Priority')
      expect(result.reglaAplicada).toBe('High Priority Rule')
    })
  })

  describe('Confidence calculation', () => {
    it('should calculate higher confidence for exact matches', () => {
      const exactRule: CategorizationRule = {
        id: 'exact-test',
        nombre: 'Exact Test',
        patron: 'EXACT',
        tipoCoincidencia: 'exacto',
        categoria: 'Test',
        prioridad: 1,
        activa: true
      }

      engine = new CategorizationEngine([exactRule])

      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'EXACT',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.confianza).toBe(100)
    })

    it('should calculate lower confidence for default categorization', () => {
      const movimiento: MovimientoRaw = {
        fecha: '2023-12-01',
        descripcion: 'UNKNOWN TRANSACTION',
        importe: -10.00,
        saldo: 1000.00
      }

      const result = engine.categorizeMovimiento(movimiento)
      expect(result.confianza).toBe(10)
    })
  })

  describe('Batch categorization', () => {
    it('should categorize multiple movements', () => {
      const movimientos: MovimientoRaw[] = [
        {
          fecha: '2023-12-01',
          descripcion: 'MERCADONA VALENCIA',
          importe: -45.67,
          saldo: 1200.50
        },
        {
          fecha: '2023-12-02',
          descripcion: 'BIZUM ENVIADO A JUAN',
          importe: -20.00,
          saldo: 1180.50
        }
      ]

      const results = engine.categorizeMovimientos(movimientos)

      expect(results).toHaveLength(2)
      expect(results[0].categoriaDetectada).toBe('Alimentación')
      expect(results[1].categoriaDetectada).toBe('Bizum')
    })
  })

  describe('Rule management', () => {
    it('should add new rules', () => {
      const initialRulesCount = engine.getRules().length
      
      const newRule: CategorizationRule = {
        id: 'new-rule',
        nombre: 'New Rule',
        patron: 'NEW',
        tipoCoincidencia: 'contiene',
        categoria: 'New Category',
        prioridad: 1,
        activa: true
      }

      engine.addRule(newRule)
      
      expect(engine.getRules()).toHaveLength(initialRulesCount + 1)
      expect(engine.getRules().find(r => r.id === 'new-rule')).toEqual(newRule)
    })

    it('should remove rules', () => {
      const newRule: CategorizationRule = {
        id: 'to-remove',
        nombre: 'To Remove',
        patron: 'REMOVE',
        tipoCoincidencia: 'contiene',
        categoria: 'Remove Category',
        prioridad: 1,
        activa: true
      }

      engine.addRule(newRule)
      const countAfterAdd = engine.getRules().length
      
      engine.removeRule('to-remove')
      
      expect(engine.getRules()).toHaveLength(countAfterAdd - 1)
      expect(engine.getRules().find(r => r.id === 'to-remove')).toBeUndefined()
    })

    it('should update existing rules', () => {
      const newRule: CategorizationRule = {
        id: 'to-update',
        nombre: 'Original Name',
        patron: 'UPDATE',
        tipoCoincidencia: 'contiene',
        categoria: 'Original Category',
        prioridad: 5,
        activa: true
      }

      engine.addRule(newRule)
      
      engine.updateRule('to-update', {
        nombre: 'Updated Name',
        categoria: 'Updated Category',
        prioridad: 1
      })

      const updatedRule = engine.getRules().find(r => r.id === 'to-update')
      expect(updatedRule?.nombre).toBe('Updated Name')
      expect(updatedRule?.categoria).toBe('Updated Category')
      expect(updatedRule?.prioridad).toBe(1)
      expect(updatedRule?.patron).toBe('UPDATE') // Should remain unchanged
    })
  })
})