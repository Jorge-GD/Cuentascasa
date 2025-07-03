import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UploadZone } from '../../components/importar/upload-zone'
import { PreviewTable } from '../../components/importar/preview-table'
import { CategorizationEditor } from '../../components/importar/categorization-editor'
import type { CategorizedMovimiento } from '../../lib/categorization/engine'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: any) => ({
    getRootProps: () => ({
      onClick: () => {},
      onDrop: onDrop,
      'data-testid': 'dropzone'
    }),
    getInputProps: () => ({
      'data-testid': 'file-input'
    }),
    isDragActive: false
  })
}))

describe('Import System Integration Tests', () => {
  const mockCuentaId = 'test-cuenta-id'
  const mockMovimientos: CategorizedMovimiento[] = [
    {
      fecha: '2023-12-01',
      descripcion: 'MERCADONA VALENCIA',
      importe: -45.67,
      saldo: 1200.50,
      categoriaING: 'SUPERMERCADOS',
      subcategoriaING: 'ALIMENTACION',
      categoriaDetectada: 'Alimentación',
      subcategoriaDetectada: 'Supermercado',
      confianza: 95,
      reglaAplicada: 'Mercadona'
    },
    {
      fecha: '2023-12-02',
      descripcion: 'BIZUM ENVIADO A JUAN DOE',
      importe: -20.00,
      saldo: 1180.50,
      categoriaDetectada: 'Bizum',
      subcategoriaDetectada: 'Enviado',
      confianza: 90,
      reglaAplicada: 'Bizum Enviado'
    }
  ]

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('UploadZone Component', () => {
    const mockOnMovimientosUploaded = jest.fn()

    it('should render upload zone with file and text tabs', () => {
      render(
        <UploadZone
          onMovimientosUploaded={mockOnMovimientosUploaded}
          isLoading={false}
          cuentaId={mockCuentaId}
        />
      )

      expect(screen.getByText('Subir PDF')).toBeInTheDocument()
      expect(screen.getByText('Pegar Texto')).toBeInTheDocument()
    })

    it('should handle text input submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            movimientos: mockMovimientos,
            stats: { total: 2, duplicados: 0 }
          }
        })
      })

      render(
        <UploadZone
          onMovimientosUploaded={mockOnMovimientosUploaded}
          isLoading={false}
          cuentaId={mockCuentaId}
        />
      )

      // Switch to text tab
      fireEvent.click(screen.getByText('Pegar Texto'))

      // Fill textarea
      const textarea = screen.getByPlaceholderText(/pega aquí el contenido/i)
      fireEvent.change(textarea, { target: { value: 'sample bank text data' } })

      // Submit
      fireEvent.click(screen.getByText('Procesar Texto'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/importar/preview', expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        }))
        expect(mockOnMovimientosUploaded).toHaveBeenCalledWith(mockMovimientos)
      })
    })

    it('should show error for empty text submission', async () => {
      render(
        <UploadZone
          onMovimientosUploaded={mockOnMovimientosUploaded}
          isLoading={false}
          cuentaId={mockCuentaId}
        />
      )

      // Switch to text tab
      fireEvent.click(screen.getByText('Pegar Texto'))

      // Submit without text
      fireEvent.click(screen.getByText('Procesar Texto'))

      await waitFor(() => {
        expect(screen.getByText('Pega el contenido del extracto')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Error parsing data'
        })
      })

      render(
        <UploadZone
          onMovimientosUploaded={mockOnMovimientosUploaded}
          isLoading={false}
          cuentaId={mockCuentaId}
        />
      )

      // Switch to text tab and submit
      fireEvent.click(screen.getByText('Pegar Texto'))
      const textarea = screen.getByPlaceholderText(/pega aquí el contenido/i)
      fireEvent.change(textarea, { target: { value: 'invalid data' } })
      fireEvent.click(screen.getByText('Procesar Texto'))

      await waitFor(() => {
        expect(screen.getByText('Error parsing data')).toBeInTheDocument()
      })
    })
  })

  describe('PreviewTable Component', () => {
    const mockOnMovimientosChange = jest.fn()
    const mockOnImportComplete = jest.fn()
    const mockOnLoadingChange = jest.fn()

    it('should render movimientos in table format', () => {
      render(
        <PreviewTable
          movimientos={mockMovimientos}
          onMovimientosChange={mockOnMovimientosChange}
          onImportComplete={mockOnImportComplete}
          isLoading={false}
          onLoadingChange={mockOnLoadingChange}
          cuentaId={mockCuentaId}
        />
      )

      expect(screen.getByText('MERCADONA VALENCIA')).toBeInTheDocument()
      expect(screen.getByText('BIZUM ENVIADO A JUAN DOE')).toBeInTheDocument()
      expect(screen.getByText('Alimentación')).toBeInTheDocument()
      expect(screen.getByText('Bizum')).toBeInTheDocument()
    })

    it('should show statistics cards', () => {
      render(
        <PreviewTable
          movimientos={mockMovimientos}
          onMovimientosChange={mockOnMovimientosChange}
          onImportComplete={mockOnImportComplete}
          isLoading={false}
          onLoadingChange={mockOnLoadingChange}
          cuentaId={mockCuentaId}
        />
      )

      expect(screen.getByText('Total Movimientos')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should handle movimiento selection', () => {
      render(
        <PreviewTable
          movimientos={mockMovimientos}
          onMovimientosChange={mockOnMovimientosChange}
          onImportComplete={mockOnImportComplete}
          isLoading={false}
          onLoadingChange={mockOnLoadingChange}
          cuentaId={mockCuentaId}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      
      // Select first movimiento
      fireEvent.click(checkboxes[1]) // First checkbox is "select all"
      
      expect(screen.getByText(/Importar 1 movimientos/)).toBeInTheDocument()
    })

    it('should handle import process', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            imported: 2,
            total: 2,
            errors: 0
          }
        })
      })

      render(
        <PreviewTable
          movimientos={mockMovimientos}
          onMovimientosChange={mockOnMovimientosChange}
          onImportComplete={mockOnImportComplete}
          isLoading={false}
          onLoadingChange={mockOnLoadingChange}
          cuentaId={mockCuentaId}
        />
      )

      // Select all movimientos
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      fireEvent.click(selectAllCheckbox)

      // Click import button
      const importButton = screen.getByText(/Importar 2 movimientos/)
      fireEvent.click(importButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/importar', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movimientos: mockMovimientos,
            cuentaId: mockCuentaId
          })
        }))
        expect(mockOnImportComplete).toHaveBeenCalled()
      })
    })
  })

  describe('CategorizationEditor Component', () => {
    const mockOnSave = jest.fn()
    const mockOnCancel = jest.fn()
    const mockMovimiento = mockMovimientos[0]

    it('should render movimiento information', () => {
      render(
        <CategorizationEditor
          movimiento={mockMovimiento}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('MERCADONA VALENCIA')).toBeInTheDocument()
      expect(screen.getByText('-45,67 €')).toBeInTheDocument()
    })

    it('should allow category selection', async () => {
      render(
        <CategorizationEditor
          movimiento={mockMovimiento}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // Change category
      const categorySelect = screen.getByRole('combobox')
      fireEvent.click(categorySelect)
      
      await waitFor(() => {
        expect(screen.getByText('Transporte')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Transporte'))

      // Save changes
      fireEvent.click(screen.getByText('Guardar Cambios'))

      expect(mockOnSave).toHaveBeenCalledWith({
        categoriaDetectada: 'Transporte',
        subcategoriaDetectada: undefined,
        confianza: 100,
        reglaAplicada: 'Manual'
      })
    })

    it('should handle cancel action', () => {
      render(
        <CategorizationEditor
          movimiento={mockMovimiento}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.click(screen.getByText('Cancelar'))
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('Preview API', () => {
    it('should handle PDF parsing', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('file', mockFile)
      formData.append('type', 'pdf')
      formData.append('cuentaId', 'test-id')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            movimientos: mockMovimientos,
            stats: { total: 2, duplicados: 0 }
          }
        })
      })

      const response = await fetch('/api/importar/preview', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.movimientos).toHaveLength(2)
    })

    it('should handle text parsing', async () => {
      const formData = new FormData()
      formData.append('text', 'sample bank text')
      formData.append('type', 'text')
      formData.append('cuentaId', 'test-id')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            movimientos: mockMovimientos,
            stats: { total: 2, duplicados: 0 }
          }
        })
      })

      const response = await fetch('/api/importar/preview', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Import API', () => {
    it('should handle successful import', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            imported: 2,
            total: 2,
            errors: 0
          }
        })
      })

      const response = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movimientos: mockMovimientos,
          cuentaId: 'test-id'
        })
      })

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.imported).toBe(2)
    })

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Se requiere un array de movimientos'
        })
      })

      const response = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('movimientos')
    })
  })
})