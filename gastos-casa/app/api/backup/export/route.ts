import { NextRequest, NextResponse } from 'next/server'
import { BackupExporter } from '@/lib/backup/exporter'
import { ExcelExporter } from '@/lib/export/excel'
import { CsvExporter } from '@/lib/export/csv'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      tipo = 'completo', 
      formato = 'json',
      opciones = {},
      cuentaId,
      fechaInicio,
      fechaFin
    } = body

    let backupData

    // Generar backup según el tipo solicitado
    switch (tipo) {
      case 'completo':
        backupData = await BackupExporter.exportComplete()
        break
      
      case 'cuenta':
        if (!cuentaId) {
          return NextResponse.json(
            { error: 'cuentaId es requerido para backup de cuenta' },
            { status: 400 }
          )
        }
        backupData = await BackupExporter.exportCuenta(cuentaId)
        break
      
      case 'periodo':
        if (!fechaInicio || !fechaFin) {
          return NextResponse.json(
            { error: 'fechaInicio y fechaFin son requeridos para backup de período' },
            { status: 400 }
          )
        }
        backupData = await BackupExporter.exportPeriodo(
          new Date(fechaInicio),
          new Date(fechaFin),
          cuentaId ? [cuentaId] : undefined
        )
        break
      
      case 'personalizado':
        backupData = await BackupExporter.exportWithOptions({
          ...opciones,
          fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
          fechaFin: fechaFin ? new Date(fechaFin) : undefined,
          cuentaIds: cuentaId ? [cuentaId] : opciones.cuentaIds
        })
        break
      
      default:
        return NextResponse.json(
          { error: 'Tipo de backup no válido' },
          { status: 400 }
        )
    }

    // Generar el archivo según el formato solicitado
    switch (formato) {
      case 'json': {
        const filename = BackupExporter.generateBackupFilename(tipo)
        const jsonData = JSON.stringify(backupData, null, 2)
        
        return new NextResponse(jsonData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': Buffer.byteLength(jsonData).toString()
          }
        })
      }
      
      case 'excel': {
        const filename = ExcelExporter.generateExcelFilename(tipo)
        const excelBuffer = await ExcelExporter.exportToExcel(backupData, opciones.excel || {})
        
        return new NextResponse(excelBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': excelBuffer.length.toString()
          }
        })
      }
      
      case 'csv': {
        const csvFiles = await CsvExporter.exportToCSV(backupData, opciones.csv || {})
        
        // Si solo hay un archivo CSV, devolverlo directamente
        if (csvFiles.length === 1) {
          const file = csvFiles[0]
          const response = new NextResponse(file.content, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="${file.filename}"`,
              'Content-Length': file.content.length.toString()
            }
          })
          
          // Limpiar archivos temporales
          await CsvExporter.cleanupTempFiles(csvFiles)
          return response
        }
        
        // Si hay múltiples archivos, devolver información para crear un ZIP en el cliente
        const filesInfo = csvFiles.map(file => ({
          filename: file.filename,
          size: file.content.length
        }))
        
        // Limpiar archivos temporales
        await CsvExporter.cleanupTempFiles(csvFiles)
        
        return NextResponse.json({
          tipo: 'multiple_csv',
          archivos: filesInfo,
          mensaje: 'Múltiples archivos CSV generados. Use el endpoint /api/backup/export/csv para descargar individualmente.'
        })
      }
      
      default:
        return NextResponse.json(
          { error: 'Formato no válido. Use: json, excel, o csv' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error en backup/export:', error)
    return NextResponse.json(
      { 
        error: 'Error al exportar backup',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/backup/export': {
        description: 'Exporta backup en diferentes formatos',
        parametros: {
          tipo: 'completo | cuenta | periodo | personalizado',
          formato: 'json | excel | csv',
          cuentaId: 'ID de cuenta (requerido para tipo "cuenta")',
          fechaInicio: 'Fecha inicio (requerido para tipo "periodo")',
          fechaFin: 'Fecha fin (requerido para tipo "periodo")',
          opciones: {
            excel: {
              includeCharts: 'boolean',
              formatDates: 'boolean',
              sheetNames: 'object'
            },
            csv: {
              separator: 'string',
              encoding: 'string',
              formatDates: 'boolean'
            }
          }
        },
        ejemplos: [
          {
            descripcion: 'Backup completo en JSON',
            body: { tipo: 'completo', formato: 'json' }
          },
          {
            descripcion: 'Backup de cuenta en Excel',
            body: { tipo: 'cuenta', formato: 'excel', cuentaId: 'cuenta-id' }
          },
          {
            descripcion: 'Backup de período en CSV',
            body: { 
              tipo: 'periodo', 
              formato: 'csv',
              fechaInicio: '2023-01-01',
              fechaFin: '2023-12-31'
            }
          }
        ]
      }
    }
  })
}