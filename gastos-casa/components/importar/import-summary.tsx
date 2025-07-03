'use client'

import { CheckCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ImportSummaryProps {
  onReset: () => void
}

export function ImportSummary({ onReset }: ImportSummaryProps) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-green-800">Importación Completada</CardTitle>
        <CardDescription>
          Los movimientos se han importado correctamente a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={onReset} className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" />
          Importar Más Movimientos
        </Button>
      </CardContent>
    </Card>
  )
}