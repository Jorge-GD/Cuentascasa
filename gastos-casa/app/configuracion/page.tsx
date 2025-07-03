'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  Tags, 
  Filter, 
  Target,
  Database,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

const configSections = [
  {
    title: 'Categorías',
    description: 'Gestiona las categorías de gastos e ingresos',
    icon: Tags,
    href: '/configuracion/categorias',
    color: 'bg-blue-500'
  },
  {
    title: 'Reglas de Categorización',
    description: 'Configura reglas automáticas para categorizar movimientos',
    icon: Filter,
    href: '/configuracion/reglas',
    color: 'bg-green-500'
  },
  {
    title: 'Presupuestos',
    description: 'Define y controla tus presupuestos mensuales',
    icon: Target,
    href: '/configuracion/presupuestos',
    color: 'bg-orange-500'
  },
  {
    title: 'Backup y Restauración',
    description: 'Exporta e importa copias de seguridad de tus datos',
    icon: Database,
    href: '/configuracion/backup',
    color: 'bg-purple-500'
  }
]

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Gestiona la configuración de tu aplicación de gastos
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {configSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.href} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={section.href} className="flex items-center justify-between">
                    Configurar
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Versión</span>
            <span className="text-sm font-medium">2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Base de datos</span>
            <span className="text-sm font-medium">SQLite</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Última actualización</span>
            <span className="text-sm font-medium">{new Date().toLocaleDateString('es-ES')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}