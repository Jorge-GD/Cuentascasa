'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Edit2, Trash2, DollarSign, Tag } from 'lucide-react'
import type { CategoriaWithSubcategorias } from '@/lib/types/database'

interface CategoriaListProps {
  categorias: CategoriaWithSubcategorias[]
  isLoading: boolean
  onEdit: (categoria: CategoriaWithSubcategorias) => void
  onDelete: (categoriaId: string) => void
}

export function CategoriaList({ categorias, isLoading, onEdit, onDelete }: CategoriaListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (categorias.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay categorías configuradas
          </h3>
          <p className="text-gray-500 mb-6">
            Crea tu primera categoría personalizada para comenzar a organizar tus movimientos.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {categorias.map((categoria) => (
        <Card key={categoria.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* Información de la categoría */}
              <div className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: categoria.color }}
                >
                  {categoria.icono || categoria.nombre.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-gray-900">
                      {categoria.nombre}
                    </h3>
                    
                    {categoria.presupuesto && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        €{categoria.presupuesto}/mes
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Color: {categoria.color}</span>
                    
                    {categoria.subcategorias.length > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          {categoria.subcategorias.length} subcategoría{categoria.subcategorias.length !== 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Subcategorías */}
                  {categoria.subcategorias.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {categoria.subcategorias.map((sub) => (
                        <Badge
                          key={sub.id}
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: `${categoria.color}20`,
                            color: categoria.color,
                            borderColor: `${categoria.color}40`
                          }}
                        >
                          {sub.nombre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(categoria)}
                  className="h-8 w-8 p-0"
                  title="Editar categoría"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(categoria.id)}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                  title="Eliminar categoría"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}