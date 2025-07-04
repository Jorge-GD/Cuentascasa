'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tipo503020, Categoria } from '@/lib/types/database';
import { CATEGORIA_TIPO_SUGERIDO } from '@/lib/utils/plan503020';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ConfiguracionInicialProps {
  onComplete: () => void;
}

interface CategoriaConTipo extends Categoria {
  tipo503020Temporal?: Tipo503020;
}

export function ConfiguracionInicial({ onComplete }: ConfiguracionInicialProps) {
  const [paso, setPaso] = useState(1);
  const [ingreso, setIngreso] = useState('');
  const [categorias, setCategorias] = useState<CategoriaConTipo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/categorias');
      const data = await response.json();
      
      // Aplicar sugerencias automáticas
      const categoriasConSugerencias = data.map((cat: Categoria) => ({
        ...cat,
        tipo503020Temporal: CATEGORIA_TIPO_SUGERIDO[cat.nombre] || null
      }));
      
      setCategorias(categoriasConSugerencias);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const categoriaId = result.draggableId;
    const nuevoTipo = result.destination.droppableId as Tipo503020;

    setCategorias(prev => prev.map(cat => 
      cat.id === categoriaId 
        ? { ...cat, tipo503020Temporal: nuevoTipo }
        : cat
    ));
  };

  const handleGuardarConfiguracion = async () => {
    try {
      // Guardar ingreso
      if (ingreso) {
        await fetch('/api/configuracion-usuario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingresoMensual: parseFloat(ingreso) })
        });
      }

      // Guardar tipos de categorías
      for (const categoria of categorias) {
        if (categoria.tipo503020Temporal) {
          await fetch('/api/plan-503020', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoriaId: categoria.id,
              tipo503020: categoria.tipo503020Temporal
            })
          });
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error al guardar configuración:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Configuración inicial del Plan 50/30/20</h2>

      {paso === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Paso 1: Ingreso neto mensual</h3>
            <p className="text-gray-600 mb-4">
              Introduce tu ingreso neto mensual. Este será la base para calcular tus límites 50/30/20.
            </p>
            <Input
              type="number"
              placeholder="Ej: 3000"
              value={ingreso}
              onChange={(e) => setIngreso(e.target.value)}
              className="max-w-xs"
            />
          </div>
          
          <Button 
            onClick={() => setPaso(2)}
            disabled={!ingreso || parseFloat(ingreso) <= 0}
          >
            Siguiente
          </Button>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Paso 2: Clasifica tus categorías</h3>
            <p className="text-gray-600 mb-4">
              Arrastra cada categoría a su grupo correspondiente según el método 50/30/20.
            </p>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DroppableColumn
                id={Tipo503020.NECESIDADES}
                titulo="Necesidades (50%)"
                descripcion="Gastos esenciales"
                categorias={categorias.filter(c => c.tipo503020Temporal === Tipo503020.NECESIDADES)}
                color="blue"
              />
              
              <DroppableColumn
                id={Tipo503020.DESEOS}
                titulo="Deseos (30%)"
                descripcion="Gastos opcionales"
                categorias={categorias.filter(c => c.tipo503020Temporal === Tipo503020.DESEOS)}
                color="purple"
              />
              
              <DroppableColumn
                id={Tipo503020.AHORRO}
                titulo="Ahorro (20%)"
                descripcion="Ahorro e inversión"
                categorias={categorias.filter(c => c.tipo503020Temporal === Tipo503020.AHORRO)}
                color="green"
              />
            </div>

            {/* Categorías sin clasificar */}
            <div className="mt-6">
              <h4 className="font-medium mb-2">Sin clasificar</h4>
              <Droppable droppableId="sin-clasificar">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-[100px] p-4 bg-gray-50 rounded-lg border-2 border-dashed"
                  >
                    {categorias
                      .filter(c => !c.tipo503020Temporal)
                      .map((categoria, index) => (
                        <DraggableCategoria
                          key={categoria.id}
                          categoria={categoria}
                          index={index}
                        />
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setPaso(1)}>
              Anterior
            </Button>
            <Button onClick={handleGuardarConfiguracion}>
              Guardar y empezar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

interface DroppableColumnProps {
  id: string;
  titulo: string;
  descripcion: string;
  categorias: CategoriaConTipo[];
  color: 'blue' | 'purple' | 'green';
}

function DroppableColumn({ id, titulo, descripcion, categorias, color }: DroppableColumnProps) {
  const bgColor = {
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200'
  }[color];

  return (
    <div>
      <h4 className="font-medium mb-1">{titulo}</h4>
      <p className="text-sm text-gray-600 mb-2">{descripcion}</p>
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[200px] p-3 rounded-lg border-2 ${
              snapshot.isDraggingOver ? 'border-solid' : 'border-dashed'
            } ${bgColor}`}
          >
            {categorias.map((categoria, index) => (
              <DraggableCategoria
                key={categoria.id}
                categoria={categoria}
                index={index}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

interface DraggableCategoriaProps {
  categoria: CategoriaConTipo;
  index: number;
}

function DraggableCategoria({ categoria, index }: DraggableCategoriaProps) {
  return (
    <Draggable draggableId={categoria.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-2 mb-2 bg-white rounded shadow-sm cursor-move ${
            snapshot.isDragging ? 'shadow-lg' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: categoria.color }}
            />
            <span className="text-sm font-medium">{categoria.nombre}</span>
          </div>
        </div>
      )}
    </Draggable>
  );
}