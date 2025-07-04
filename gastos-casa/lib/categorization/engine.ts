import type { MovimientoRaw } from '@/lib/types/parser'
import type { ReglaCategorizacion } from '@/lib/types/database'
import { getReglas } from '@/lib/db/queries'

export interface CategorizedMovimiento extends MovimientoRaw {
  categoriaDetectada?: string
  subcategoriaDetectada?: string
  confianza: number // 0-100
  reglaAplicada?: string
}

export interface CategorizationRule {
  id: string
  nombre: string
  patron: string
  tipoCoincidencia: 'contiene' | 'empieza' | 'termina' | 'regex' | 'exacto'
  categoria: string
  subcategoria?: string
  prioridad: number
  activa: boolean
}

export interface CategorizationResult {
  categoria: string
  subcategoria?: string
  confianza: number
  reglaAplicada?: string
}

export class CategorizationEngine {
  private rules: CategorizationRule[] = []
  private defaultRules: CategorizationRule[] = [
    {
      id: 'mercadona',
      nombre: 'Mercadona',
      patron: 'MERCADONA',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado',
      prioridad: 1,
      activa: true
    },
    {
      id: 'bizum-enviado',
      nombre: 'Bizum Enviado',
      patron: 'BIZUM ENVIADO',
      tipoCoincidencia: 'contiene',
      categoria: 'Bizum',
      subcategoria: 'Enviado',
      prioridad: 1,
      activa: true
    },
    {
      id: 'bizum-recibido',
      nombre: 'Bizum Recibido',
      patron: 'BIZUM RECIBIDO',
      tipoCoincidencia: 'contiene',
      categoria: 'Bizum',
      subcategoria: 'Recibido',
      prioridad: 1,
      activa: true
    },
    {
      id: 'gasolineras',
      nombre: 'Gasolineras',
      patron: '(REPSOL|BP|CEPSA|SHELL|PETRONOR)',
      tipoCoincidencia: 'regex',
      categoria: 'Transporte',
      subcategoria: 'Gasolina',
      prioridad: 1,
      activa: true
    },
    {
      id: 'amazon',
      nombre: 'Amazon',
      patron: 'AMAZON',
      tipoCoincidencia: 'contiene',
      categoria: 'Compras Online',
      subcategoria: 'Amazon',
      prioridad: 1,
      activa: true
    },
    {
      id: 'carrefour',
      nombre: 'Carrefour',
      patron: 'CARREFOUR',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado',
      prioridad: 1,
      activa: true
    },
    {
      id: 'dia',
      nombre: 'Supermercados DIA',
      patron: 'SUPERMERCADOS DIA',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado',
      prioridad: 1,
      activa: true
    },
    {
      id: 'retirada-cajero',
      nombre: 'Retirada Cajero',
      patron: 'RETIRADA CAJERO',
      tipoCoincidencia: 'contiene',
      categoria: 'Efectivo',
      subcategoria: 'Cajero',
      prioridad: 1,
      activa: true
    },
    {
      id: 'transferencia',
      nombre: 'Transferencia',
      patron: 'TRANSFERENCIA',
      tipoCoincidencia: 'contiene',
      categoria: 'Transferencias',
      subcategoria: 'Transferencia',
      prioridad: 1,
      activa: true
    },
    {
      id: 'nomina',
      nombre: 'Nómina',
      patron: 'NOMINA',
      tipoCoincidencia: 'contiene',
      categoria: 'Ingresos',
      subcategoria: 'Nómina',
      prioridad: 1,
      activa: true
    },
    {
      id: 'recibo',
      nombre: 'Recibo',
      patron: 'RECIBO',
      tipoCoincidencia: 'contiene',
      categoria: 'Gastos Fijos',
      subcategoria: 'Recibo',
      prioridad: 1,
      activa: true
    },
    {
      id: 'netflix',
      nombre: 'Netflix',
      patron: 'NETFLIX',
      tipoCoincidencia: 'contiene',
      categoria: 'Suscripciones',
      subcategoria: 'Streaming',
      prioridad: 1,
      activa: true
    },
    {
      id: 'spotify',
      nombre: 'Spotify',
      patron: 'SPOTIFY',
      tipoCoincidencia: 'contiene',
      categoria: 'Suscripciones',
      subcategoria: 'Música',
      prioridad: 1,
      activa: true
    },
    // === RESTAURANTES Y HOSTELERÍA ===
    {
      id: 'restaurantes-general',
      nombre: 'Restaurantes Generales',
      patron: '(MASSALA|COMPRADRES|CALETA|MAIALI|MANUKA|SIMBAD|SUSHISOM|TANI TRINI)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Restaurantes',
      prioridad: 1,
      activa: true
    },
    {
      id: 'pizzerias',
      nombre: 'Pizzerías',
      patron: '(PIZZA.*NAPOLI|HAMBURGUESERIA.*PIZZERIA)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Restaurantes',
      prioridad: 1,
      activa: true
    },
    {
      id: 'comida-rapida',
      nombre: 'Comida Rápida',
      patron: '(FIVE.*GUYS|POLLO.*ANDALUZ|DIVINA.*MASA)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Restaurantes',
      prioridad: 1,
      activa: true
    },
    {
      id: 'bares-tapas',
      nombre: 'Bares y Tapas',
      patron: '(BAR.*LOS.*COMPRADRES|TANI.*TRINI)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Restaurantes',
      prioridad: 1,
      activa: true
    },
    // === CAFETERÍAS Y DULCES ===
    {
      id: 'heladerias',
      nombre: 'Heladerías',
      patron: '(HELADERIA.*AMARETTO|GIOLATTO)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Cafeterías',
      prioridad: 1,
      activa: true
    },
    {
      id: 'cafeterias',
      nombre: 'Cafeterías',
      patron: '(VILLAGE.*CAFE|SAN.*CHOCOLATE|CROISSANT.*PORTUGUES)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Cafeterías',
      prioridad: 1,
      activa: true
    },
    // === SUPERMERCADOS Y ALIMENTACIÓN ===
    {
      id: 'supermercados-adicionales',
      nombre: 'Supermercados Adicionales',
      patron: '(EROSKI|HIPER.*EURO|ALIMENTACION.*SOL|MARKET.*MARBELLA)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado',
      prioridad: 1,
      activa: true
    },
    {
      id: 'panaderias',
      nombre: 'Panaderías',
      patron: '(PANIFICADORA|CHURRERIA.*OSCAR|FERMENTO.*PAN|OBRADOR.*ARTESANA)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado',
      prioridad: 1,
      activa: true
    },
    {
      id: 'carniceria',
      nombre: 'Carnicería',
      patron: 'CARNICERIA.*AMIL',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Carnicería',
      prioridad: 1,
      activa: true
    },
    {
      id: 'productos-especializados',
      nombre: 'Productos Especializados',
      patron: '(ACEITUNAS.*MORILLAS|FRUTOS.*SECOS.*3.*M)',
      tipoCoincidencia: 'regex',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado',
      prioridad: 1,
      activa: true
    },
    {
      id: 'alcampo',
      nombre: 'Supermercado Alcampo',
      patron: 'ALCAMPO',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado Alcampo',
      prioridad: 1,
      activa: true
    },
    {
      id: 'lidl',
      nombre: 'Supermercado Lidl',
      patron: 'LIDL',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado Lidl',
      prioridad: 1,
      activa: true
    },
    {
      id: 'aldi',
      nombre: 'Supermercado Aldi',
      patron: 'ALDI',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado Aldi',
      prioridad: 1,
      activa: true
    },
    // === MODA Y TEXTIL ===
    {
      id: 'moda-femenina',
      nombre: 'Moda Femenina',
      patron: 'WOMEN.*SECRET',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Ropa',
      prioridad: 1,
      activa: true
    },
    {
      id: 'grandes-almacenes',
      nombre: 'Grandes Almacenes',
      patron: 'DUNNES.*STORES',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Ropa',
      prioridad: 1,
      activa: true
    },
    {
      id: 'moda-infantil',
      nombre: 'Moda Infantil',
      patron: 'INFANTILES.*LEON',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Ropa',
      prioridad: 1,
      activa: true
    },
    {
      id: 'textil-hogar',
      nombre: 'Textil Hogar',
      patron: 'TRAMAS',
      tipoCoincidencia: 'contiene',
      categoria: 'Compras',
      subcategoria: 'Ropa',
      prioridad: 1,
      activa: true
    },
    // === ELECTRODOMÉSTICOS ===
    {
      id: 'electrodomesticos',
      nombre: 'Electrodomésticos',
      patron: 'CRISTOBAL.*PRIETO.*AGUILAR',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Tecnología',
      prioridad: 1,
      activa: true
    },
    // === HOGAR Y DECORACIÓN ===
    {
      id: 'jardineria',
      nombre: 'Jardinería',
      patron: 'VIVEROS.*MARBELLA',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Otros',
      prioridad: 1,
      activa: true
    },
    {
      id: 'decoracion',
      nombre: 'Decoración',
      patron: '(TIGER.*CAÑADA|ALMACEN.*TAPICERO|DUENDE.*CAÑADA)',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Otros',
      prioridad: 1,
      activa: true
    },
    {
      id: 'puericultura',
      nombre: 'Puericultura',
      patron: 'ARTSANA.*SPAIN',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Otros',
      prioridad: 1,
      activa: true
    },
    {
      id: 'ferreteria',
      nombre: 'Ferretería',
      patron: 'SHOPPING.*HOME.*ESTEPONA',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Otros',
      prioridad: 1,
      activa: true
    },
    {
      id: 'pinturas',
      nombre: 'Pinturas',
      patron: 'PINTURAS.*ANDALUCIA',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Otros',
      prioridad: 1,
      activa: true
    },
    {
      id: 'centros-comerciales',
      nombre: 'Centros Comerciales',
      patron: 'ENRA.*CAÑADA',
      tipoCoincidencia: 'regex',
      categoria: 'Compras',
      subcategoria: 'Otros',
      prioridad: 1,
      activa: true
    },
    // === PARKING ===
    {
      id: 'parking-malaga',
      nombre: 'Parking Málaga',
      patron: 'SMASSA.*MARINA',
      tipoCoincidencia: 'regex',
      categoria: 'Transporte',
      subcategoria: 'Parking',
      prioridad: 1,
      activa: true
    },
    // === HERBOLARIO ONLINE ===
    {
      id: 'herbolario-online',
      nombre: 'Herbolario Online',
      patron: 'HERBOLARIO.*BUHO.*MADRID',
      tipoCoincidencia: 'regex',
      categoria: 'Compras Online',
      subcategoria: 'Otros',
      prioridad: 1,
      activa: true
    },
    // === SERVICIOS ESPECIALIZADOS ===
    {
      id: 'servicios-hosteleria',
      nombre: 'Servicios Hostelería',
      patron: 'ODELPIN.*HOSTELERIA',
      tipoCoincidencia: 'regex',
      categoria: 'Otros Gastos',
      subcategoria: 'Sin categorizar',
      prioridad: 1,
      activa: true
    },
    {
      id: 'servicios-hvac',
      nombre: 'Servicios HVAC',
      patron: 'ESCODA',
      tipoCoincidencia: 'contiene',
      categoria: 'Otros Gastos',
      subcategoria: 'Sin categorizar',
      prioridad: 1,
      activa: true
    },
    {
      id: 'vending',
      nombre: 'Máquinas Vending',
      patron: 'ALLIANCE.*VENDING',
      tipoCoincidencia: 'regex',
      categoria: 'Otros Gastos',
      subcategoria: 'Sin categorizar',
      prioridad: 1,
      activa: true
    },
    // === SUPERMERCADOS ESPECÍFICOS ===
    {
      id: 'mercadona-especifico',
      nombre: 'Supermercado Mercadona',
      patron: 'MERCADONA',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado Mercadona',
      prioridad: 1,
      activa: true
    },
    {
      id: 'carrefour-especifico',
      nombre: 'Supermercado Carrefour',
      patron: 'CARREFOUR',
      tipoCoincidencia: 'contiene',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado Carrefour',
      prioridad: 1,
      activa: true
    },
    // === AHORRO E INVERSIÓN ===
    {
      id: 'transferencia-ahorro',
      nombre: 'Transferencia a Ahorro',
      patron: '(TRANSFERENCIA.*AHORRO|AHORRO.*TRANSFERENCIA|CUENTA.*AHORRO)',
      tipoCoincidencia: 'regex',
      categoria: 'Ahorro',
      subcategoria: 'Cuenta Ahorro',
      prioridad: 1,
      activa: true
    },
    {
      id: 'inversiones',
      nombre: 'Inversiones',
      patron: '(INVERSION|BROKER|ACCIONES|FONDOS|ETF|BOLSA)',
      tipoCoincidencia: 'regex',
      categoria: 'Inversión',
      subcategoria: 'Acciones',
      prioridad: 1,
      activa: true
    },
    {
      id: 'plan-pensiones',
      nombre: 'Plan de Pensiones',
      patron: '(PLAN.*PENSION|PENSION|JUBILACION)',
      tipoCoincidencia: 'regex',
      categoria: 'Pensiones',
      subcategoria: 'Plan Pensiones',
      prioridad: 1,
      activa: true
    },
    {
      id: 'pago-prestamos',
      nombre: 'Pago de Préstamos',
      patron: '(PRESTAMO|CREDITO|FINANCIACION|CUOTA.*PRESTAMO)',
      tipoCoincidencia: 'regex',
      categoria: 'Pago Deudas',
      subcategoria: 'Préstamos',
      prioridad: 1,
      activa: true
    },
    {
      id: 'depositos',
      nombre: 'Depósitos',
      patron: '(DEPOSITO|PLAZO.*FIJO|IMPOSICION)',
      tipoCoincidencia: 'regex',
      categoria: 'Ahorro',
      subcategoria: 'Depósitos',
      prioridad: 1,
      activa: true
    }
  ]

