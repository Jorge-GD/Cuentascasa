'use client'

import { useState, useMemo, useCallback, memo, Suspense } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table'
import { VirtualizedTable } from './virtualized-table'
import { TableSkeleton } from '@/components/common/loading-states'
import { NoSearchResultsEmpty } from '@/components/ui/empty-states'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowUpDown, ChevronDown, Edit, MoreHorizontal, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Movimiento } from '@/lib/types/database'

interface MovimientosTableProps {
  movimientos: Movimiento[]
  onEditMovimiento: (movimiento: Movimiento) => void
  onDeleteMovimiento?: (movimientoId: string) => void
  isLoading?: boolean
}

function MovimientosTableComponent({ movimientos, onEditMovimiento, onDeleteMovimiento, isLoading }: MovimientosTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'fecha', desc: true } // Default: newest first
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }, [])

  const formatDate = useCallback((date: string | Date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: es })
  }, [])

  const getCategoriaColor = useCallback((categoria: string) => {
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
  }, [])

  const columns = useMemo<ColumnDef<Movimiento>[]>(() => [
    {
      accessorKey: 'fecha',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {formatDate(row.getValue('fecha'))}
        </div>
      ),
      sortingFn: (a, b) => {
        const dateA = new Date(a.getValue('fecha'))
        const dateB = new Date(b.getValue('fecha'))
        return dateA.getTime() - dateB.getTime()
      }
    },
    {
      accessorKey: 'descripcion',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Descripción
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="font-medium truncate">
            {row.getValue('descripcion')}
          </div>
          {row.original.esManual && (
            <Badge variant="outline" className="mt-1 text-xs">
              Manual
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'importe',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Importe
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const importe = row.getValue('importe') as number
        return (
          <div className={`font-medium ${
            importe > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(importe)}
          </div>
        )
      },
      sortingFn: (a, b) => {
        const importeA = a.getValue('importe') as number
        const importeB = b.getValue('importe') as number
        return importeA - importeB
      }
    },
    {
      accessorKey: 'saldo',
      header: 'Saldo',
      cell: ({ row }) => {
        const saldo = row.getValue('saldo') as number | null
        return saldo ? (
          <div className="text-muted-foreground">
            {formatCurrency(saldo)}
          </div>
        ) : (
          <div className="text-muted-foreground">-</div>
        )
      },
    },
    {
      accessorKey: 'categoria',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Categoría
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const categoria = row.getValue('categoria') as string
        const subcategoria = row.original.subcategoria
        
        return (
          <div className="space-y-1">
            <Badge className={getCategoriaColor(categoria)}>
              {categoria}
            </Badge>
            {subcategoria && (
              <div className="text-xs text-muted-foreground">
                {subcategoria}
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const movimiento = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onEditMovimiento(movimiento)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(movimiento.descripcion)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onDeleteMovimiento && (
                <DeleteConfirmDialog
                  itemName={`Movimiento de ${formatCurrency(movimiento.importe)}`}
                  itemType="movimiento"
                  onConfirm={() => onDeleteMovimiento(movimiento.id)}
                >
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DeleteConfirmDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [onEditMovimiento, formatCurrency, formatDate, getCategoriaColor])

  const table = useReactTable({
    data: movimientos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination,
    },
  })

  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex + 1

  if (isLoading) {
    return <TableSkeleton rows={8} />
  }

  if (movimientos.length === 0) {
    return <NoSearchResultsEmpty />
  }

  // Usar virtualización para listas grandes (>500 elementos)
  if (movimientos.length > 500) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Lista virtualizada para mejor rendimiento ({movimientos.length} movimientos)
          </div>
        </div>
        <Suspense fallback={
          <div className="h-[600px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Cargando tabla virtualizada...
            </div>
          </div>
        }>
          <VirtualizedTable 
            movimientos={movimientos} 
            onEditMovimiento={onEditMovimiento}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay movimientos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Mostrando {table.getRowModel().rows.length} de {movimientos.length} movimientos
          </span>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Filas por página</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Página {currentPage} de {pageCount}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Ir a la última página</span>
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoizar el componente para evitar re-renders innecesarios
export const MovimientosTable = memo(MovimientosTableComponent, (prevProps, nextProps) => {
  // Comparación personalizada para optimizar re-renders
  if (prevProps.isLoading !== nextProps.isLoading) return false
  if (prevProps.onEditMovimiento !== nextProps.onEditMovimiento) return false
  
  // Comparación de movimientos por longitud y referencia
  if (prevProps.movimientos.length !== nextProps.movimientos.length) return false
  if (prevProps.movimientos !== nextProps.movimientos) {
    // Comparación profunda solo si las referencias son diferentes
    return prevProps.movimientos.every((mov, idx) => 
      mov.id === nextProps.movimientos[idx]?.id &&
      mov.fecha === nextProps.movimientos[idx]?.fecha &&
      mov.importe === nextProps.movimientos[idx]?.importe &&
      mov.categoria === nextProps.movimientos[idx]?.categoria
    )
  }
  
  return true
})