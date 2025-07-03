'use client'

import { useState } from 'react'
import { Search, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CuentaSelectorCompact } from '@/components/cuentas/cuenta-selector'
import { CuentaSelectorModal } from '@/components/cuentas/cuenta-selector-modal'
import { CommandPalette, useCommandPalette } from '@/components/ui/command-palette'
import { Notifications, useNotifications } from '@/components/ui/notifications'
import { UserMenu } from '@/components/ui/user-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function Header() {
  const commandPalette = useCommandPalette()
  const notifications = useNotifications()
  const [showCuentaSelector, setShowCuentaSelector] = useState(false)
  
  // Demo notifications - in real app these would come from an API/store
  useState(() => {
    // Add some demo notifications only once
    const hasDemo = typeof window !== 'undefined' ? localStorage.getItem('gastos-casa-demo-notifications') : null
    if (!hasDemo) {
      notifications.addNotification({
        title: 'Nuevo movimiento detectado',
        message: 'Se ha registrado un gasto de 45.50€ en Supermercado',
        type: 'info',
        action: {
          label: 'Ver movimiento',
          onClick: () => window.location.href = '/movimientos'
        }
      })
      
      notifications.addNotification({
        title: 'Presupuesto mensual',
        message: 'Has alcanzado el 80% de tu presupuesto de alimentación',
        type: 'warning',
        action: {
          label: 'Ver presupuesto',
          onClick: () => window.location.href = '/presupuestos'
        }
      })
      
      if (typeof window !== 'undefined') localStorage.setItem('gastos-casa-demo-notifications', 'true')
    }
  })

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <div className="flex items-center space-x-2">
              <span className="font-bold inline-block bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                Gastos Casa
              </span>
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                v2.0
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-1 items-center justify-end space-x-4">
            <CuentaSelectorCompact onChangeCuenta={() => setShowCuentaSelector(true)} />
            <nav className="flex items-center space-x-1">
              {/* Search / Command Palette */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={commandPalette.open}
                className={cn(
                  "gap-2 text-sm text-muted-foreground",
                  "hidden sm:flex sm:h-9 sm:px-3"
                )}
              >
                <Search className="h-4 w-4" />
                <span>Buscar...</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  ⌘K
                </Badge>
              </Button>
              
              {/* Mobile search button */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={commandPalette.open}
                className="sm:hidden"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Buscar</span>
              </Button>
              
              {/* Notifications */}
              <Notifications
                notifications={notifications.notifications}
                onMarkAsRead={notifications.markAsRead}
                onMarkAllAsRead={notifications.markAllAsRead}
                onDelete={notifications.deleteNotification}
                onClearAll={notifications.clearAll}
              />
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* User Menu */}
              <UserMenu
                userName="Usuario Demo"
                userEmail="demo@gastoscasa.com"
                userInitials="UD"
              />
            </nav>
          </div>
        </div>
      </header>
      
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
      />
      
      {/* Cuenta Selector Modal */}
      <CuentaSelectorModal
        isOpen={showCuentaSelector}
        onClose={() => setShowCuentaSelector(false)}
      />
    </>
  )
}