  constructor(customRules: CategorizationRule[] = []) {
    this.rules = [...this.defaultRules, ...customRules]
      .filter(rule => rule.activa)
      .sort((a, b) => a.prioridad - b.prioridad)
  }

  categorizeMovimientos(movimientos: MovimientoRaw[]): CategorizedMovimiento[] {
    return movimientos.map(movimiento => this.categorizeMovimiento(movimiento))
  }

  categorizeMovimiento(movimiento: MovimientoRaw): CategorizedMovimiento {
    const descripcionUpper = movimiento.descripcion.toUpperCase()
    
    // Si ya tiene categoría de ING, usar esa con menor confianza
    if (movimiento.categoriaING) {
      const mappedCategory = this.mapINGCategory(movimiento.categoriaING, movimiento.subcategoriaING)
      if (mappedCategory) {
        return {
          ...movimiento,
          categoriaDetectada: mappedCategory.categoria,
          subcategoriaDetectada: mappedCategory.subcategoria,
          confianza: 60,
          reglaAplicada: 'Mapeo ING'
        }
      }
    }

    // Aplicar reglas personalizadas
    for (const rule of this.rules) {
      if (this.matchesRule(descripcionUpper, rule)) {
        return {
          ...movimiento,
          categoriaDetectada: rule.categoria,
          subcategoriaDetectada: rule.subcategoria,
          confianza: this.calculateConfidence(descripcionUpper, rule),
          reglaAplicada: rule.nombre
        }
      }
    }

    // Categorización heurística basada en importe
    const heuristicCategory = this.applyHeuristicRules(movimiento)
    if (heuristicCategory) {
      return {
        ...movimiento,
        categoriaDetectada: heuristicCategory.categoria,
        subcategoriaDetectada: heuristicCategory.subcategoria,
        confianza: heuristicCategory.confianza,
        reglaAplicada: 'Heurística'
      }
    }

    // Categoría por defecto
    return {
      ...movimiento,
      categoriaDetectada: movimiento.importe > 0 ? 'Ingresos' : 'Otros Gastos',
      subcategoriaDetectada: 'Sin categorizar',
      confianza: 10,
      reglaAplicada: 'Por defecto'
    }
  }

