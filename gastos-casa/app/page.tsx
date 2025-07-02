import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido a Gastos Casa</h1>
        <p className="text-muted-foreground">
          Gestiona tus gastos domésticos de manera fácil y eficiente
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              Ve un resumen de todos tus gastos y estadísticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Ir al Dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas</CardTitle>
            <CardDescription>
              Gestiona tus cuentas bancarias y movimientos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/cuentas">Ver Cuentas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importar Extractos</CardTitle>
            <CardDescription>
              Sube tus extractos bancarios para procesar automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/importar">Importar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}