'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from '@/components/importar/upload-zone'
import { PreviewTable } from '@/components/importar/preview-table'
import { ImportSummary } from '@/components/importar/import-summary'
import { useCuentaStore } from '@/lib/stores/cuentaStore'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'

export default function ImportarPage() {
  const { cuentaActiva } = useCuentaStore()
  const [movimientos, setMovimientos] = useState<CategorizedMovimiento[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importCompleted, setImportCompleted] = useState(false)

  const handleMovimientosUploaded = (newMovimientos: CategorizedMovimiento[]) => {
    setMovimientos(newMovimientos)
    setImportCompleted(false)
  }

  const handleImportComplete = () => {
    setImportCompleted(true)
    setMovimientos([])
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
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}