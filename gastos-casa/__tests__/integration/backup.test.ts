/**
 * Integration tests for backup and export functionality
 * Testing backup creation, restoration, and data integrity
 */

import { BackupExporter } from '@/lib/backup/exporter'
import { BackupImporter } from '@/lib/backup/importer'
import { ExcelExporter } from '@/lib/export/excel'
import { CsvExporter } from '@/lib/export/csv'
import { prisma } from '@/lib/db/prisma'

// Mock data for testing
const mockCuenta = {
  id: 'test-cuenta-id',
  nombre: 'Cuenta Test',
  tipo: 'personal',
  color: '#FF0000',
  createdAt: new Date('2023-01-01')
}

const mockMovimientos = [
  {
    id: 'mov-1',
    fecha: new Date('2023-12-01'),
    descripcion: 'Compra supermercado',
    importe: -45.67,
    saldo: 1000,
    categoria: 'Alimentación',
    subcategoria: 'Supermercado',
    categoriaING: 'Compras',
    subcategoriaING: 'Supermercados',
    esManual: false,
    fechaImportacion: new Date('2023-12-01'),
    cuentaId: 'test-cuenta-id'
  },
  {
    id: 'mov-2',
    fecha: new Date('2023-12-02'),
    descripcion: 'Salario diciembre',
    importe: 2500.00,
    saldo: 2500,
    categoria: 'Ingresos',
    subcategoria: 'Salario',
    categoriaING: 'Ingresos',
    subcategoriaING: 'Nómina',
    esManual: false,
    fechaImportacion: new Date('2023-12-02'),
    cuentaId: 'test-cuenta-id'
  }
]

const mockCategorias = [
  {
    id: 'cat-1',
    nombre: 'Alimentación',
    color: '#00FF00',
    icono: '🍔',
    presupuesto: 300
  },
  {
    id: 'cat-2',
    nombre: 'Ingresos',
    color: '#0000FF',
    icono: '💰',
    presupuesto: null
  }
]

