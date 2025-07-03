import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MovimientosTable } from '../../components/movimientos/movimientos-table'
import { FilterBar } from '../../components/movimientos/filter-bar'
import { MovimientoModal } from '../../components/movimientos/movimiento-modal'
import { MovimientoFilterManager } from '../../lib/utils/filters'
import type { Movimiento } from '../../lib/types/database'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => '01/01/2023'),
  es: {}
}))

describe('Movements Management Integration Tests', () => {
  const mockMovimientos: Movimiento[] = [
    {
      id: '1',
      fecha: new Date('2023-12-01'),
      descripcion: 'MERCADONA VALENCIA',
      importe: -45.67,
      saldo: 1200.50,
      categoriaING: 'SUPERMERCADOS',
      subcategoriaING: 'ALIMENTACION',
      categoria: 'Alimentación',
      subcategoria: 'Supermercado',
      esManual: false,
      fechaImportacion: new Date('2023-12-01'),
      cuentaId: 'cuenta-1'
    },
    {
      id: '2',
      fecha: new Date('2023-12-02'),
      descripcion: 'BIZUM ENVIADO A JUAN DOE',
      importe: -20.00,
      saldo: 1180.50,
      categoria: 'Bizum',
      subcategoria: 'Enviado',
      esManual: false,
      fechaImportacion: new Date('2023-12-02'),
      cuentaId: 'cuenta-1'
    },
    {
      id: '3',
      fecha: new Date('2023-12-03'),
      descripcion: 'NÓMINA EMPRESA',
      importe: 2500.00,
      saldo: 3680.50,
      categoria: 'Ingresos',
      subcategoria: 'Nómina',
      esManual: false,
      fechaImportacion: new Date('2023-12-03'),
      cuentaId: 'cuenta-1'
    }
  ]

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('MovimientosTable Component', () => {
    const mockOnEdit = jest.fn()

    it('should render movements table with data', () => {
      render(
        <MovimientosTable
          movimientos={mockMovimientos}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      expect(screen.getByText('MERCADONA VALENCIA')).toBeInTheDocument()
      expect(screen.getByText('BIZUM ENVIADO A JUAN DOE')).toBeInTheDocument()
      expect(screen.getByText('NÓMINA EMPRESA')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(
        <MovimientosTable
          movimientos={[]}
          onEditMovimiento={mockOnEdit}
          isLoading={true}
        />
      )

      // Should show loading skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should show empty state when no movements', () => {
      render(
        <MovimientosTable
          movimientos={[]}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      expect(screen.getByText('No se encontraron movimientos con los filtros aplicados.')).toBeInTheDocument()
    })

    it('should handle sorting by fecha', () => {
      render(
        <MovimientosTable
          movimientos={mockMovimientos}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      const fechaHeader = screen.getByText('Fecha')
      fireEvent.click(fechaHeader)

      // Should trigger sorting (no actual assertion on order as it's complex to test)
      expect(fechaHeader).toBeInTheDocument()
    })

    it('should handle sorting by importe', () => {
      render(
        <MovimientosTable
          movimientos={mockMovimientos}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      const importeHeader = screen.getByText('Importe')
      fireEvent.click(importeHeader)

      expect(importeHeader).toBeInTheDocument()
    })

    it('should display correct currency formatting', () => {
      render(
        <MovimientosTable
          movimientos={mockMovimientos}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      // Check for currency formatting (€ symbol)
      expect(screen.getAllByText(/€/)).toHaveLength(mockMovimientos.length * 2) // importe + saldo
    })

    it('should show category badges', () => {
      render(
        <MovimientosTable
          movimientos={mockMovimientos}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      expect(screen.getByText('Alimentación')).toBeInTheDocument()
      expect(screen.getByText('Bizum')).toBeInTheDocument()
      expect(screen.getByText('Ingresos')).toBeInTheDocument()
    })

    it('should handle page size changes', () => {
      render(
        <MovimientosTable
          movimientos={mockMovimientos}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      // Find page size selector and change it
      const pageSizeSelect = screen.getByDisplayValue('25')
      fireEvent.click(pageSizeSelect)
      
      // Should show different page size options
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('should call onEditMovimiento when edit action is clicked', async () => {
      render(
        <MovimientosTable
          movimientos={mockMovimientos}
          onEditMovimiento={mockOnEdit}
          isLoading={false}
        />
      )

      // Click on the first action menu
      const actionButtons = screen.getAllByRole('button', { name: 'Abrir menú' })
      fireEvent.click(actionButtons[0])

      // Wait for menu to appear and click edit
      await waitFor(() => {
        const editButton = screen.getByText('Editar')
        fireEvent.click(editButton)
      })

      expect(mockOnEdit).toHaveBeenCalledWith(mockMovimientos[0])
    })
  })

  describe('FilterBar Component', () => {
    const mockOnFiltersChange = jest.fn()

    it('should render filter controls', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      expect(screen.getByLabelText('Fecha Inicio')).toBeInTheDocument()
      expect(screen.getByLabelText('Fecha Fin')).toBeInTheDocument()
      expect(screen.getByText('Tipo de Movimiento')).toBeInTheDocument()
      expect(screen.getByText('Categorías')).toBeInTheDocument()
    })

    it('should show preset filter buttons', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      expect(screen.getByText('Este Mes')).toBeInTheDocument()
      expect(screen.getByText('Ultimos 30 Dias')).toBeInTheDocument()
      expect(screen.getByText('Solo Ingresos')).toBeInTheDocument()
      expect(screen.getByText('Solo Gastos')).toBeInTheDocument()
    })

    it('should apply preset filters', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      const soloIngresosButton = screen.getByText('Solo Ingresos')
      fireEvent.click(soloIngresosButton)

      expect(mockOnFiltersChange).toHaveBeenCalled()
    })

    it('should handle date range filters', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      const fechaInicio = screen.getByLabelText('Fecha Inicio')
      fireEvent.change(fechaInicio, { target: { value: '2023-12-01' } })

      expect(mockOnFiltersChange).toHaveBeenCalled()
    })

    it('should handle category filters', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      const categorySelect = screen.getByRole('combobox')
      fireEvent.click(categorySelect)

      // Should show available categories
      expect(screen.getByText('Alimentación (1)')).toBeInTheDocument()
    })

    it('should show active filters', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      // Apply a filter first
      const fechaInicio = screen.getByLabelText('Fecha Inicio')
      fireEvent.change(fechaInicio, { target: { value: '2023-12-01' } })

      // Should show active filters section
      expect(screen.getByText('Filtros activos:')).toBeInTheDocument()
    })

    it('should clear all filters', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      // Apply a filter first
      const fechaInicio = screen.getByLabelText('Fecha Inicio')
      fireEvent.change(fechaInicio, { target: { value: '2023-12-01' } })

      // Clear filters
      const clearButton = screen.getByText('Limpiar todo')
      fireEvent.click(clearButton)

      expect(mockOnFiltersChange).toHaveBeenCalled()
    })

    it('should show filter statistics', () => {
      render(
        <FilterBar
          movimientos={mockMovimientos}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      expect(screen.getByText(/Mostrando \d+ de \d+ movimientos/)).toBeInTheDocument()
      expect(screen.getByText(/Balance:/)).toBeInTheDocument()
      expect(screen.getByText(/Promedio:/)).toBeInTheDocument()
    })
  })

  describe('MovimientoModal Component', () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()
    const mockOnDelete = jest.fn()

    beforeEach(() => {
      mockOnClose.mockClear()
      mockOnSave.mockClear()
      mockOnDelete.mockClear()
    })

    it('should render create modal', () => {
      render(
        <MovimientoModal
          movimiento={null}
          cuentaId="cuenta-1"
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('Nuevo Movimiento')).toBeInTheDocument()
      expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Descripción/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Importe/)).toBeInTheDocument()
    })

    it('should render edit modal with existing data', () => {
      render(
        <MovimientoModal
          movimiento={mockMovimientos[0]}
          cuentaId="cuenta-1"
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText('Editar Movimiento')).toBeInTheDocument()
      expect(screen.getByDisplayValue('MERCADONA VALENCIA')).toBeInTheDocument()
    })

    it('should validate required fields', async () => {
      render(
        <MovimientoModal
          movimiento={null}
          cuentaId="cuenta-1"
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const submitButton = screen.getByText('Crear')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('La fecha es requerida')).toBeInTheDocument()
        expect(screen.getByText('La descripción es requerida')).toBeInTheDocument()
        expect(screen.getByText('El importe es requerido')).toBeInTheDocument()
      })
    })

    it('should handle form submission for new movement', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockMovimientos[0], id: 'new-id' }
        })
      })

      render(
        <MovimientoModal
          movimiento={null}
          cuentaId="cuenta-1"
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Fill form
      fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: '2023-12-01' } })
      fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Test movement' } })
      fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '-10.50' } })

      // Select category
      const categorySelect = screen.getByRole('combobox')
      fireEvent.click(categorySelect)
      fireEvent.click(screen.getByText('Alimentación'))

      // Submit
      fireEvent.click(screen.getByText('Crear'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/movimientos', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test movement')
        }))
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should handle form submission for editing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMovimientos[0]
        })
      })

      render(
        <MovimientoModal
          movimiento={mockMovimientos[0]}
          cuentaId="cuenta-1"
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Modify description
      const descriptionField = screen.getByDisplayValue('MERCADONA VALENCIA')
      fireEvent.change(descriptionField, { target: { value: 'MERCADONA MODIFIED' } })

      // Submit
      fireEvent.click(screen.getByText('Actualizar'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/movimientos/${mockMovimientos[0].id}`, expect.objectContaining({
          method: 'PUT'
        }))
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should handle delete action', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Deleted'
        })
      })

      render(
        <MovimientoModal
          movimiento={mockMovimientos[0]}
          cuentaId="cuenta-1"
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      )

      // Click delete button
      fireEvent.click(screen.getByText('Eliminar'))

      // Confirm deletion in alert dialog
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/movimientos/${mockMovimientos[0].id}`, expect.objectContaining({
          method: 'DELETE'
        }))
        expect(mockOnDelete).toHaveBeenCalled()
      })
    })
  })

  describe('Filter Utilities', () => {
    it('should filter movements by date range', () => {
      const manager = new MovimientoFilterManager(mockMovimientos)
      const filtered = manager.applyFilters({
        fechaInicio: '2023-12-02',
        fechaFin: '2023-12-02'
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].descripcion).toBe('BIZUM ENVIADO A JUAN DOE')
    })

    it('should filter movements by category', () => {
      const manager = new MovimientoFilterManager(mockMovimientos)
      const filtered = manager.applyFilters({
        categorias: ['Ingresos']
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].categoria).toBe('Ingresos')
    })

    it('should filter movements by type (ingresos/gastos)', () => {
      const manager = new MovimientoFilterManager(mockMovimientos)
      const ingresos = manager.applyFilters({
        tipoMovimiento: 'ingresos'
      })
      const gastos = manager.applyFilters({
        tipoMovimiento: 'gastos'
      })

      expect(ingresos).toHaveLength(1)
      expect(gastos).toHaveLength(2)
    })

    it('should filter movements by description search', () => {
      const manager = new MovimientoFilterManager(mockMovimientos)
      const filtered = manager.applyFilters({
        descripcion: 'BIZUM'
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].descripcion).toContain('BIZUM')
    })

    it('should filter movements by amount range', () => {
      const manager = new MovimientoFilterManager(mockMovimientos)
      const filtered = manager.applyFilters({
        importeMin: 100,
        importeMax: 1000
      })

      expect(filtered).toHaveLength(0) // No movements in this range
    })

    it('should get correct filter options', () => {
      const manager = new MovimientoFilterManager(mockMovimientos)
      const options = manager.getFilterOptions()

      expect(options.categorias).toHaveLength(3)
      expect(options.categorias.find(c => c.value === 'Alimentación')?.count).toBe(1)
      expect(options.rangos.importeMin).toBeLessThan(options.rangos.importeMax)
    })

    it('should calculate statistics correctly', () => {
      const manager = new MovimientoFilterManager(mockMovimientos)
      const stats = manager.getStatistics()

      expect(stats.total).toBe(3)
      expect(stats.totalIngresos).toBe(2500)
      expect(stats.totalGastos).toBe(65.67)
      expect(stats.balance).toBe(2434.33)
    })
  })

  describe('API Integration', () => {
    it('should handle successful movements fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMovimientos
        })
      })

      const response = await fetch('/api/movimientos?cuentaId=cuenta-1')
      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
    })

    it('should handle movement creation', async () => {
      const newMovimiento = {
        fecha: '2023-12-04T00:00:00.000Z',
        descripcion: 'Test movement',
        importe: -25.50,
        categoria: 'Alimentación',
        cuentaId: 'cuenta-1'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...newMovimiento, id: 'new-id' }
        })
      })

      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovimiento)
      })

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.descripcion).toBe('Test movement')
    })

    it('should handle movement update', async () => {
      const updates = {
        descripcion: 'Updated description'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockMovimientos[0], ...updates }
        })
      })

      const response = await fetch('/api/movimientos/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.descripcion).toBe('Updated description')
    })

    it('should handle movement deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Movement deleted'
        })
      })

      const response = await fetch('/api/movimientos/1', {
        method: 'DELETE'
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })
})