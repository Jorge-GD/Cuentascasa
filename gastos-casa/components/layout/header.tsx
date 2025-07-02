'use client'

import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <div className="flex items-center space-x-2">
            <span className="font-bold inline-block">
              Gastos Casa
            </span>
          </div>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
              <span className="sr-only">Buscar</span>
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notificaciones</span>
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-4 w-4" />
              <span className="sr-only">Perfil</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}