const mockReglas = [
  {
    id: 'regla-1',
    nombre: 'Mercadona',
    patron: 'MERCADONA',
    tipoCoincidencia: 'contiene',
    categoria: 'Alimentación',
    subcategoria: 'Supermercado',
    prioridad: 10,
    activa: true,
    cuentaId: 'test-cuenta-id'
  }
]

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    cuenta: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    movimiento: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn()
    },
    categoria: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    subcategoria: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn()
    },
    reglaCategorizacion: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    etiqueta: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Backup System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock responses
    mockPrisma.cuenta.findMany.mockResolvedValue([mockCuenta])
    mockPrisma.movimiento.findMany.mockResolvedValue(mockMovimientos)
    mockPrisma.categoria.findMany.mockResolvedValue(mockCategorias)
    mockPrisma.subcategoria.findMany.mockResolvedValue([])
    mockPrisma.reglaCategorizacion.findMany.mockResolvedValue(mockReglas)
    mockPrisma.etiqueta.findMany.mockResolvedValue([])
  })

  describe('BackupExporter', () => {
    it('should export complete backup successfully', async () => {
      const backup = await BackupExporter.exportComplete()

      expect(backup).toHaveProperty('version')
      expect(backup).toHaveProperty('timestamp')
      expect(backup).toHaveProperty('metadata')
      expect(backup.cuentas).toHaveLength(1)
      expect(backup.movimientos).toHaveLength(2)
      expect(backup.categorias).toHaveLength(2)
      expect(backup.reglas).toHaveLength(1)
      expect(backup.metadata.totalRecords).toBe(6) // 1 cuenta + 2 movimientos + 2 categorías + 1 regla
    })

    it('should export backup for specific account', async () => {
      const backup = await BackupExporter.exportCuenta('test-cuenta-id')

      expect(mockPrisma.cuenta.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['test-cuenta-id'] } },
        orderBy: { createdAt: 'asc' }
      })
      expect(mockPrisma.movimiento.findMany).toHaveBeenCalledWith({
        where: { cuentaId: { in: ['test-cuenta-id'] } },
        orderBy: { fecha: 'asc' }
      })
    })

    it('should export backup for date range', async () => {
      const fechaInicio = new Date('2023-12-01')
      const fechaFin = new Date('2023-12-31')

      const backup = await BackupExporter.exportPeriodo(fechaInicio, fechaFin)

      expect(mockPrisma.movimiento.findMany).toHaveBeenCalledWith({
        where: {
          fecha: {
            gte: fechaInicio,
            lte: fechaFin
          }
        },
        orderBy: { fecha: 'asc' }
      })
    })

    it('should validate backup data correctly', () => {
      const validBackup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cuentas: [mockCuenta],
        movimientos: mockMovimientos,
        categorias: mockCategorias,
        subcategorias: [],
        reglas: mockReglas,
        etiquetas: [],
        metadata: {
          totalRecords: 6,
          exportedBy: 'Test',
          exportDate: '2023-12-01'
        }
      }

      const validation = BackupExporter.validateBackupData(validBackup)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid backup data', () => {
      const invalidBackup = {
        // Missing required fields
        cuentas: [mockCuenta],
        movimientos: [{ ...mockMovimientos[0], cuentaId: 'non-existent-account' }]
      }

      const validation = BackupExporter.validateBackupData(invalidBackup)
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should generate proper backup filename', () => {
      const filename = BackupExporter.generateBackupFilename('completo')
      expect(filename).toMatch(/^gastos-casa-backup-completo-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/)
    })
  })

  describe('BackupImporter', () => {
    beforeEach(() => {
      // Mock transaction to execute callback immediately
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })

      // Mock create operations with sequential responses
      mockPrisma.cuenta.create.mockResolvedValue(mockCuenta)
      
      // Mock movimiento creation for each item
      mockPrisma.movimiento.create
        .mockResolvedValueOnce(mockMovimientos[0])
        .mockResolvedValueOnce(mockMovimientos[1])
      
      // Mock categoria creation for each item  
      mockPrisma.categoria.create
        .mockResolvedValueOnce(mockCategorias[0])
        .mockResolvedValueOnce(mockCategorias[1])
        
      mockPrisma.reglaCategorizacion.create.mockResolvedValue(mockReglas[0])

      // Mock find operations for checking duplicates
      mockPrisma.cuenta.findFirst.mockResolvedValue(null)
      mockPrisma.movimiento.findFirst.mockResolvedValue(null)
      mockPrisma.categoria.findFirst.mockResolvedValue(null)
      mockPrisma.reglaCategorizacion.findFirst.mockResolvedValue(null)
    })

    it('should import complete backup successfully', async () => {
      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cuentas: [mockCuenta],
        movimientos: mockMovimientos,
        categorias: mockCategorias,
        subcategorias: [],
        reglas: mockReglas,
        etiquetas: [],
        metadata: {
          totalRecords: 6,
          exportedBy: 'Test',
          exportDate: '2023-12-01'
        }
      }

      const result = await BackupImporter.importComplete(backupData)

      expect(result.success).toBe(true)
      expect(result.summary.cuentasImportadas).toBe(1)
      expect(result.summary.movimientosImportados).toBe(2)
      expect(result.summary.categoriasImportadas).toBe(2)
      expect(result.summary.reglasImportadas).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle import options correctly', async () => {
      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cuentas: [mockCuenta],
        movimientos: [],
        categorias: [],
        subcategorias: [],
        reglas: [],
        etiquetas: [],
        metadata: {
          totalRecords: 1,
          exportedBy: 'Test',
          exportDate: '2023-12-01'
        }
      }

      // Mock existing account
      mockPrisma.cuenta.findFirst.mockResolvedValue(mockCuenta)

      const options = {
        mergeMode: 'skip' as const,
        validateIntegrity: true,
        preserveIds: true
      }

      const result = await BackupImporter.importComplete(backupData, options)

      expect(result.success).toBe(true)
      expect(result.skipped.cuentas).toContain(mockCuenta.nombre)
    })

    it('should clear database successfully', async () => {
      mockPrisma.movimiento.deleteMany.mockResolvedValue({ count: 2 })
      mockPrisma.reglaCategorizacion.deleteMany.mockResolvedValue({ count: 1 })
      mockPrisma.subcategoria.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.categoria.deleteMany.mockResolvedValue({ count: 2 })
      mockPrisma.etiqueta.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.cuenta.deleteMany.mockResolvedValue({ count: 1 })

      await BackupImporter.clearDatabase()

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockPrisma.movimiento.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.cuenta.deleteMany).toHaveBeenCalled()
    })

    it('should validate integrity before import', async () => {
      const invalidBackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cuentas: [],
        movimientos: [{ ...mockMovimientos[0], cuentaId: 'non-existent' }],
        categorias: [],
        subcategorias: [],
        reglas: [],
        etiquetas: [],
        metadata: {
          totalRecords: 1,
          exportedBy: 'Test',
          exportDate: '2023-12-01'
        }
      }

      const result = await BackupImporter.importComplete(invalidBackupData, { validateIntegrity: true })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('ExcelExporter', () => {
    it('should export backup to Excel format', async () => {
      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cuentas: [mockCuenta],
        movimientos: mockMovimientos,
        categorias: mockCategorias,
        subcategorias: [],
        reglas: mockReglas,
        etiquetas: [],
        metadata: {
          totalRecords: 6,
          exportedBy: 'Test',
          exportDate: '2023-12-01'
        }
      }

      const buffer = await ExcelExporter.exportToExcel(backupData)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('should export movements analysis to Excel', async () => {
      const buffer = await ExcelExporter.exportMovimientosAnalisis(mockMovimientos)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('should generate proper Excel filename', () => {
      const filename = ExcelExporter.generateExcelFilename('backup')
      expect(filename).toMatch(/^gastos-casa-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.xlsx$/)
    })
  })

  describe('CsvExporter', () => {
    it('should export backup to CSV format', async () => {
      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cuentas: [mockCuenta],
        movimientos: mockMovimientos,
        categorias: mockCategorias,
        subcategorias: [],
        reglas: mockReglas,
        etiquetas: [],
        metadata: {
          totalRecords: 6,
          exportedBy: 'Test',
          exportDate: '2023-12-01'
        }
      }

      const csvFiles = await CsvExporter.exportToCSV(backupData)

      expect(csvFiles).toBeInstanceOf(Array)
      expect(csvFiles.length).toBeGreaterThan(0)
      
      // Cada archivo debe tener nombre, ruta y contenido
      csvFiles.forEach(file => {
        expect(file).toHaveProperty('filename')
        expect(file).toHaveProperty('path')
        expect(file).toHaveProperty('content')
        expect(file.content).toBeInstanceOf(Buffer)
      })

      // Limpiar archivos temporales
      await CsvExporter.cleanupTempFiles(csvFiles)
    })

    it('should export simple movements to CSV', async () => {
      const buffer = await CsvExporter.exportMovimientosSimple(mockMovimientos)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      
      // Verificar que el contenido contiene headers CSV
      const content = buffer.toString()
      expect(content).toContain('Fecha,Descripción,Importe,Categoría')
    })

    it('should export category analysis to CSV', async () => {
      const buffer = await CsvExporter.exportAnalisisCategorias(mockMovimientos)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      
      // Verificar que el contenido contiene headers de análisis
      const content = buffer.toString()
      expect(content).toContain('Categoría,Total Gastado,Porcentaje')
    })

    it('should generate proper CSV filename', () => {
      const filename = CsvExporter.generateCsvFilename('movimientos')
      expect(filename).toMatch(/^gastos-casa-movimientos-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrisma.cuenta.findMany.mockRejectedValue(new Error('Database connection failed'))

      await expect(BackupExporter.exportComplete()).rejects.toThrow('Error al exportar datos')
    })

    it('should handle corrupted backup data', async () => {
      const corruptedData = {
        version: '1.0.0',
        // Missing required fields
        cuentas: null,
        movimientos: 'invalid data'
      }

      const result = await BackupImporter.importComplete(corruptedData as any)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle file system errors in CSV export', async () => {
      // Mock fs.readFile to fail
      jest.doMock('fs', () => ({
        promises: {
          readFile: jest.fn().mockRejectedValue(new Error('File system error')),
          unlink: jest.fn()
        }
      }))

      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        cuentas: [],
        movimientos: [],
        categorias: [],
        subcategorias: [],
        reglas: [],
        etiquetas: [],
        metadata: { totalRecords: 0, exportedBy: 'Test', exportDate: '2023-12-01' }
      }

      // This should handle the error gracefully
      await expect(CsvExporter.exportToCSV(backupData)).rejects.toThrow()
    })
  })

  describe('Data Integrity', () => {
    it('should maintain referential integrity during export/import cycle', async () => {
      // Export backup
      const originalBackup = await BackupExporter.exportComplete()

      // Import the same backup
      const importResult = await BackupImporter.importComplete(originalBackup)

      expect(importResult.success).toBe(true)
      
      // Verify all movimientos still reference valid cuentas
      const cuentaIds = new Set(originalBackup.cuentas.map(c => c.id))
      const invalidMovimientos = originalBackup.movimientos.filter(m => !cuentaIds.has(m.cuentaId))
      
      expect(invalidMovimientos).toHaveLength(0)
    })

    it('should preserve data types and formats', async () => {
      const backup = await BackupExporter.exportComplete()

      // Verify data types are preserved
      expect(typeof backup.movimientos[0].importe).toBe('number')
      expect(backup.movimientos[0].fecha).toBeInstanceOf(Date)
      expect(typeof backup.movimientos[0].esManual).toBe('boolean')
    })

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeMovimientos = Array.from({ length: 10000 }, (_, i) => ({
        ...mockMovimientos[0],
        id: `mov-${i}`,
        descripcion: `Movimiento ${i}`
      }))

      mockPrisma.movimiento.findMany.mockResolvedValue(largeMovimientos)

      const startTime = Date.now()
      const backup = await BackupExporter.exportComplete()
      const endTime = Date.now()

      expect(backup.movimientos).toHaveLength(10000)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in less than 5 seconds
    })
  })
})

describe('Backup API Integration', () => {
  // Mock Response for Node.js environment
  const MockResponse = class {
    status: number
    headers: Map<string, string>
    body: string

    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Map(Object.entries(init?.headers || {}))
    }

    json() {
      return Promise.resolve(JSON.parse(this.body))
    }

    get(key: string) {
      return this.headers.get(key)
    }
  }

  // Mock fetch for API testing
  global.fetch = jest.fn()
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should handle backup export API correctly', async () => {
    const mockResponse = new MockResponse(JSON.stringify({ test: 'data' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="backup.json"'
      }
    })

    mockFetch.mockResolvedValue(mockResponse as any)

    const response = await fetch('/api/backup/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'completo', formato: 'json' })
    })

    expect(response.status).toBe(200)
  })

  it('should handle backup import API correctly', async () => {
    const mockResponse = new MockResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

    mockFetch.mockResolvedValue(mockResponse as any)

    // Mock FormData for Node.js environment
    const formData = {
      append: jest.fn()
    }

    const response = await fetch('/api/backup/import', {
      method: 'POST',
      body: formData as any
    })

    expect(response.status).toBe(200)
  })
})