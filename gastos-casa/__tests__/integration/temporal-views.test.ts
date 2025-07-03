/**
 * Integration tests for temporal views (monthly and annual)
 * Testing navigation, data loading, and component functionality
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VistaMensual } from '@/components/vistas/vista-mensual'
import { VistaAnual } from '@/components/vistas/vista-anual'
import { MonthPicker } from '@/components/common/month-picker'
import { YearSelector } from '@/components/common/year-selector'
import { ComparativaMensual } from '@/components/comparativas/comparativa-mensual'
import { HeatmapAnual } from '@/components/comparativas/heatmap-anual'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

// Mock date-fns locale
jest.mock('date-fns/locale', () => ({
  es: {}
}))

// Mock recharts
jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Sample test data
const sampleMovimientos = [
  {
    id: '1',
    fecha: '2023-12-01T00:00:00.000Z',
    descripcion: 'Compra supermercado',
    importe: -45.67,
    categoria: 'Alimentación',
    subcategoria: 'Supermercado'
  },
  {
    id: '2',
    fecha: '2023-12-02T00:00:00.000Z',
    descripcion: 'Salario diciembre',
    importe: 2500.00,
    categoria: 'Ingresos',
    subcategoria: 'Salario'
  },
  {
    id: '3',
    fecha: '2023-12-03T00:00:00.000Z',
    descripcion: 'Gasolina',
    importe: -35.20,
    categoria: 'Transporte',
    subcategoria: 'Combustible'
  }
]

describe('Temporal Views Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleMovimientos)
    })
  })

  describe('VistaMensual', () => {
    const testProps = {
      cuentaId: 'test-cuenta-id',
      mes: new Date('2023-12-01')
    }

    it('should render monthly view with data', async () => {
      render(<VistaMensual {...testProps} />)

      // Should show loading initially
      expect(screen.getByText('Cargando vista mensual...')).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Total Gastos')).toBeInTheDocument()
      })

      // Should show summary cards
      expect(screen.getByText('Total Ingresos')).toBeInTheDocument()
      expect(screen.getByText('Balance')).toBeInTheDocument()
      expect(screen.getByText('Gasto por Día')).toBeInTheDocument()
    })

    it('should fetch movements data correctly', async () => {
      render(<VistaMensual {...testProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/movimientos')
        )
      })

      // Should make calls for current month and previous month
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should display movements list', async () => {
      render(<VistaMensual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Movimientos del Mes')).toBeInTheDocument()
      })

      // Should show movement descriptions
      await waitFor(() => {
        expect(screen.getByText('Compra supermercado')).toBeInTheDocument()
        expect(screen.getByText('Salario diciembre')).toBeInTheDocument()
        expect(screen.getByText('Gasolina')).toBeInTheDocument()
      })
    })

    it('should handle empty data gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      render(<VistaMensual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('No hay movimientos registrados para este mes')).toBeInTheDocument()
      })
    })

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      render(<VistaMensual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar datos')).toBeInTheDocument()
      })

      // Should show retry button
      expect(screen.getByText('Reintentar')).toBeInTheDocument()
    })

    it('should show navigation links', async () => {
      render(<VistaMensual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Navegación Temporal')).toBeInTheDocument()
      })

      // Should have link to annual view
      const annualLink = screen.getByText('Ver año completo (2023)')
      expect(annualLink.closest('a')).toHaveAttribute('href', '/cuentas/test-cuenta-id/anual/2023')
    })
  })

  describe('VistaAnual', () => {
    const testProps = {
      cuentaId: 'test-cuenta-id',
      año: 2023
    }

    it('should render annual view with data', async () => {
      render(<VistaAnual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Total Gastos Anuales')).toBeInTheDocument()
      })

      expect(screen.getByText('Total Ingresos Anuales')).toBeInTheDocument()
      expect(screen.getByText('Balance Anual')).toBeInTheDocument()
      expect(screen.getByText('Transacciones')).toBeInTheDocument()
    })

    it('should fetch data for all 12 months', async () => {
      render(<VistaAnual {...testProps} />)

      await waitFor(() => {
        // Should make 12 calls for the year + potentially calls for previous year
        expect(mockFetch).toHaveBeenCalledTimes(12)
      })
    })

    it('should display monthly breakdown', async () => {
      render(<VistaAnual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Resumen por Meses')).toBeInTheDocument()
      })

      // Should show month names
      await waitFor(() => {
        expect(screen.getByText('Enero')).toBeInTheDocument()
        expect(screen.getByText('Diciembre')).toBeInTheDocument()
      })
    })

    it('should show trend chart', async () => {
      render(<VistaAnual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Evolución Mensual 2023')).toBeInTheDocument()
        expect(screen.getByTestId('area-chart')).toBeInTheDocument()
      })
    })

    it('should show navigation tools', async () => {
      render(<VistaAnual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Análisis Comparativo')).toBeInTheDocument()
        expect(screen.getByText('Navegación Rápida')).toBeInTheDocument()
      })
    })
  })

  describe('MonthPicker', () => {
    const testProps = {
      value: new Date('2023-12-01'),
      onChange: jest.fn()
    }

    it('should render month picker with current value', () => {
      render(<MonthPicker {...testProps} />)

      expect(screen.getByText('diciembre 2023')).toBeInTheDocument()
    })

    it('should have navigation buttons', () => {
      render(<MonthPicker {...testProps} />)

      const prevButton = screen.getAllByRole('button')[0]
      const nextButton = screen.getAllByRole('button')[2]

      expect(prevButton).toBeInTheDocument()
      expect(nextButton).toBeInTheDocument()
    })

    it('should call onChange when navigation is used', () => {
      render(<MonthPicker {...testProps} />)

      const prevButton = screen.getAllByRole('button')[0]
      fireEvent.click(prevButton)

      expect(testProps.onChange).toHaveBeenCalled()
    })

    it('should respect min/max date constraints', () => {
      const props = {
        ...testProps,
        minDate: new Date('2023-10-01'),
        maxDate: new Date('2023-12-31')
      }

      render(<MonthPicker {...props} />)

      // Navigation buttons should respect constraints
      const prevButton = screen.getAllByRole('button')[0]
      const nextButton = screen.getAllByRole('button')[2]

      expect(prevButton).not.toBeDisabled()
      expect(nextButton).toBeDisabled() // Can't go beyond max date
    })
  })

  describe('YearSelector', () => {
    const testProps = {
      value: 2023,
      onChange: jest.fn()
    }

    it('should render year selector with current value', () => {
      render(<YearSelector {...testProps} />)

      expect(screen.getByText('2023')).toBeInTheDocument()
    })

    it('should have navigation buttons', () => {
      render(<YearSelector {...testProps} />)

      const prevButton = screen.getAllByRole('button')[0]
      const nextButton = screen.getAllByRole('button')[2]

      expect(prevButton).toBeInTheDocument()
      expect(nextButton).toBeInTheDocument()
    })

    it('should call onChange when navigation is used', () => {
      render(<YearSelector {...testProps} />)

      const prevButton = screen.getAllByRole('button')[0]
      fireEvent.click(prevButton)

      expect(testProps.onChange).toHaveBeenCalledWith(2022)
    })

    it('should respect min/max year constraints', () => {
      const props = {
        ...testProps,
        minYear: 2020,
        maxYear: 2023
      }

      render(<YearSelector {...props} />)

      const nextButton = screen.getAllByRole('button')[2]
      expect(nextButton).toBeDisabled() // Can't go beyond max year
    })
  })

  describe('ComparativaMensual', () => {
    const testProps = {
      cuentaId: 'test-cuenta-id',
      mesInicial: new Date('2023-12-01')
    }

    it('should render comparative monthly view', async () => {
      render(<ComparativaMensual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Comparativa Mensual')).toBeInTheDocument()
      })

      expect(screen.getByText('Tendencia General')).toBeInTheDocument()
    })

    it('should fetch data for current and previous month', async () => {
      render(<ComparativaMensual {...testProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2) // Current and previous month
      })
    })

    it('should show variation metrics', async () => {
      render(<ComparativaMensual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Gastos')).toBeInTheDocument()
        expect(screen.getByText('Ingresos')).toBeInTheDocument()
        expect(screen.getByText('Balance')).toBeInTheDocument()
        expect(screen.getByText('Transacciones')).toBeInTheDocument()
      })
    })
  })

  describe('HeatmapAnual', () => {
    const testProps = {
      cuentaId: 'test-cuenta-id',
      añoInicial: 2023
    }

    it('should render heatmap annual view', async () => {
      render(<HeatmapAnual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Heatmap Anual')).toBeInTheDocument()
      })
    })

    it('should have view type toggles', async () => {
      render(<HeatmapAnual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Gastos')).toBeInTheDocument()
        expect(screen.getByText('Ingresos')).toBeInTheDocument()
        expect(screen.getByText('Balance')).toBeInTheDocument()
      })
    })

    it('should switch between view types', async () => {
      render(<HeatmapAnual {...testProps} />)

      await waitFor(() => {
        const ingresosButton = screen.getByText('Ingresos')
        fireEvent.click(ingresosButton)
      })

      // Should trigger new data fetch when view type changes
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('should show quarterly analysis', async () => {
      render(<HeatmapAnual {...testProps} />)

      await waitFor(() => {
        expect(screen.getByText('Análisis por Trimestres')).toBeInTheDocument()
        expect(screen.getByText('Q1')).toBeInTheDocument()
        expect(screen.getByText('Q2')).toBeInTheDocument()
        expect(screen.getByText('Q3')).toBeInTheDocument()
        expect(screen.getByText('Q4')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<VistaMensual cuentaId="test" mes={new Date()} />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar datos')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      })

      render(<VistaAnual cuentaId="test" año={2023} />)

      await waitFor(() => {
        expect(screen.getByText(/Error al cargar/)).toBeInTheDocument()
      })
    })

    it('should retry after error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleMovimientos)
      })

      render(<VistaMensual cuentaId="test" mes={new Date()} />)

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Reintentar'))

      await waitFor(() => {
        expect(screen.getByText('Total Gastos')).toBeInTheDocument()
      })
    })
  })
})

describe('Navigation Flow Integration', () => {
  it('should provide correct navigation links between views', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleMovimientos)
    })

    // Test monthly to annual navigation
    const { rerender } = render(
      <VistaMensual cuentaId="test-id" mes={new Date('2023-12-01')} />
    )

    await waitFor(() => {
      const annualLink = screen.getByText('Ver año completo (2023)')
      expect(annualLink.closest('a')).toHaveAttribute('href', '/cuentas/test-id/anual/2023')
    })

    // Test annual to monthly navigation
    rerender(<VistaAnual cuentaId="test-id" año={2023} />)

    await waitFor(() => {
      const monthlyLinks = screen.getAllByText('Ver detalles')
      expect(monthlyLinks[0].closest('a')).toHaveAttribute(
        'href', 
        '/cuentas/test-id/mensual/2023-01'
      )
    })
  })

  it('should maintain navigation state across views', () => {
    const monthPicker = render(
      <MonthPicker 
        value={new Date('2023-12-01')} 
        onChange={jest.fn()} 
      />
    )

    expect(monthPicker.getByText('diciembre 2023')).toBeInTheDocument()

    const yearSelector = render(
      <YearSelector 
        value={2023} 
        onChange={jest.fn()} 
      />
    )

    expect(yearSelector.getByText('2023')).toBeInTheDocument()
  })
})