  private matchesRule(descripcion: string, rule: CategorizationRule): boolean {
    switch (rule.tipoCoincidencia) {
      case 'contiene':
        return descripcion.includes(rule.patron.toUpperCase())
      
      case 'empieza':
        return descripcion.startsWith(rule.patron.toUpperCase())
      
      case 'termina':
        return descripcion.endsWith(rule.patron.toUpperCase())
      
      case 'exacto':
        return descripcion === rule.patron.toUpperCase()
      
      case 'regex':
        try {
          const regex = new RegExp(rule.patron, 'i')
          return regex.test(descripcion)
        } catch (error) {
          console.warn(`Error in regex rule ${rule.nombre}:`, error)
          return false
        }
      
      default:
        return false
    }
  }

  private calculateConfidence(descripcion: string, rule: CategorizationRule): number {
    let confidence = 85 // Base confidence for rule match

    // Adjust based on rule type
    switch (rule.tipoCoincidencia) {
      case 'contiene':
        confidence = 85
        break
      case 'empieza':
        confidence = 90
        break
      case 'termina':
        confidence = 80
        break
      case 'exacto':
        confidence = 100
        break
      case 'regex':
        confidence = 95
        break
    }

    // Adjust based on description length and pattern length
    const patternRatio = rule.patron.length / descripcion.length
    if (patternRatio > 0.5) {
      confidence += 10 // High pattern to description ratio
    }

    // Adjust based on priority
    confidence += (10 - rule.prioridad) // Higher priority = higher confidence

    return Math.min(100, Math.max(50, confidence))
  }

