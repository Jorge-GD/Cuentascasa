'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, X, Edit, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CategorizationEditor } from '@/components/importar/categorization-editor'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'

interface PreviewTableProps {
  movimientos: CategorizedMovimiento[]
  onMovimientosChange: (movimientos: CategorizedMovimiento[]) => void
  onImportComplete: () => void
  isLoading: boolean
  onLoadingChange: (loading: boolean) => void
  cuentaId: string
  onReloadPreview?: () => void
}

export function PreviewTable({ 
  movimientos, 
  onMovimientosChange, 
  onImportComplete,
  isLoading,
  onLoadingChange,
  cuentaId,
  onReloadPreview
}: PreviewTableProps) {
  const [editingMovimiento, setEditingMovimiento] = useState<CategorizedMovimiento | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMovimientos, setSelectedMovimientos] = useState<Set<number>>(new Set())

  // Seleccionar automáticamente todos los movimientos cuando se cargan
  useEffect(() => {
    if (movimientos.length > 0 && selectedMovimientos.size === 0) {
      setSelectedMovimientos(new Set(movimientos.map((_, index) => index)))
    }
  }, [movimientos.length, selectedMovimientos.size])

  const categorizacionIncierta = movimientos.filter(m => m.confianza < 50)
  const confianzaBaja = movimientos.filter(m => m.confianza >= 50 && m.confianza < 70)

  const handleMovimientoUpdate = (index: number, updates: Partial<CategorizedMovimiento>) => {
    const updatedMovimientos = [...movimientos]
    updatedMovimientos[index] = { ...updatedMovimientos[index], ...updates }
    onMovimientosChange(updatedMovimientos)
  }

  const openEditModal = (movimiento: CategorizedMovimiento, index: number) => {
    setEditingMovimiento(movimiento)
    setEditingIndex(index)
    setModalOpen(true)
  }

  const closeEditModal = () => {
    setModalOpen(false)
    setEditingMovimiento(null)
    setEditingIndex(null)
  }

  const handleSaveMovimiento = (updates: Partial<CategorizedMovimiento>) => {
    if (editingIndex !== null) {
      handleMovimientoUpdate(editingIndex, updates)
    }
    closeEditModal()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMovimientos(new Set(movimientos.map((_, index) => index)))
    } else {
      setSelectedMovimientos(new Set())
    }
  }

  const handleSelectMovimiento = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedMovimientos)
    if (checked) {
      newSelected.add(index)
    } else {
      newSelected.delete(index)
    }
    setSelectedMovimientos(newSelected)
  }

  const handleImport = async () => {
    if (selectedMovimientos.size === 0) {
      return
    }

    onLoadingChange(true)
    
    try {
      const movimientosToImport = Array.from(selectedMovimientos)
        .map(index => movimientos[index])

      const response = await fetch('/api/importar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movimientos: movimientosToImport,
          cuentaId: cuentaId,
        }),
      })

      const result = await response.json()
      console.log('Resultado de importación:', result)

      if (!result.success) {
        console.error('Error en importación:', result.error)
        throw new Error(result.error || 'Error al importar movimientos')
      }

      // Mostrar información detallada del resultado
      let message = `✅ Importación completada:\n\n`
      message += `• ${result.data.imported} movimientos importados\n`
      
      if (result.data.skipped > 0) {
        message += `• ${result.data.skipped} movimientos duplicados saltados\n`
      }
      
      if (result.data.errors > 0) {
        message += `• ${result.data.errors} errores encontrados\n`
      }
      
      // Mostrar información sobre duplicados saltados
      if (result.data?.skippedDuplicates?.length > 0) {
        message += `\nDuplicados saltados:\n`
        const duplicatesInfo = result.data.skippedDuplicates
          .slice(0, 3) // Solo mostrar los primeros 3
          .map((dup: any) => `• ${dup.movimiento.substring(0, 50)}... (${dup.confidence}% confianza)`)
          .join('\n')
        message += duplicatesInfo
        
        if (result.data.skippedDuplicates.length > 3) {
          message += `\n... y ${result.data.skippedDuplicates.length - 3} más`
        }
      }
      
      // Mostrar errores si los hay
      if (result.data?.errorDetails?.length > 0) {
        message += `\nErrores encontrados:\n`
        const errorInfo = result.data.errorDetails
          .slice(0, 3)
          .map((err: any) => `• ${err.movimiento.substring(0, 50)}...: ${err.error}`)
          .join('\n')
        message += errorInfo
      }
      
      alert(message)
      onImportComplete()
    } catch (error) {
      console.error('Error importing movimientos:', error)
    } finally {
      onLoadingChange(false)
    }
  }

  const getConfianzaBadge = (confianza: number) => {
    if (confianza >= 80) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Alta ({confianza}%)</Badge>
    } else if (confianza >= 60) {
      return <Badge variant="secondary">Media ({confianza}%)</Badge>
    } else {
      return <Badge variant="destructive">Baja ({confianza}%)</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Alertas de resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-800">Total Movimientos</div>
          <div className="text-2xl font-bold text-blue-900">{movimientos.length}</div>
        </div>
        
        {confianzaBaja.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm font-medium text-yellow-800">Confianza Baja</div>
            <div className="text-2xl font-bold text-yellow-900">{confianzaBaja.length}</div>
          </div>
        )}
        
        {categorizacionIncierta.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-sm font-medium text-amber-800">Categorización Incierta</div>
            <div className="text-2xl font-bold text-amber-900">{categorizacionIncierta.length}</div>
          </div>
        )}
      </div>

      {categorizacionIncierta.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Se encontraron {categorizacionIncierta.length} movimientos con categorización incierta.
            Revisa y ajusta las categorías si es necesario.
          </AlertDescription>
        </Alert>
      )}

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedMovimientos.size === movimientos.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-muted-foreground">
            Seleccionar todos ({selectedMovimientos.size} de {movimientos.length})
          </span>
        </div>
        
        <Button
          onClick={handleImport}
          disabled={selectedMovimientos.size === 0 || isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? 'Importando...' : `Importar ${selectedMovimientos.size} movimientos`}
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Importe</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Confianza</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((movimiento, index) => (
              <TableRow key={index} className={movimiento.confianza < 50 ? 'bg-red-50' : ''}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedMovimientos.has(index)}
                    onChange={(e) => handleSelectMovimiento(index, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableCell>
                <TableCell>
                  {format(new Date(movimiento.fecha), 'dd/MM/yyyy', { locale: es })}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={movimiento.descripcion}>
                  {movimiento.descripcion}
                </TableCell>
                <TableCell className={movimiento.importe > 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(movimiento.importe)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{movimiento.categoriaDetectada}</div>
                    {movimiento.subcategoriaDetectada && (
                      <div className="text-sm text-muted-foreground">
                        {movimiento.subcategoriaDetectada}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getConfianzaBadge(movimiento.confianza)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(movimiento, index)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de edición único */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        if (!open) {
          closeEditModal()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categorización</DialogTitle>
            <DialogDescription>
              Modifica la categoría y subcategoría del movimiento seleccionado
            </DialogDescription>
          </DialogHeader>
          {editingMovimiento && (
            <CategorizationEditor
              movimiento={editingMovimiento}
              onSave={handleSaveMovimiento}
              onCancel={closeEditModal}
              onRuleCreated={onReloadPreview}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}