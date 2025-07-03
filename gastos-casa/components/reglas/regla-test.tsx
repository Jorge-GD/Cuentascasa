'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TestTube, CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ReglaTestProps {
  cuentaId?: string
}

interface TestResult {
  categoria: string
  subcategoria?: string
  confianza: number
  reglaAplicada?: string
  todasLasReglas: Array<{
    id: string
    nombre: string
    patron: string
    tipoCoincidencia: string
    categoria: string
    subcategoria?: string
    prioridad: number
    matches?: boolean
    confidence?: number
  }>
}

const EJEMPLOS_DESCRIPCIONES = [
  'MERCADONA VALENCIA CENTRO',
  'BIZUM ENVIADO A JUAN PEREZ COMENTARIO: CENA',
  'REPSOL ESTACION SERVICIO A-7',
  'AMAZON EU COMPRA ONLINE',
  'TRANSFERENCIA NOMINA EMPRESA SL',
  'RETIRADA CAJERO AUTOMATICO',
  'NETFLIX INTERNATIONAL BV',
  'CARREFOUR SUPERMERCADOS'
]

export function ReglaTest({ cuentaId }: ReglaTestProps) {
  const [descripcion, setDescripcion] = useState('')
  const [importe, setImporte] = useState('-50.00')
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [error, setError] = useState('')

  const handleTest = async () => {
    if (!descripcion.trim()) {
      setError('Introduce una descripción para probar')
      return
    }

    setIsLoading(true)
    setError('')
    setTestResult(null)

    try {
      const response = await fetch('/api/reglas/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          descripcion: descripcion.trim(),
          importe: parseFloat(importe) || -10.00,
          cuentaId
        })
      })

      const result = await response.json()

      if (result.success) {
        setTestResult(result.data)
      } else {
        setError(result.error || 'Error al probar las reglas')
      }
    } catch (error) {
      console.error('Error testing rules:', error)
      setError('Error de conexión al probar las reglas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (example: string) => {
    setDescripcion(example)
    setTestResult(null)
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* Formulario de prueba */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="descripcion">Descripción del Movimiento</Label>
          <Input
            id="descripcion"
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value)
              setTestResult(null)
              setError('')
            }}
            placeholder="Ej: MERCADONA VALENCIA CENTRO"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="importe">Importe (opcional)</Label>
          <Input
            id="importe"
            type="number"
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder="-50.00"
          />
        </div>
      </div>

      <Button
        onClick={handleTest}
        disabled={isLoading || !descripcion.trim()}
        className="w-full md:w-auto flex items-center gap-2"
      >
        <TestTube className="h-4 w-4" />
        {isLoading ? 'Probando...' : 'Probar Categorización'}
      </Button>

      {/* Ejemplos rápidos */}
      <div className="space-y-3">
        <Label>Ejemplos rápidos:</Label>
        <div className="flex flex-wrap gap-2">
          {EJEMPLOS_DESCRIPCIONES.map((ejemplo, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleExampleClick(ejemplo)}
              className="text-xs"
            >
              {ejemplo}
            </Button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Resultado de la prueba */}
      {testResult && (
        <div className="space-y-4">
          {/* Resultado principal */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800">Resultado de Categorización</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-green-700">Categoría</Label>
                  <div className="mt-1">
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      {testResult.categoria}
                    </Badge>
                  </div>
                </div>

                {testResult.subcategoria && (
                  <div>
                    <Label className="text-sm text-green-700">Subcategoría</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        {testResult.subcategoria}
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-green-700">Confianza</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {testResult.confianza}%
                    </Badge>
                  </div>
                </div>
              </div>

              {testResult.reglaAplicada && (
                <div className="mt-3">
                  <Label className="text-sm text-green-700">Regla Aplicada</Label>
                  <p className="text-sm text-green-800 mt-1">{testResult.reglaAplicada}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Todas las reglas que coinciden */}
          {testResult.todasLasReglas && testResult.todasLasReglas.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">
                  Todas las Reglas Evaluadas ({testResult.todasLasReglas.length})
                </h3>

                <div className="space-y-3">
                  {testResult.todasLasReglas.map((regla, index) => (
                    <div
                      key={regla.id}
                      className={`p-3 rounded-lg border ${
                        regla.matches 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{regla.nombre}</span>
                            <Badge variant="outline" className="text-xs">
                              Prioridad {regla.prioridad}
                            </Badge>
                            {regla.matches && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                ✓ Coincide
                              </Badge>
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                              <strong>Patrón:</strong> <code className="bg-gray-100 px-1 rounded">{regla.patron}</code>
                              <span className="ml-2 text-xs">({regla.tipoCoincidencia})</span>
                            </div>
                            <div>
                              <strong>Categoría:</strong> {regla.categoria}
                              {regla.subcategoria && ` → ${regla.subcategoria}`}
                            </div>
                          </div>
                        </div>

                        {regla.matches && regla.confidence && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-700">
                              {regla.confidence}%
                            </div>
                            <div className="text-xs text-green-600">confianza</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {testResult.todasLasReglas.filter(r => r.matches).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Ninguna regla personalizada coincidió con esta descripción.</p>
                    <p className="text-sm">Se utilizó la categorización por defecto.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}