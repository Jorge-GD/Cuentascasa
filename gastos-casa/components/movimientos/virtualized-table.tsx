'use client'

import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency } from '@/lib/analytics/calculations'
import { Badge } from '@/components/ui/badge'
import type { Movimiento } from '@/lib/types/database'

interface VirtualizedTableProps {
  movimientos: Movimiento[]
  onEditMovimiento: (movimiento: Movimiento) => void
}

export function VirtualizedTable({ movimientos, onEditMovimiento }: VirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: movimientos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Altura estimada de cada fila
    overscan: 10, // Elementos extra a renderizar fuera del viewport
  })

  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: es })
  }

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      'Alimentación': 'bg-green-100 text-green-800',
      'Transporte': 'bg-blue-100 text-blue-800',
      'Salidas': 'bg-purple-100 text-purple-800',
      'Gastos Fijos': 'bg-red-100 text-red-800',
      'Compras Online': 'bg-orange-100 text-orange-800',
      'Bizum': 'bg-pink-100 text-pink-800',
      'Transferencias': 'bg-gray-100 text-gray-800',
      'Ingresos': 'bg-emerald-100 text-emerald-800',
      'Efectivo': 'bg-yellow-100 text-yellow-800',
      'Suscripciones': 'bg-indigo-100 text-indigo-800',
    }
    return colors[categoria] || 'bg-gray-100 text-gray-800'
  }

  const items = virtualizer.getVirtualItems()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-3 bg-muted font-medium text-sm border-b">
        <div>Fecha</div>
        <div className="col-span-2">Descripción</div>
        <div className="text-right">Importe</div>
        <div>Categoría</div>
        <div className="text-center">Acciones</div>
      </div>

      {/* Virtualized list container */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto border rounded-md"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualItem) => {
            const movimiento = movimientos[virtualItem.index]
            if (!movimiento) return null

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="grid grid-cols-6 gap-4 p-3 border-b hover:bg-muted/50 transition-colors"
              >
                {/* Fecha */}
                <div className="flex items-center">
                  <span className="font-medium text-sm">
                    {formatDate(movimiento.fecha)}
                  </span>
                </div>

                {/* Descripción */}
                <div className="col-span-2 flex items-center">
                  <div className="min-w-0">
                    <div className="font-medium truncate text-sm">
                      {movimiento.descripcion}
                    </div>
                    {movimiento.esManual && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Manual
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Importe */}
                <div className="flex items-center justify-end">
                  <span className={`font-medium text-sm ${
                    movimiento.importe > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(movimiento.importe)}
                  </span>
                </div>

                {/* Categoría */}
                <div className="flex items-center">
                  <div className="space-y-1">
                    <Badge className={getCategoriaColor(movimiento.categoria)}>
                      {movimiento.categoria}
                    </Badge>
                    {movimiento.subcategoria && (
                      <div className="text-xs text-muted-foreground">
                        {movimiento.subcategoria}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => onEditMovimiento(movimiento)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-sm text-muted-foreground">
        Mostrando {items.length} de {movimientos.length} movimientos (virtualizado)
      </div>
    </div>
  )
}