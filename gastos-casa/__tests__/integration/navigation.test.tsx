import { render, screen } from '@testing-library/react'
import { Sidebar } from '../../components/layout/sidebar'
import { Header } from '../../components/layout/header'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('Navigation Components', () => {
  describe('Sidebar', () => {
    it('should render main navigation items', () => {
      render(<Sidebar />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Cuentas')).toBeInTheDocument()
      expect(screen.getByText('Importar')).toBeInTheDocument()
      expect(screen.getByText('Configuración')).toBeInTheDocument()
    })

    it('should highlight active route', () => {
      render(<Sidebar />)
      
      // Dashboard should be highlighted since we mocked the path to /dashboard
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink?.parentElement).toHaveClass('bg-muted')
    })
  })

  describe('Header', () => {
    it('should render header with title and actions', () => {
      render(<Header />)
      
      expect(screen.getByText('Gastos Casa')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /perfil/i })).toBeInTheDocument()
    })
  })
})

describe('UI Components', () => {
  it('should render money display correctly', async () => {
    const { MoneyDisplay } = await import('../../components/ui/money-display')
    
    render(<MoneyDisplay amount={-123.45} />)
    expect(screen.getByText('-123,45 €')).toBeInTheDocument()

    render(<MoneyDisplay amount={123.45} />)
    expect(screen.getByText('+123,45 €')).toBeInTheDocument()
  })
})