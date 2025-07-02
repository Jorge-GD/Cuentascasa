import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MoneyDisplay } from '@/components/ui/money-display'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de tus gastos y estadísticas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gastos este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <MoneyDisplay amount={-1234.56} size="lg" />
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <MoneyDisplay amount={2500.00} size="lg" />
            </div>
            <p className="text-xs text-muted-foreground">
              Nómina del mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cuentas activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Jorge, Violeta, Casa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Último movimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ayer</div>
            <p className="text-xs text-muted-foreground">
              Mercadona - <MoneyDisplay amount={-45.67} showSign={false} />
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximamente</CardTitle>
            <CardDescription>
              Gráficos de gastos por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              Gráfico de categorías
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximamente</CardTitle>
            <CardDescription>
              Evolución mensual de gastos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              Gráfico temporal
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}