  private mapINGCategory(categoriaING: string, subcategoriaING?: string): { categoria: string; subcategoria?: string } | null {
    const mappings: Record<string, { categoria: string; subcategoria?: string }> = {
      'COMPRAS': { categoria: 'Compras Online', subcategoria: 'General' },
      'SUPERMERCADOS': { categoria: 'Alimentación', subcategoria: 'Supermercado' },
      'GASOLINERAS': { categoria: 'Transporte', subcategoria: 'Gasolina' },
      'RESTAURANTES': { categoria: 'Salidas', subcategoria: 'Restaurantes' },
      'CAJEROS': { categoria: 'Efectivo', subcategoria: 'Cajero' },
      'TRANSFERENCIAS': { categoria: 'Transferencias', subcategoria: 'Transferencia' },
      'BIZUM': { categoria: 'Bizum', subcategoria: subcategoriaING || 'General' },
      'RECIBOS': { categoria: 'Gastos Fijos', subcategoria: 'Recibo' },
      'NOMINA': { categoria: 'Ingresos', subcategoria: 'Nómina' }
    }

    return mappings[categoriaING.toUpperCase()] || null
  }

  private applyHeuristicRules(movimiento: MovimientoRaw): { categoria: string; subcategoria?: string; confianza: number } | null {
    const descripcion = movimiento.descripcion.toUpperCase()
    const importe = movimiento.importe

    // Ingresos grandes probablemente sean nómina
    if (importe > 800) {
      return {
        categoria: 'Ingresos',
        subcategoria: 'Nómina',
        confianza: 70
      }
    }

    // Gastos pequeños frecuentes probablemente sean alimentación
    if (importe < 0 && Math.abs(importe) < 100) {
      if (descripcion.includes('SUPER') || descripcion.includes('MARKET')) {
        return {
          categoria: 'Alimentación',
          subcategoria: 'Supermercado',
          confianza: 60
        }
      }
    }

    // Gastos medianos podrían ser compras online
    if (importe < 0 && Math.abs(importe) > 50 && Math.abs(importe) < 200) {
      if (descripcion.includes('COMPRA') || descripcion.includes('ONLINE')) {
        return {
          categoria: 'Compras Online',
          subcategoria: 'General',
          confianza: 50
        }
      }
    }

    return null
  }

