'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CategorizedMovimiento } from '@/lib/categorization/engine'

interface UploadZoneProps {
  onMovimientosUploaded: (movimientos: CategorizedMovimiento[]) => void
  isLoading: boolean
  cuentaId: string
}

export function UploadZone({ onMovimientosUploaded, isLoading, cuentaId }: UploadZoneProps) {
  const [textContent, setTextContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file')

  const processData = useCallback(async (data: string | File, type: 'pdf' | 'xlsx' | 'text') => {
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('cuentaId', cuentaId)
      
      if (type === 'pdf' && data instanceof File) {
        formData.append('file', data)
        formData.append('type', 'pdf')
      } else if (type === 'xlsx' && data instanceof File) {
        formData.append('file', data)
        formData.append('type', 'xlsx')
      } else if (type === 'text' && typeof data === 'string') {
        formData.append('text', data)
        formData.append('type', 'text')
      }

      const response = await fetch('/api/importar/preview', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar los datos')
      }

      onMovimientosUploaded(result.data.movimientos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }, [cuentaId, onMovimientosUploaded])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (file.type === 'application/pdf') {
        processData(file, 'pdf')
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls')
      ) {
        processData(file, 'xlsx')
      } else {
        setError('Solo se permiten archivos PDF y XLSX/XLS')
      }
    }
  }, [processData])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isLoading
  })

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      setError('Pega el contenido del extracto')
      return
    }
    processData(textContent, 'text')
  }

  return (
    <div className="space-y-4">
      <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'file' | 'text')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Subir Archivo</TabsTrigger>
          <TabsTrigger value="text">Pegar Texto</TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Suelta el archivo aquí' : 'Sube tu extracto bancario'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Arrastra y suelta un archivo PDF o XLSX de ING o haz clic para seleccionar
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="text" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Cómo copiar el texto:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Abre el PDF del extracto de ING</li>
                  <li>Selecciona todo el texto (Ctrl+A)</li>
                  <li>Copia el texto (Ctrl+C)</li>
                  <li>Pega aquí el contenido (Ctrl+V)</li>
                </ol>
              </div>
            </div>
            
            <Textarea
              placeholder="Pega aquí el contenido del extracto de ING..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              disabled={isLoading}
            />
            
            <Button 
              onClick={handleTextSubmit}
              disabled={isLoading || !textContent.trim()}
              className="w-full"
            >
              {isLoading ? 'Procesando...' : 'Procesar Texto'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}