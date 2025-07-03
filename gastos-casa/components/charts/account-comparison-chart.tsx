'use client'

import { memo, useCallback } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { formatCurrency } from '@/lib/analytics/calculations'
import type { AccountComparisonData } from '@/lib/analytics/metrics'

interface AccountComparisonChartProps {
  data: AccountComparisonData
  height?: number
}

function AccountComparisonChartComponent({ data, height = 400 }: AccountComparisonChartProps) {
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cuenta = data.cuentas.find(c => c.nombre === label)
      if (!cuenta) return null

      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{cuenta.nombre}</p>
          <div className="space-y-1">
            <p className="text-sm text-red-600">
              Gastos: {formatCurrency(cuenta.gastos)} ({cuenta.porcentajeGastos.toFixed(1)}%)
            </p>
            <p className="text-sm text-green-600">
              Ingresos: {formatCurrency(cuenta.ingresos)} ({cuenta.porcentajeIngresos.toFixed(1)}%)
            </p>
            <p className="text-sm text-blue-600">
              Balance: {formatCurrency(cuenta.balance)}
            </p>
            <p className="text-xs text-muted-foreground">
              {cuenta.transacciones} transacciones
            </p>
          </div>
        </div>
      )
    }
    return null
  }, [data.cuentas])

  if (!data || !data.cuentas || data.cuentas.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No hay datos de comparación para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data.cuentas}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="nombre"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `€${Math.abs(value)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="gastos" 
            fill="#ef4444" 
            name="Gastos"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="ingresos" 
            fill="#22c55e" 
            name="Ingresos"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Resumen totales */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Totales Generales</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-red-600 font-semibold">
              {formatCurrency(data.totales.gastos)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total gastos
            </div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-green-600 font-semibold">
              {formatCurrency(data.totales.ingresos)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total ingresos
            </div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-blue-600 font-semibold">
              {formatCurrency(data.totales.balance)}
            </div>
            <div className="text-xs text-muted-foreground">
              Balance total
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-gray-600 font-semibold">
              {data.totales.transacciones}
            </div>
            <div className="text-xs text-muted-foreground">
              Total transacciones
            </div>
          </div>
        </div>
      </div>

      {/* Desglose por cuenta */}
      <div className="space-y-2">
        <h4 className="font-medium">Desglose por Cuenta</h4>
        <div className="space-y-3">
          {data.cuentas.map((cuenta, index) => (
            <div 
              key={cuenta.id} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{cuenta.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {cuenta.transacciones} transacciones
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm text-right">
                <div>
                  <div className="text-red-600 font-semibold">
                    {formatCurrency(cuenta.gastos)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cuenta.porcentajeGastos.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-green-600 font-semibold">
                    {formatCurrency(cuenta.ingresos)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cuenta.porcentajeIngresos.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className={`font-semibold ${
                    cuenta.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(cuenta.balance)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Balance
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Memoizar el gráfico de comparación de cuentas
export const AccountComparisonChart = memo(AccountComparisonChartComponent, (prevProps, nextProps) => {
  if (prevProps.height !== nextProps.height) return false
  if (!prevProps.data && !nextProps.data) return true
  if (!prevProps.data || !nextProps.data) return false
  
  // Comparar datos de cuentas
  const prevCuentas = prevProps.data.cuentas || []
  const nextCuentas = nextProps.data.cuentas || []
  
  if (prevCuentas.length !== nextCuentas.length) return false
  
  // Comparar totales
  const prevTotales = prevProps.data.totales
  const nextTotales = nextProps.data.totales
  
  if (prevTotales.gastos !== nextTotales.gastos ||
      prevTotales.ingresos !== nextTotales.ingresos ||
      prevTotales.balance !== nextTotales.balance) return false
  
  // Comparar cada cuenta
  return prevCuentas.every((cuenta, idx) => {
    const nextCuenta = nextCuentas[idx]
    return nextCuenta &&
           cuenta.id === nextCuenta.id &&
           cuenta.gastos === nextCuenta.gastos &&
           cuenta.ingresos === nextCuenta.ingresos &&
           cuenta.balance === nextCuenta.balance
  })
})