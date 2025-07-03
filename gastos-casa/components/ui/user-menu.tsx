'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Settings,
  HelpCircle,
  LogOut,
  CreditCard,
  FileText,
  Shield,
  Palette,
  Database,
  Download,
  Upload,
  Bell
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toastUtils } from '@/lib/utils/toast'

interface UserMenuProps {
  userName?: string
  userEmail?: string
  userInitials?: string
}

export function UserMenu({ 
  userName = "Usuario",
  userEmail = "usuario@ejemplo.com",
  userInitials = "U"
}: UserMenuProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleNavigation = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  const handleLogout = () => {
    // Simulate logout
    toastUtils.success('Sesión cerrada', {
      description: 'Has cerrado sesión correctamente'
    })
    setIsOpen(false)
    // In a real app, clear auth tokens and redirect
    // router.push('/login')
  }

  const handleExportData = () => {
    toastUtils.info('Exportando datos', {
      description: 'Preparando descarga de todos tus datos...'
    })
    setIsOpen(false)
    // Simulate export
    setTimeout(() => {
      toastUtils.success('Datos exportados', {
        description: 'Descarga iniciada correctamente'
      })
    }, 2000)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                Plan Básico
              </Badge>
              <Badge variant="outline" className="text-xs">
                {theme === 'dark' ? 'Modo Oscuro' : theme === 'light' ? 'Modo Claro' : 'Tema Sistema'}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleNavigation('/perfil')}>
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/cuentas')}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Mis Cuentas</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/configuracion')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
            <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleNavigation('/configuracion/notificaciones')}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notificaciones</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/configuracion/temas')}>
            <Palette className="mr-2 h-4 w-4" />
            <span>Personalización</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/configuracion/privacidad')}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Privacidad y Datos</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleNavigation('/import')}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Importar Datos</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            <span>Exportar Todos los Datos</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/backup')}>
            <Database className="mr-2 h-4 w-4" />
            <span>Copia de Seguridad</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleNavigation('/ayuda')}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Ayuda y Soporte</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/documentacion')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Documentación</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Component for user profile section in settings
export function UserProfileSection({ 
  userName = "Usuario",
  userEmail = "usuario@ejemplo.com"
}: UserMenuProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 className="text-lg font-medium">{userName}</h3>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Plan Básico</Badge>
            <Button variant="outline" size="sm">
              Actualizar Plan
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="font-medium">Cuentas</dt>
          <dd className="text-muted-foreground">3 cuentas bancarias</dd>
        </div>
        <div>
          <dt className="font-medium">Movimientos</dt>
          <dd className="text-muted-foreground">1,247 transacciones</dd>
        </div>
        <div>
          <dt className="font-medium">Último acceso</dt>
          <dd className="text-muted-foreground">Hace 2 minutos</dd>
        </div>
        <div>
          <dt className="font-medium">Miembro desde</dt>
          <dd className="text-muted-foreground">Enero 2024</dd>
        </div>
      </div>
    </div>
  )
}