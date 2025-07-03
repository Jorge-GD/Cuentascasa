'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CategoriaForm } from '@/components/categorias/categoria-form'
import { CategoriaList } from '@/components/categorias/categoria-list'
import type { CategoriaWithSubcategorias } from '@/lib/types/database'

export default function CategoriasConfigPage() {
  const [categorias, setCategorias] = useState<CategoriaWithSubcategorias[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaWithSubcategorias | null>(null)

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/categorias')
      const result = await response.json()
      
      if (result.success) {
        setCategorias(result.data)
      } else {
        console.error('Error fetching categorias:', result.error)
      }
    } catch (error) {
      console.error('Error fetching categorias:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategorias()
  }, [])

  const handleCreateCategoria = () => {
    setEditingCategoria(null)
    setShowForm(true)
  }

  const handleEditCategoria = (categoria: CategoriaWithSubcategorias) => {
    setEditingCategoria(categoria)
    setShowForm(true)
  }

  const handleDeleteCategoria = async (categoriaId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      return
    }

    try {
      const response = await fetch(`/api/categorias/${categoriaId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await fetchCategorias()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting categoria:', error)
      alert('Error al eliminar la categoría')
    }
  }

  const handleSaveCategoria = async () => {
    setShowForm(false)
    setEditingCategoria(null)
    await fetchCategorias()
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingCategoria(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configuración de Categorías</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las categorías personalizadas para clasificar tus movimientos bancarios.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Header con botón de crear */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Categorías Personalizadas</CardTitle>
                <CardDescription>
                  Crea y edita categorías para organizar mejor tus gastos e ingresos.
                </CardDescription>
              </div>
              <Button onClick={handleCreateCategoria} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva Categoría
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Formulario de creación/edición */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriaForm
                categoria={editingCategoria}
                onSave={handleSaveCategoria}
                onCancel={handleCancelForm}
              />
            </CardContent>
          </Card>
        )}

        {/* Lista de categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Categorías Existentes</CardTitle>
            <CardDescription>
              {categorias.length} categoría{categorias.length !== 1 ? 's' : ''} configurada{categorias.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoriaList
              categorias={categorias}
              isLoading={isLoading}
              onEdit={handleEditCategoria}
              onDelete={handleDeleteCategoria}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}