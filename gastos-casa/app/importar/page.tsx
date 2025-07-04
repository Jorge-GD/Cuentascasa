'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { UploadZone } from '@/components/importar/upload-zone'
import { PreviewTable } from '@/components/importar/preview-table'
import { ImportSummary } from '@/components/importar/import-summary'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'

export default function ImportarPage() {
  const { cuentaActiva } = useCuentaStore()
  const [movimientos, setMovimientos] = useState<CategorizedMovimiento[]>([])
  const [advertencias, setAdvertencias] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importCompleted, setImportCompleted] = useState(false)
  const [lastUploadData, setLastUploadData] = useState<{type: string, data: FormData} | null>(null)

  const handleMovimientosUploaded = (result: { movimientos: CategorizedMovimiento[], advertencias?: string[], uploadData?: {type: string, data: FormData} }) => {
    setMovimientos(result.movimientos)
    setAdvertencias(result.advertencias || [])
    setImportCompleted(false)
    if (result.uploadData) {
      setLastUploadData(result.uploadData)
    }
  }

  const reloadPreview = async () => {
    if (!lastUploadData || !cuentaActiva) return
    
    try {
      setIsImporting(true)
      const response = await fetch('/api/importar/preview', {
        method: 'POST',
        body: lastUploadData.data
      })

      if (response.ok) {
        const result = await response.json()
        setMovimientos(result.data.movimientos)
        setAdvertencias(result.data.advertencias || [])
      } else {
        console.error('Error recargando preview')
      }
    } catch (error) {
      console.error('Error recargando preview:', error)
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportComplete = () => {
    setImportCompleted(true)
    setMovimientos([])
    setAdvertencias([])
    
    // Forzar actualización de datos de la cuenta después de importar
    if (cuentaActiva) {
      // Recargar datos después de un pequeño delay para asegurar que la DB se ha actualizado
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  if (!cuentaActiva) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Importar Movimientos</h1>
          <p className="text-muted-foreground mt-2">
            Selecciona una cuenta para importar movimientos
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Movimientos</h1>
        <p className="text-muted-foreground">
          Importa extractos de ING para la cuenta: <span className="font-medium">{cuentaActiva.nombre}</span>
        </p>
      </div>

      {importCompleted && (
        <ImportSummary onReset={() => setImportCompleted(false)} />
      )}

      {!importCompleted && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Subir Extracto</CardTitle>
              <CardDescription>
                Sube un archivo PDF del extracto de ING o pega el texto copiado directamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadZone
                onMovimientosUploaded={handleMovimientosUploaded}
                isLoading={isImporting}
                cuentaId={cuentaActiva.id}
              />
            </CardContent>
          </Card>

          {movimientos.length > 0 && (
            <>
              {advertencias.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="font-medium">Advertencias de validación:</div>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {advertencias.map((advertencia, index) => {
                          // Detectar tipo de mensaje para aplicar estilos
                          const esResumen = advertencia.includes('🔍') || advertencia.includes('💡')
                          const esErrorGrave = advertencia.includes('❌')
                          const esAdvertenciaMenor = advertencia.includes('⚠️')
                          const esDetalle = advertencia.startsWith('   •')
                          
                          let className = "text-sm "
                          if (esResumen) className += "font-semibold text-blue-700"
                          else if (esErrorGrave) className += "font-medium text-red-700"
                          else if (esAdvertenciaMenor) className += "font-medium text-amber-700"
                          else if (esDetalle) className += "text-gray-600 ml-4 font-mono text-xs"
                          else className += "text-gray-700"
                          
                          return (
                            <div key={index} className={className}>
                              {advertencia}
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground border-t pt-2">
                        <strong>Nota:</strong> Estas advertencias no impiden la importación. 
                        Los errores de saldos suelen indicar que el archivo contiene un período parcial 
                        o que faltan algunos movimientos intermedios.
                        {advertencias.some(adv => adv.includes('ARCHIVO INCOMPLETO')) && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                            <strong>⚠️ Archivo aparentemente incompleto:</strong> Si está seguro de que los datos son correctos 
                            y desea continuar sin validación de saldos, puede desactivar esta validación en el siguiente intento de importación.
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Preview de Movimientos</CardTitle>
                  <CardDescription>
                    Revisa y ajusta la categorización antes de importar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PreviewTable
                    movimientos={movimientos}
                    onMovimientosChange={setMovimientos}
                    onImportComplete={handleImportComplete}
                    isLoading={isImporting}
                    onLoadingChange={setIsImporting}
                    cuentaId={cuentaActiva.id}
                    onReloadPreview={reloadPreview}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}