  addRule(rule: CategorizationRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => a.prioridad - b.prioridad)
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId)
  }

  updateRule(ruleId: string, updates: Partial<CategorizationRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId)
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates }
      this.rules.sort((a, b) => a.prioridad - b.prioridad)
    }
  }

  getRules(): CategorizationRule[] {
    return [...this.rules]
  }

  // New methods for enhanced functionality

  async loadRulesFromDB(cuentaId?: string): Promise<void> {
    try {
      const dbRules = await getReglas(cuentaId)
      const convertedRules: CategorizationRule[] = dbRules.map(rule => ({
        id: rule.id,
        nombre: rule.nombre,
        patron: rule.patron,
        tipoCoincidencia: rule.tipoCoincidencia as 'contiene' | 'empieza' | 'termina' | 'regex' | 'exacto',
        categoria: rule.categoria,
        subcategoria: rule.subcategoria || undefined,
        prioridad: rule.prioridad,
        activa: rule.activa
      }))
      
      this.rules = [...this.defaultRules, ...convertedRules]
        .filter(rule => rule.activa)
        .sort((a, b) => a.prioridad - b.prioridad)
    } catch (error) {
      console.error('Error loading rules from database:', error)
      // Fallback to default rules
      this.rules = this.defaultRules.filter(rule => rule.activa)
    }
  }

  async categorize(movimiento: MovimientoRaw, cuentaId?: string): Promise<CategorizationResult> {
    // Load fresh rules from DB
    await this.loadRulesFromDB(cuentaId)
    
    const result = this.categorizeMovimiento(movimiento)
    
    return {
      categoria: result.categoriaDetectada || 'Otros Gastos',
      subcategoria: result.subcategoriaDetectada,
      confianza: result.confianza,
      reglaAplicada: result.reglaAplicada
    }
  }

  async getMatchingRules(descripcion: string, cuentaId?: string): Promise<CategorizationRule[]> {
    await this.loadRulesFromDB(cuentaId)
    
    const descripcionUpper = descripcion.toUpperCase()
    return this.rules.filter(rule => this.matchesRule(descripcionUpper, rule))
  }

  testRule(descripcion: string, rule: CategorizationRule): {
    matches: boolean
    confidence?: number
  } {
    const descripcionUpper = descripcion.toUpperCase()
    const matches = this.matchesRule(descripcionUpper, rule)
    
    return {
      matches,
      confidence: matches ? this.calculateConfidence(descripcionUpper, rule) : undefined
    }
  }
}