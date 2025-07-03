import { Home, CreditCard, Upload, Settings, BarChart3, FileText, Target } from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: any
  badge?: string
  children?: NavItem[]
}

export const mainNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Cuentas',
    href: '/cuentas',
    icon: CreditCard,
    children: [
      {
        title: 'Todas las cuentas',
        href: '/cuentas',
        icon: CreditCard,
      },
      {
        title: 'Nueva cuenta',
        href: '/cuentas/nueva',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'Importar',
    href: '/importar',
    icon: Upload,
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    children: [
      {
        title: 'Categorías',
        href: '/configuracion/categorias',
        icon: BarChart3,
      },
      {
        title: 'Reglas',
        href: '/configuracion/reglas',
        icon: FileText,
      },
      {
        title: 'Presupuestos',
        href: '/configuracion/presupuestos',
        icon: Target,
      },
      {
        title: 'Backup',
        href: '/configuracion/backup',
        icon: FileText,
      },
    ],
  },
]

export const routes = {
  dashboard: '/dashboard',
  cuentas: {
    index: '/cuentas',
    new: '/cuentas/nueva',
    detail: (id: string) => `/cuentas/${id}`,
    monthly: (id: string, year: number, month: number) => `/cuentas/${id}/mensual/${year}/${month}`,
    annual: (id: string, year: number) => `/cuentas/${id}/anual/${year}`,
  },
  importar: '/importar',
  configuracion: {
    index: '/configuracion',
    categorias: '/configuracion/categorias',
    reglas: '/configuracion/reglas',
    presupuestos: '/configuracion/presupuestos',
    backup: '/configuracion/backup',
  },
} as const