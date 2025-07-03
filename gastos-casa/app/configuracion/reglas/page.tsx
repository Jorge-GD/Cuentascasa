'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TestTube } from 'lucide-react'
import { ReglaEditor } from '@/components/reglas/regla-editor'
import { ReglaTest } from '@/components/reglas/regla-test'
import { ReglaList } from '@/components/reglas/regla-list'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import type { ReglaCategorizacion } from '@/lib/types/database'

export default function ReglasConfigPage() {
  const [reglas, setReglas] = useState<ReglaCategorizacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [showTester, setShowTester] = useState(false)
  const [editingRegla, setEditingRegla] = useState<ReglaCategorizacion | null>(null)
  const { cuentaActiva } = useCuentaStore()

  const fetchReglas = async () => {
    try {
      const url = cuentaActiva
        ? `/api/reglas?cuentaId=${cuentaActiva.id}`
        : '/api/reglas'
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setReglas(result.data)
      } else {
        console.error('Error fetching reglas:', result.error)
      }
    } catch (error) {
      console.error('Error fetching reglas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReglas()
  }, [cuentaActiva])

  const handleCreateRegla = () => {
    setEditingRegla(null)
    setShowEditor(true)
  }

  const handleEditRegla = (regla: ReglaCategorizacion) => {
    setEditingRegla(regla)
    setShowEditor(true)
  }

  const handleDeleteRegla = async (reglaId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta regla?')) {
      return
    }

    try {
      const response = await fetch(`/api/reglas/${reglaId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await fetchReglas()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting regla:', error)
      alert('Error al eliminar la regla')
    }
  }

  const handleToggleRegla = async (reglaId: string, activa: boolean) => {
    try {
      const response = await fetch(`/api/reglas/${reglaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activa })
      })

      const result = await response.json()

      if (result.success) {
        await fetchReglas()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating regla:', error)
      alert('Error al actualizar la regla')
    }
  }

  const handleSaveRegla = async () => {
    setShowEditor(false)
    setEditingRegla(null)
    await fetchReglas()
  }

  const handleCancelEditor = () => {
    setShowEditor(false)
    setEditingRegla(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configuración de Reglas</h1>
        <p className="text-muted-foreground mt-2">
          Define reglas automáticas para categorizar tus movimientos bancarios.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Header con botones de acción */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reglas de Categorización</CardTitle>
                <CardDescription>
                  Las reglas se aplican automáticamente cuando importas movimientos. 
                  {cuentaActiva && ` Mostrando reglas para: ${cuentaActiva.nombre}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTester(!showTester)}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Probar Reglas
                </Button>
                <Button onClick={handleCreateRegla} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Regla
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Probador de reglas */}
        {showTester && (
          <Card>
            <CardHeader>
              <CardTitle>Probador de Reglas</CardTitle>
              <CardDescription>
                Prueba cómo se categorizaría una descripción con las reglas actuales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReglaTest cuentaId={cuentaActiva?.id} />
            </CardContent>
          </Card>
        )}

        {/* Editor de reglas */}
        {showEditor && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingRegla ? 'Editar Regla' : 'Nueva Regla'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReglaEditor
                regla={editingRegla}
                cuentaId={cuentaActiva?.id}
                onSave={handleSaveRegla}
                onCancel={handleCancelEditor}
              />
            </CardContent>
          </Card>
        )}

        {/* Lista de reglas */}
        <Card>
          <CardHeader>
            <CardTitle>Reglas Existentes</CardTitle>
            <CardDescription>
              {reglas.length} regla{reglas.length !== 1 ? 's' : ''} configurada{reglas.length !== 1 ? 's' : ''}
              {reglas.filter(r => r.activa).length !== reglas.length && 
                ` (${reglas.filter(r => r.activa).length} activa${reglas.filter(r => r.activa).length !== 1 ? 's' : ''})`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReglaList
              reglas={reglas}
              isLoading={isLoading}
              onEdit={handleEditRegla}
              onDelete={handleDeleteRegla}
              onToggle={handleToggleRegla}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}