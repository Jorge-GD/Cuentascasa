'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Home,
  CreditCard,
  TrendingUp,
  Settings,
  Upload,
  Filter,
  Plus,
  Calendar,
  BarChart3,
  FileText,
  Bell,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toastUtils } from '@/lib/utils/toast'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  section: string
  keywords?: string[]
  shortcut?: string
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [searchValue, setSearchValue] = useState('')

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Ir al Dashboard',
      description: 'Ver resumen de gastos y métricas',
      icon: Home,
      action: () => router.push('/'),
      section: 'Navegación',
      keywords: ['inicio', 'home', 'resumen']
    },
    {
      id: 'nav-cuentas',
      title: 'Ver Cuentas',
      description: 'Gestionar cuentas bancarias',
      icon: CreditCard,
      action: () => router.push('/cuentas'),
      section: 'Navegación',
      keywords: ['bancos', 'accounts']
    },
    {
      id: 'nav-movimientos',
      title: 'Ver Movimientos',
      description: 'Lista de todas las transacciones',
      icon: TrendingUp,
      action: () => router.push('/movimientos'),
      section: 'Navegación',
      keywords: ['transacciones', 'gastos', 'ingresos']
    },
    {
      id: 'nav-configuracion',
      title: 'Configuración',
      description: 'Ajustes y preferencias',
      icon: Settings,
      action: () => router.push('/configuracion'),
      section: 'Navegación',
      keywords: ['settings', 'ajustes', 'preferencias']
    },

    // Actions
    {
      id: 'action-new-cuenta',
      title: 'Nueva Cuenta',
      description: 'Crear una nueva cuenta bancaria',
      icon: Plus,
      action: () => router.push('/cuentas/nueva'),
      section: 'Acciones',
      keywords: ['crear', 'añadir', 'banco']
    },
    {
      id: 'action-import',
      title: 'Importar CSV',
      description: 'Subir movimientos desde archivo',
      icon: Upload,
      action: () => router.push('/import'),
      section: 'Acciones',
      keywords: ['subir', 'archivo', 'csv']
    },
    {
      id: 'action-export',
      title: 'Exportar Datos',
      description: 'Descargar movimientos en CSV',
      icon: FileText,
      action: () => {
        // Navigate to a page that can export
        router.push('/movimientos')
        toastUtils.info('Exportación', {
          description: 'Usa el botón Exportar en la página de movimientos'
        })
      },
      section: 'Acciones',
      keywords: ['descargar', 'backup', 'csv']
    },

    // Theme
    {
      id: 'theme-light',
      title: 'Tema Claro',
      description: 'Cambiar a modo claro',
      icon: Sun,
      action: () => setTheme('light'),
      section: 'Tema',
      keywords: ['light', 'claro', 'día']
    },
    {
      id: 'theme-dark',
      title: 'Tema Oscuro',
      description: 'Cambiar a modo oscuro',
      icon: Moon,
      action: () => setTheme('dark'),
      section: 'Tema',
      keywords: ['dark', 'oscuro', 'noche']
    },
    {
      id: 'theme-system',
      title: 'Tema del Sistema',
      description: 'Usar configuración del sistema',
      icon: Monitor,
      action: () => setTheme('system'),
      section: 'Tema',
      keywords: ['sistema', 'auto', 'automático']
    },

    // Quick filters
    {
      id: 'filter-this-month',
      title: 'Movimientos del Mes',
      description: 'Ver gastos del mes actual',
      icon: Calendar,
      action: () => {
        const currentDate = new Date()
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        router.push(`/movimientos?month=${year}-${month}`)
      },
      section: 'Filtros Rápidos',
      keywords: ['mes', 'actual', 'filtro']
    },
    {
      id: 'filter-charts',
      title: 'Ver Gráficos',
      description: 'Análisis visual de gastos',
      icon: BarChart3,
      action: () => router.push('/dashboard#charts'),
      section: 'Filtros Rápidos',
      keywords: ['gráficos', 'estadísticas', 'análisis']
    }
  ]

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    command.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
    command.keywords?.some(keyword => 
      keyword.toLowerCase().includes(searchValue.toLowerCase())
    )
  )

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    const section = command.section
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(command)
    return acc
  }, {} as Record<string, CommandItem[]>)

  const handleSelectCommand = useCallback((command: CommandItem) => {
    command.action()
    onClose()
    setSearchValue('')
  }, [onClose])

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput 
          placeholder="Buscar o ejecutar comando..." 
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList>
          <CommandEmpty>
            <div className="text-center py-6">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No se encontraron comandos para "{searchValue}"
              </p>
            </div>
          </CommandEmpty>
          
          {Object.entries(groupedCommands).map(([section, items], index) => (
            <div key={section}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={section}>
                {items.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.title}
                    onSelect={() => handleSelectCommand(command)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  >
                    <command.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{command.title}</div>
                      {command.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {command.description}
                        </div>
                      )}
                    </div>
                    {command.shortcut && (
                      <Badge variant="outline" className="text-xs">
                        {command.shortcut}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

// Hook to manage command palette state
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false)
  }
}