'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  FileDown, 
  FileUp,
  Trash2,
  Info,
  Calendar,
  Database,
  FileText,
  Table
} from 'lucide-react'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface BackupInfo {
  valido: boolean
  errores?: string[]
  informacion?: {
    version: string
    timestamp: string
    metadata: any
    estadisticas: {
      cuentas: number
      movimientos: number
      categorias: number
      subcategorias: number
      reglas: number
      etiquetas: number
    }
  }
  tamaño?: {
    archivo: number
    contenido: number
  }
}

export default function BackupPage() {
  const { cuentas, fetchCuentas } = useCuentaStore()
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null)
  
  // Estados para exportación
  const [tipoExport, setTipoExport] = useState('completo')
  const [formatoExport, setFormatoExport] = useState('json')
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  
  // Estados para importación
  const [archivoImport, setArchivoImport] = useState<File | null>(null)
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [opcionesImport, setOpcionesImport] = useState({
    overwrite: false,
    mergeMode: 'skip' as 'skip' | 'update' | 'replace',
    validateIntegrity: true,
    preserveIds: false
  })

  useState(() => {
    fetchCuentas()
  })

  const handleExportBackup = async () => {
    setLoading(true)
    setMensaje(null)
    
    try {
      const body: any = {
        tipo: tipoExport,
        formato: formatoExport
      }

      if (tipoExport === 'cuenta' && cuentaSeleccionada) {
        body.cuentaId = cuentaSeleccionada
      }

      if (tipoExport === 'periodo') {
        if (!fechaInicio || !fechaFin) {
          setMensaje({ tipo: 'error', texto: 'Debe especificar fechas de inicio y fin para backup de período' })
          return
        }
        body.fechaInicio = fechaInicio
        body.fechaFin = fechaFin
        if (cuentaSeleccionada) {
          body.cuentaId = cuentaSeleccionada
        }
      }

      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al exportar backup')
      }

      // Obtener el nombre del archivo desde el header
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                     `backup-${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.${formatoExport === 'json' ? 'json' : formatoExport === 'excel' ? 'xlsx' : 'csv'}`

      // Descargar el archivo
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMensaje({ tipo: 'success', texto: `Backup exportado exitosamente: ${filename}` })

    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: error instanceof Error ? error.message : 'Error al exportar backup' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setArchivoImport(file)
    setBackupInfo(null)

    // Validar archivo automáticamente
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/backup/import', {
        method: 'PUT',
        body: formData
      })

      const info = await response.json()
      setBackupInfo(info)

    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error al validar archivo de backup' 
      })
    }
  }

  const handleImportBackup = async () => {
    if (!archivoImport) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un archivo' })
      return
    }

    if (backupInfo && !backupInfo.valido) {
      setMensaje({ tipo: 'error', texto: 'El archivo de backup no es válido' })
      return
    }

    setLoading(true)
    setMensaje(null)

    try {
      const formData = new FormData()
      formData.append('file', archivoImport)
      formData.append('options', JSON.stringify(opcionesImport))

      const response = await fetch('/api/backup/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setMensaje({ 
          tipo: 'success', 
          texto: `Backup importado exitosamente. ${result.resumen.cuentasImportadas} cuentas, ${result.resumen.movimientosImportados} movimientos importados.` 
        })
        // Limpiar formulario
        setArchivoImport(null)
        setBackupInfo(null)
        if (event.target) {
          (event.target as HTMLInputElement).value = ''
        }
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: `Error en la importación: ${result.errores?.join(', ') || 'Error desconocido'}` 
        })
      }

    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: error instanceof Error ? error.message : 'Error al importar backup' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearDatabase = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar TODOS los datos? Esta acción no se puede deshacer. Se creará un backup automático antes de eliminar.')) {
      return
    }

    if (!window.confirm('ÚLTIMA ADVERTENCIA: Esto eliminará permanentemente todas las cuentas, movimientos, categorías y reglas. ¿Continuar?')) {
      return
    }

    setLoading(true)
    setMensaje(null)

    try {
      const response = await fetch('/api/backup/import?confirmar=ELIMINAR_TODO', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setMensaje({ 
          tipo: 'success', 
          texto: `Base de datos limpiada. Backup automático creado: ${result.backupAutomatico.archivo}` 
        })
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: result.error || 'Error al limpiar base de datos' 
        })
      }

    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: error instanceof Error ? error.message : 'Error al limpiar base de datos' 
      })
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Backup y Exportación</h1>
        <p className="text-muted-foreground">
          Gestiona backups de tus datos y exporta información en diferentes formatos
        </p>
      </div>

      {mensaje && (
        <Alert className={`mb-6 ${
          mensaje.tipo === 'error' ? 'border-red-200 bg-red-50' : 
          mensaje.tipo === 'success' ? 'border-green-200 bg-green-50' : 
          'border-blue-200 bg-blue-50'
        }`}>
          {mensaje.tipo === 'error' ? <AlertTriangle className="h-4 w-4" /> : 
           mensaje.tipo === 'success' ? <CheckCircle className="h-4 w-4" /> : 
           <Info className="h-4 w-4" />}
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Gestionar
          </TabsTrigger>
        </TabsList>

        {/* TAB EXPORTAR */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Exportar Backup
              </CardTitle>
              <CardDescription>
                Crea copias de seguridad de tus datos en diferentes formatos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipo de backup */}
              <div className="space-y-2">
                <Label>Tipo de Backup</Label>
                <Select value={tipoExport} onValueChange={setTipoExport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completo">Backup Completo</SelectItem>
                    <SelectItem value="cuenta">Backup de Cuenta Específica</SelectItem>
                    <SelectItem value="periodo">Backup por Período</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cuenta específica */}
              {tipoExport === 'cuenta' && (
                <div className="space-y-2">
                  <Label>Cuenta</Label>
                  <Select value={cuentaSeleccionada} onValueChange={setCuentaSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentas.map(cuenta => (
                        <SelectItem key={cuenta.id} value={cuenta.id}>
                          {cuenta.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Período */}
              {tipoExport === 'periodo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cuenta (Opcional)</Label>
                    <Select value={cuentaSeleccionada} onValueChange={setCuentaSeleccionada}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las cuentas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas las cuentas</SelectItem>
                        {cuentas.map(cuenta => (
                          <SelectItem key={cuenta.id} value={cuenta.id}>
                            {cuenta.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Formato */}
              <div className="space-y-2">
                <Label>Formato de Exportación</Label>
                <Select value={formatoExport} onValueChange={setFormatoExport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        JSON (Backup completo)
                      </div>
                    </SelectItem>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        Excel (Análisis)
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV (Datos tabulares)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleExportBackup} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Exportando...' : 'Exportar Backup'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB IMPORTAR */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                Importar Backup
              </CardTitle>
              <CardDescription>
                Restaura datos desde un archivo de backup JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selección de archivo */}
              <div className="space-y-2">
                <Label>Archivo de Backup</Label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Solo archivos JSON generados por la aplicación
                </p>
              </div>

              {/* Información del backup */}
              {backupInfo && (
                <Card className={`${backupInfo.valido ? 'border-green-200' : 'border-red-200'}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-sm flex items-center gap-2 ${
                      backupInfo.valido ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {backupInfo.valido ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {backupInfo.valido ? 'Backup Válido' : 'Backup Inválido'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {backupInfo.informacion && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Versión:</span> {backupInfo.informacion.version}
                        </div>
                        <div>
                          <span className="font-medium">Fecha:</span> {
                            format(new Date(backupInfo.informacion.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })
                          }
                        </div>
                        <div>
                          <span className="font-medium">Tamaño:</span> {
                            backupInfo.tamaño ? formatBytes(backupInfo.tamaño.archivo) : 'N/A'
                          }
                        </div>
                      </div>
                    )}

                    {backupInfo.informacion?.estadisticas && (
                      <div>
                        <h4 className="font-medium mb-2">Contenido:</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(backupInfo.informacion.estadisticas).map(([tipo, cantidad]) => (
                            <Badge key={tipo} variant="secondary" className="text-xs">
                              {tipo}: {cantidad}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {backupInfo.errores && backupInfo.errores.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-700 mb-2">Errores:</h4>
                        <ul className="text-sm text-red-600 space-y-1">
                          {backupInfo.errores.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Opciones de importación */}
              {backupInfo?.valido && (
                <div className="space-y-4">
                  <h3 className="font-medium">Opciones de Importación</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="validateIntegrity"
                        checked={opcionesImport.validateIntegrity}
                        onCheckedChange={(checked) => 
                          setOpcionesImport(prev => ({ ...prev, validateIntegrity: checked as boolean }))
                        }
                      />
                      <Label htmlFor="validateIntegrity" className="text-sm">
                        Validar integridad antes de importar
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Manejo de duplicados:</Label>
                      <Select 
                        value={opcionesImport.mergeMode} 
                        onValueChange={(value: 'skip' | 'update' | 'replace') => 
                          setOpcionesImport(prev => ({ ...prev, mergeMode: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Omitir duplicados</SelectItem>
                          <SelectItem value="update">Actualizar existentes</SelectItem>
                          <SelectItem value="replace">Reemplazar existentes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleImportBackup} 
                disabled={loading || !backupInfo?.valido}
                className="w-full"
              >
                {loading ? 'Importando...' : 'Importar Backup'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB GESTIONAR */}
        <TabsContent value="manage">
          <div className="space-y-6">
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-5 w-5" />
                  Zona Peligrosa
                </CardTitle>
                <CardDescription>
                  Operaciones que pueden afectar permanentemente tus datos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h3 className="font-medium text-red-700 mb-2">Limpiar Base de Datos</h3>
                    <p className="text-sm text-red-600 mb-3">
                      Elimina TODOS los datos de la aplicación. Se creará un backup automático antes de la eliminación.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleClearDatabase}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {loading ? 'Eliminando...' : 'Limpiar Todo'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Cuentas registradas:</span> {cuentas.length}
                  </div>
                  <div>
                    <span className="font-medium">Última actualización:</span> {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}