'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Plus, Download, Filter } from 'lucide-react'
import { MovimientosTable } from '@/components/movimientos/movimientos-table'
import { FilterBar } from '@/components/movimientos/filter-bar'
import { MovimientoModal } from '@/components/movimientos/movimiento-modal'
import { LoadingStates } from '@/components/common/loading-states'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { toastUtils } from '@/lib/utils/toast'
import { format } from 'date-fns'
import type { Movimiento } from '@/lib/types/database'
import type { MovimientoFilters } from '@/lib/utils/filters'

interface PageProps {
  params: Promise<{ cuentaId: string }>
}

export default function MovimientosPage({ params }: PageProps) {
  const router = useRouter()
  const [cuentaId, setCuentaId] = useState<string>('')
  const [cuenta, setCuenta] = useState<any>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [filteredMovimientos, setFilteredMovimientos] = useState<Movimiento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Extract cuentaId from params
  useEffect(() => {
    params.then(({ cuentaId }) => {
      setCuentaId(cuentaId)
    })
  }, [params])

  // Fetch account and movements data
  useEffect(() => {
    if (!cuentaId) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch account details
        const cuentaResponse = await fetch(`/api/cuentas/${cuentaId}`)
        if (!cuentaResponse.ok) {
          throw new Error('Failed to fetch account')
        }
        const cuentaResult = await cuentaResponse.json()
        if (!cuentaResult.success) {
          throw new Error(cuentaResult.error)
        }
        setCuenta(cuentaResult.data)

        // Fetch movements
        const movimientosResponse = await fetch(`/api/movimientos?cuentaId=${cuentaId}`)
        if (!movimientosResponse.ok) {
          throw new Error('Failed to fetch movements')
        }
        const movimientosResult = await movimientosResponse.json()
        if (!movimientosResult.success) {
          throw new Error(movimientosResult.error)
        }
        setMovimientos(movimientosResult.data)
        setFilteredMovimientos(movimientosResult.data)

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [cuentaId])

  const handleFiltersChange = (filters: MovimientoFilters, filtered: Movimiento[]) => {
    setFilteredMovimientos(filtered)
  }

  const handleEditMovimiento = (movimiento: Movimiento) => {
    setEditingMovimiento(movimiento)
  }

  const handleCreateMovimiento = () => {
    setIsCreatingNew(true)
  }

  const handleMovimientoSaved = async (updatedMovimiento: Movimiento) => {
    // Refresh movements list
    try {
      const response = await fetch(`/api/movimientos?cuentaId=${cuentaId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMovimientos(result.data)
          setFilteredMovimientos(result.data)
        }
      }
    } catch (error) {
      console.error('Error refreshing movements:', error)
    }
    
    setEditingMovimiento(null)
    setIsCreatingNew(false)
  }

  const handleMovimientoDeleted = async () => {
    // Refresh movements list
    try {
      const response = await fetch(`/api/movimientos?cuentaId=${cuentaId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMovimientos(result.data)
          setFilteredMovimientos(result.data)
        }
      }
    } catch (error) {
      console.error('Error refreshing movements:', error)
    }
    
    setEditingMovimiento(null)
  }

  const handleExportMovimientos = () => {
    if (filteredMovimientos.length === 0) {
      toastUtils.warning('No hay movimientos para exportar', {
        description: 'Ajusta los filtros para incluir movimientos en la exportación'
      })
      return
    }

    try {
      // Preparar datos para CSV
      const csvData = filteredMovimientos.map(mov => ({
        Fecha: format(new Date(mov.fecha), 'dd/MM/yyyy'),
        Concepto: mov.descripcion,
        Importe: mov.importe,
        Categoria: mov.categoria || 'Sin categoría',
        Tipo: mov.importe >= 0 ? 'Ingreso' : 'Gasto'
      }))

      // Crear CSV
      const csvHeader = Object.keys(csvData[0]).join(',')
      const csvRows = csvData.map(row => Object.values(row).join(','))
      const csvContent = [csvHeader, ...csvRows].join('\n')

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `movimientos-${cuenta?.nombre || 'cuenta'}-${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()

      toastUtils.success('Exportación completada', {
        description: `Se exportaron ${filteredMovimientos.length} movimientos`
      })
    } catch (error) {
      toastUtils.error('Error al exportar', {
        description: 'No se pudo generar el archivo de exportación'
      })
    }
  }

  if (isLoading) {
    return <LoadingStates.Movimientos />
  }

  if (!cuenta) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Cuenta no encontrada</h1>
          <p className="text-muted-foreground mt-2">
            La cuenta solicitada no existe o no tienes permisos para verla.
          </p>
          <Button 
            onClick={() => router.push('/cuentas')} 
            className="mt-4"
          >
            Volver a Cuentas
          </Button>
        </div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Cuentas', href: '/cuentas' },
    { label: cuenta.nombre, href: `/cuentas/${cuentaId}` },
    { label: 'Movimientos', current: true }
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Movimientos - {cuenta.nombre}
          </h1>
          <p className="text-muted-foreground">
            Gestiona y consulta todos los movimientos de esta cuenta
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMovimientos}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button
            size="sm"
            onClick={handleCreateMovimiento}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMovimientos.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredMovimientos
                .filter(m => m.importe > 0)
                .reduce((sum, m) => sum + m.importe, 0)
                .toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Math.abs(filteredMovimientos
                .filter(m => m.importe < 0)
                .reduce((sum, m) => sum + m.importe, 0))
                .toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              filteredMovimientos.reduce((sum, m) => sum + m.importe, 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {filteredMovimientos
                .reduce((sum, m) => sum + m.importe, 0)
                .toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Filtra los movimientos por fecha, categoría, importe y más
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FilterBar
              movimientos={movimientos}
              onFiltersChange={handleFiltersChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
          <CardDescription>
            Lista completa de movimientos con opciones de edición
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovimientosTable
            movimientos={filteredMovimientos}
            onEditMovimiento={handleEditMovimiento}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      {(editingMovimiento || isCreatingNew) && (
        <MovimientoModal
          movimiento={editingMovimiento}
          cuentaId={cuentaId}
          isOpen={!!(editingMovimiento || isCreatingNew)}
          onClose={() => {
            setEditingMovimiento(null)
            setIsCreatingNew(false)
          }}
          onSave={handleMovimientoSaved}
          onDelete={editingMovimiento ? handleMovimientoDeleted : undefined}
        />
      )}
    </div>
  )
}