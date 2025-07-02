import { prisma } from '../../lib/db/prisma'
import {
  getCuentas,
  createCuenta,
  getCategorias,
  createMovimiento,
  getMovimientos
} from '../../lib/db/queries'

// Mock Prisma for unit tests
jest.mock('../../lib/db/prisma', () => ({
  prisma: {
    cuenta: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    categoria: {
      findMany: jest.fn(),
    },
    movimiento: {
      findMany: jest.fn(),
      create: jest.fn(),
    }
  }
}))

const mockPrisma = prisma as any

describe('Database Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Cuentas', () => {
    it('should get all cuentas', async () => {
      const mockCuentas = [
        { id: '1', nombre: 'Test Account', tipo: 'personal', color: '#blue' }
      ]
      
      mockPrisma.cuenta.findMany.mockResolvedValue(mockCuentas)
      
      const result = await getCuentas()
      
      expect(mockPrisma.cuenta.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' }
      })
      expect(result).toEqual(mockCuentas)
    })

    it('should create a new cuenta', async () => {
      const newCuentaData = {
        nombre: 'Nueva Cuenta',
        tipo: 'personal',
        color: '#green'
      }
      
      const mockCreatedCuenta = { id: '2', ...newCuentaData }
      mockPrisma.cuenta.create.mockResolvedValue(mockCreatedCuenta)
      
      const result = await createCuenta(newCuentaData)
      
      expect(mockPrisma.cuenta.create).toHaveBeenCalledWith({
        data: newCuentaData
      })
      expect(result).toEqual(mockCreatedCuenta)
    })
  })

  describe('Categorías', () => {
    it('should get all categorias with subcategorias', async () => {
      const mockCategorias = [
        {
          id: '1',
          nombre: 'Alimentación',
          color: '#green',
          subcategorias: [
            { id: '1', nombre: 'Supermercado' }
          ]
        }
      ]
      
      mockPrisma.categoria.findMany.mockResolvedValue(mockCategorias)
      
      const result = await getCategorias()
      
      expect(mockPrisma.categoria.findMany).toHaveBeenCalledWith({
        include: { subcategorias: true },
        orderBy: { nombre: 'asc' }
      })
      expect(result).toEqual(mockCategorias)
    })
  })

  describe('Movimientos', () => {
    it('should get movimientos with optional filters', async () => {
      const mockMovimientos = [
        {
          id: '1',
          descripcion: 'Test movement',
          importe: -50.0,
          categoria: 'Alimentación'
        }
      ]
      
      mockPrisma.movimiento.findMany.mockResolvedValue(mockMovimientos)
      
      const result = await getMovimientos('cuenta1', 10)
      
      expect(mockPrisma.movimiento.findMany).toHaveBeenCalledWith({
        where: { cuentaId: 'cuenta1' },
        orderBy: { fecha: 'desc' },
        take: 10,
        include: {
          cuenta: true,
          etiquetas: true
        }
      })
      expect(result).toEqual(mockMovimientos)
    })
  })
})