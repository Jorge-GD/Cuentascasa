'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  X, 
  TrendingUp, 
  TrendingDown,
  ArrowUpDown,
  Eye,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/analytics/calculations';

interface Movimiento {
  id: string;
  fecha: Date;
  descripcion: string;
  importe: number;
  saldo?: number;
  categoria?: string;
  subcategoria?: string;
  categoriaING?: string;
  subcategoriaING?: string;
  esManual: boolean;
  etiquetas?: Array<{ nombre: string }>;
}

interface FiltrosAvanzados {
  busqueda: string;
  tipoMovimiento: 'todos' | 'gastos' | 'ingresos';
  categorias: string[];
  subcategorias: string[];
  rangoImporte: {
    min: number | null;
    max: number | null;
  };
  fechaInicio: Date | null;
  fechaFin: Date | null;
  soloManuales: boolean;
  conEtiquetas: boolean;
}

interface TransaccionesAvanzadasProps {
  cuentaId: string;
}

export function TransaccionesAvanzadas({ cuentaId }: TransaccionesAvanzadasProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [ordenPor, setOrdenPor] = useState<'fecha' | 'importe' | 'descripcion'>('fecha');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc');
  
  const [filtros, setFiltros] = useState<FiltrosAvanzados>({
    busqueda: '',
    tipoMovimiento: 'todos',
    categorias: [],
    subcategorias: [],
    rangoImporte: { min: null, max: null },
    fechaInicio: null,
    fechaFin: null,
    soloManuales: false,
    conEtiquetas: false
  });

  useEffect(() => {
    fetchMovimientos();
    fetchCategorias();
  }, [cuentaId]);

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/movimientos?cuentaId=${cuentaId}&limit=1000`);
      const data = await response.json();
      if (data.success) {
        setMovimientos(data.data.map((m: any) => ({
          ...m,
          fecha: new Date(m.fecha)
        })));
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/categorias');
      const data = await response.json();
      if (data.success || Array.isArray(data)) {
        const categoriasData = data.success ? data.data : data;
        const categoriasUnicas = [...new Set(categoriasData.map((c: any) => c.nombre))];
        const subcategoriasUnicas = [...new Set(
          categoriasData.flatMap((c: any) => 
            (c.subcategorias || []).map((s: any) => s.nombre)
          )
        )];
        setCategorias(categoriasUnicas);
        setSubcategorias(subcategoriasUnicas);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  // Filtrar y ordenar movimientos
  const movimientosFiltrados = useMemo(() => {
    let resultado = [...movimientos];

    // Filtro por búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(m => 
        m.descripcion.toLowerCase().includes(busqueda) ||
        m.categoria?.toLowerCase().includes(busqueda) ||
        m.subcategoria?.toLowerCase().includes(busqueda) ||
        m.categoriaING?.toLowerCase().includes(busqueda) ||
        m.subcategoriaING?.toLowerCase().includes(busqueda)
      );
    }

    // Filtro por tipo de movimiento
    if (filtros.tipoMovimiento !== 'todos') {
      resultado = resultado.filter(m => 
        filtros.tipoMovimiento === 'gastos' ? m.importe < 0 : m.importe > 0
      );
    }

    // Filtro por categorías
    if (filtros.categorias.length > 0) {
      resultado = resultado.filter(m => 
        m.categoria && filtros.categorias.includes(m.categoria)
      );
    }

    // Filtro por subcategorías
    if (filtros.subcategorias.length > 0) {
      resultado = resultado.filter(m => 
        m.subcategoria && filtros.subcategorias.includes(m.subcategoria)
      );
    }

    // Filtro por rango de importe
    if (filtros.rangoImporte.min !== null) {
      resultado = resultado.filter(m => Math.abs(m.importe) >= filtros.rangoImporte.min!);
    }
    if (filtros.rangoImporte.max !== null) {
      resultado = resultado.filter(m => Math.abs(m.importe) <= filtros.rangoImporte.max!);
    }

    // Filtro por fechas
    if (filtros.fechaInicio) {
      resultado = resultado.filter(m => m.fecha >= filtros.fechaInicio!);
    }
    if (filtros.fechaFin) {
      resultado = resultado.filter(m => m.fecha <= filtros.fechaFin!);
    }

    // Filtro por movimientos manuales
    if (filtros.soloManuales) {
      resultado = resultado.filter(m => m.esManual);
    }

    // Filtro por etiquetas
    if (filtros.conEtiquetas) {
      resultado = resultado.filter(m => m.etiquetas && m.etiquetas.length > 0);
    }

    // Ordenar
    resultado.sort((a, b) => {
      let comparison = 0;
      
      switch (ordenPor) {
        case 'fecha':
          comparison = a.fecha.getTime() - b.fecha.getTime();
          break;
        case 'importe':
          comparison = Math.abs(a.importe) - Math.abs(b.importe);
          break;
        case 'descripcion':
          comparison = a.descripcion.localeCompare(b.descripcion);
          break;
      }
      
      return ordenDireccion === 'desc' ? -comparison : comparison;
    });

    return resultado;
  }, [movimientos, filtros, ordenPor, ordenDireccion]);

  const estadisticas = useMemo(() => {
    const gastos = movimientosFiltrados.filter(m => m.importe < 0);
    const ingresos = movimientosFiltrados.filter(m => m.importe > 0);
    
    return {
      total: movimientosFiltrados.length,
      gastos: gastos.reduce((sum, m) => sum + Math.abs(m.importe), 0),
      ingresos: ingresos.reduce((sum, m) => sum + m.importe, 0),
      promedio: movimientosFiltrados.length > 0 
        ? movimientosFiltrados.reduce((sum, m) => sum + Math.abs(m.importe), 0) / movimientosFiltrados.length 
        : 0
    };
  }, [movimientosFiltrados]);

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      tipoMovimiento: 'todos',
      categorias: [],
      subcategorias: [],
      rangoImporte: { min: null, max: null },
      fechaInicio: null,
      fechaFin: null,
      soloManuales: false,
      conEtiquetas: false
    });
  };

  const exportarDatos = () => {
    const csv = [
      ['Fecha', 'Descripción', 'Importe', 'Saldo', 'Categoría', 'Subcategoría', 'Tipo'].join(','),
      ...movimientosFiltrados.map(m => [
        format(m.fecha, 'dd/MM/yyyy'),
        `"${m.descripcion}"`,
        m.importe,
        m.saldo || '',
        m.categoria || '',
        m.subcategoria || '',
        m.esManual ? 'Manual' : 'Importado'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacciones_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleOrden = (campo: typeof ordenPor) => {
    if (ordenPor === campo) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenPor(campo);
      setOrdenDireccion('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y controles */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por descripción, categoría..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {(filtros.categorias.length > 0 || filtros.subcategorias.length > 0 || 
                filtros.rangoImporte.min || filtros.rangoImporte.max || 
                filtros.fechaInicio || filtros.fechaFin || filtros.soloManuales || 
                filtros.conEtiquetas) && (
                <Badge variant="secondary" className="ml-1">
                  Activos
                </Badge>
              )}
            </Button>
            
            <Button variant="outline" onClick={exportarDatos} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Panel de filtros expandible */}
        {mostrarFiltros && (
          <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Movimiento</label>
              <Select 
                value={filtros.tipoMovimiento} 
                onValueChange={(value: any) => setFiltros({ ...filtros, tipoMovimiento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="gastos">Solo Gastos</SelectItem>
                  <SelectItem value="ingresos">Solo Ingresos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Importe Mínimo</label>
              <Input
                type="number"
                placeholder="€ mínimo"
                value={filtros.rangoImporte.min || ''}
                onChange={(e) => setFiltros({
                  ...filtros,
                  rangoImporte: { ...filtros.rangoImporte, min: e.target.value ? parseFloat(e.target.value) : null }
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Importe Máximo</label>
              <Input
                type="number"
                placeholder="€ máximo"
                value={filtros.rangoImporte.max || ''}
                onChange={(e) => setFiltros({
                  ...filtros,
                  rangoImporte: { ...filtros.rangoImporte, max: e.target.value ? parseFloat(e.target.value) : null }
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
              <Input
                type="date"
                value={filtros.fechaInicio ? format(filtros.fechaInicio, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFiltros({
                  ...filtros,
                  fechaInicio: e.target.value ? new Date(e.target.value) : null
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
              <Input
                type="date"
                value={filtros.fechaFin ? format(filtros.fechaFin, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFiltros({
                  ...filtros,
                  fechaFin: e.target.value ? new Date(e.target.value) : null
                })}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soloManuales"
                  checked={filtros.soloManuales}
                  onCheckedChange={(checked) => setFiltros({ ...filtros, soloManuales: !!checked })}
                />
                <label htmlFor="soloManuales" className="text-sm">Solo movimientos manuales</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conEtiquetas"
                  checked={filtros.conEtiquetas}
                  onCheckedChange={(checked) => setFiltros({ ...filtros, conEtiquetas: !!checked })}
                />
                <label htmlFor="conEtiquetas" className="text-sm">Con etiquetas</label>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <Button variant="outline" onClick={limpiarFiltros}>
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Transacciones</div>
          <div className="text-2xl font-bold">{estadisticas.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Gastos</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(estadisticas.gastos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Ingresos</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(estadisticas.ingresos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Promedio</div>
          <div className="text-2xl font-bold">{formatCurrency(estadisticas.promedio)}</div>
        </Card>
      </div>

      {/* Tabla de transacciones */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Transacciones ({movimientosFiltrados.length})
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleOrden('fecha')}
              className="gap-1"
            >
              Fecha
              <ArrowUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleOrden('importe')}
              className="gap-1"
            >
              Importe
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Descripción</th>
                <th className="text-right p-2">Importe</th>
                <th className="text-left p-2">Categoría</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-center p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                  </tr>
                ))
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    No se encontraron transacciones con los filtros aplicados
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.slice(0, 100).map((movimiento) => (
                  <tr key={movimiento.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">
                      {format(movimiento.fecha, 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="p-2">
                      <div className="max-w-xs truncate" title={movimiento.descripcion}>
                        {movimiento.descripcion}
                      </div>
                      {movimiento.etiquetas && movimiento.etiquetas.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {movimiento.etiquetas.slice(0, 2).map((etiqueta, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {etiqueta.nombre}
                            </Badge>
                          ))}
                          {movimiento.etiquetas.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{movimiento.etiquetas.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`p-2 text-right font-medium ${
                      movimiento.importe > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        {movimiento.importe > 0 ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {formatCurrency(movimiento.importe)}
                      </div>
                    </td>
                    <td className="p-2 text-sm">
                      <div>{movimiento.categoria || 'Sin categoría'}</div>
                      {movimiento.subcategoria && (
                        <div className="text-xs text-gray-500">{movimiento.subcategoria}</div>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant={movimiento.esManual ? 'default' : 'secondary'}>
                        {movimiento.esManual ? 'Manual' : 'Importado'}
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {movimientosFiltrados.length > 100 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Mostrando los primeros 100 resultados de {movimientosFiltrados.length}
          </div>
        )}
      </Card>
    </div>
  );
}