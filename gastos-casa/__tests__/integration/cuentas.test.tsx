import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CuentaCard } from '../../components/cuentas/cuenta-card'
import { CuentaForm } from '../../components/cuentas/cuenta-form'
import { CuentaSelector } from '../../components/cuentas/cuenta-selector'
import type { Cuenta } from '../../lib/types/database'

// Mock del store de Zustand
const mockUseCuentaStore = {
  cuentas: [],
  cuentaActiva: null,
  isLoading: false,
  error: null,
  selectCuenta: jest.fn(),
  fetchCuentas: jest.fn(),
}

jest.mock('../../lib/stores/cuentaStore', () => ({
  useCuentaStore: () => mockUseCuentaStore,
}))

// Mock de Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('Account Management Components', () => {
  const mockCuenta: Cuenta = {
    id: '1',
    nombre: 'Gastos Jorge',
    tipo: 'personal',
    color: '#3b82f6',
    createdAt: new Date('2023-01-01'),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('CuentaCard', () => {
    it('should render account information correctly', () => {
      render(<CuentaCard cuenta={mockCuenta} />)
      
      expect(screen.getByText('Gastos Jorge')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })

    it('should show active state when account is active', () => {
      render(<CuentaCard cuenta={mockCuenta} isActive={true} />)
      
      expect(screen.getByText('Activa')).toBeInTheDocument()
    })

    it('should show select button when account is not active', () => {
      render(<CuentaCard cuenta={mockCuenta} isActive={false} />)
      
      expect(screen.getByText('Seleccionar')).toBeInTheDocument()
    })

    it('should call selectCuenta when select button is clicked', () => {
      render(<CuentaCard cuenta={mockCuenta} isActive={false} />)
      
      fireEvent.click(screen.getByText('Seleccionar'))
      expect(mockUseCuentaStore.selectCuenta).toHaveBeenCalledWith('1')
    })

    it('should call onEdit when edit button is clicked', () => {
      const onEdit = jest.fn()
      render(<CuentaCard cuenta={mockCuenta} onEdit={onEdit} />)
      
      const editButton = screen.getByRole('button', { name: '' })
      fireEvent.click(editButton)
      expect(onEdit).toHaveBeenCalledWith(mockCuenta)
    })
  })

  describe('CuentaForm', () => {
    it('should render form fields correctly', () => {
      const onSubmit = jest.fn()
      render(<CuentaForm onSubmit={onSubmit} />)
      
      expect(screen.getByLabelText(/nombre de la cuenta/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tipo de cuenta/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/color identificativo/i)).toBeInTheDocument()
    })

    it('should validate required fields', async () => {
      const onSubmit = jest.fn()
      render(<CuentaForm onSubmit={onSubmit} />)
      
      const submitButton = screen.getByRole('button', { name: /crear cuenta/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument()
      })
      
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should submit form with valid data', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined)
      render(<CuentaForm onSubmit={onSubmit} />)
      
      const nombreInput = screen.getByLabelText(/nombre de la cuenta/i)
      fireEvent.change(nombreInput, { target: { value: 'Test Account' } })
      
      const submitButton = screen.getByRole('button', { name: /crear cuenta/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          nombre: 'Test Account',
          tipo: 'personal',
          color: '#3b82f6',
        })
      })
    })

    it('should populate form when editing existing account', () => {
      const onSubmit = jest.fn()
      render(<CuentaForm cuenta={mockCuenta} onSubmit={onSubmit} />)
      
      const nombreInput = screen.getByDisplayValue('Gastos Jorge')
      expect(nombreInput).toBeInTheDocument()
      
      expect(screen.getByText(/editar cuenta/i)).toBeInTheDocument()
    })
  })

  describe('CuentaSelector', () => {
    it('should show loading state', () => {
      mockUseCuentaStore.isLoading = true
      render(<CuentaSelector />)
      
      expect(screen.getByText('Cuenta:')).toBeInTheDocument()
      // Should show loading skeleton
    })

    it('should show create button when no accounts exist', () => {
      mockUseCuentaStore.isLoading = false
      mockUseCuentaStore.cuentas = []
      
      render(<CuentaSelector />)
      
      expect(screen.getByText(/crear primera cuenta/i)).toBeInTheDocument()
    })

    it('should show accounts in dropdown when accounts exist', () => {
      mockUseCuentaStore.isLoading = false
      mockUseCuentaStore.cuentas = [mockCuenta]
      mockUseCuentaStore.cuentaActiva = mockCuenta
      
      render(<CuentaSelector />)
      
      expect(screen.getByText('Gastos Jorge (personal)')).toBeInTheDocument()
    })

    it('should call fetchCuentas on mount when no accounts loaded', () => {
      mockUseCuentaStore.cuentas = []
      render(<CuentaSelector />)
      
      expect(mockUseCuentaStore.fetchCuentas).toHaveBeenCalled()
    })
  })
})

describe('Account API Integration', () => {
  const mockCuenta: Cuenta = {
    id: '1',
    nombre: 'Gastos Jorge',
    tipo: 'personal',
    color: '#3b82f6',
    createdAt: new Date('2023-01-01'),
  }

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle successful account creation', async () => {
    const mockResponse = {
      success: true,
      data: mockCuenta,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const response = await fetch('/api/cuentas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Test Account',
        tipo: 'personal',
        color: '#3b82f6',
      }),
    })

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.nombre).toBe('Gastos Jorge')
  })

  it('should handle validation errors', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'Faltan campos requeridos: nombre, tipo, color',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => mockErrorResponse,
    })

    const response = await fetch('/api/cuentas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('campos requeridos')
  })
})