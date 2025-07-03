import { NextRequest, NextResponse } from 'next/server'
import { BackupImporter } from '@/lib/backup/importer'
import { BackupExporter } from '@/lib/backup/exporter'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const optionsString = formData.get('options') as string
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos JSON' },
        { status: 400 }
      )
    }

    // Leer contenido del archivo
    const fileContent = await file.text()
    let backupData

    try {
      backupData = JSON.parse(fileContent)
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Archivo JSON inválido' },
        { status: 400 }
      )
    }

    // Validar estructura del backup
    const validation = BackupExporter.validateBackupData(backupData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Estructura de backup inválida',
          errores: validation.errors
        },
        { status: 400 }
      )
    }

    // Parsear opciones de importación
    let importOptions = {}
    if (optionsString) {
      try {
        importOptions = JSON.parse(optionsString)
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Opciones de importación inválidas' },
          { status: 400 }
        )
      }
    }

    // Ejecutar importación
    const result = await BackupImporter.importComplete(backupData, importOptions)

    if (result.success) {
      return NextResponse.json({
        success: true,
        mensaje: 'Backup importado exitosamente',
        resumen: result.summary,
        advertencias: result.warnings,
        omitidos: result.skipped
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Error durante la importación',
        errores: result.errors,
        resumenParcial: result.summary
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error en backup/import:', error)
    return NextResponse.json(
      { 
        error: 'Error al importar backup',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// Endpoint para validar backup sin importar
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos JSON' },
        { status: 400 }
      )
    }

    // Leer y parsear contenido
    const fileContent = await file.text()
    let backupData

    try {
      backupData = JSON.parse(fileContent)
    } catch (parseError) {
      return NextResponse.json(
        { 
          valido: false,
          error: 'Archivo JSON inválido',
          detalles: parseError instanceof Error ? parseError.message : 'Error de parsing'
        },
        { status: 200 }
      )
    }

    // Validar estructura
    const validation = BackupExporter.validateBackupData(backupData)

    // Información adicional del backup
    const info = {
      version: backupData.version || 'No especificada',
      timestamp: backupData.timestamp || 'No especificado',
      metadata: backupData.metadata || {},
      estadisticas: {
        cuentas: backupData.cuentas?.length || 0,
        movimientos: backupData.movimientos?.length || 0,
        categorias: backupData.categorias?.length || 0,
        subcategorias: backupData.subcategorias?.length || 0,
        reglas: backupData.reglas?.length || 0,
        etiquetas: backupData.etiquetas?.length || 0
      }
    }

    return NextResponse.json({
      valido: validation.isValid,
      errores: validation.errors,
      informacion: info,
      tamaño: {
        archivo: file.size,
        contenido: fileContent.length
      }
    })

  } catch (error) {
    console.error('Error en validación de backup:', error)
    return NextResponse.json(
      { 
        valido: false,
        error: 'Error al validar backup',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// Endpoint para limpiar base de datos (PELIGROSO)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const confirmacion = searchParams.get('confirmar')
    
    if (confirmacion !== 'ELIMINAR_TODO') {
      return NextResponse.json(
        { 
          error: 'Confirmación requerida',
          mensaje: 'Para limpiar la base de datos, incluya el parámetro: ?confirmar=ELIMINAR_TODO'
        },
        { status: 400 }
      )
    }

    // Crear backup automático antes de eliminar
    const backupAntesDeEliminar = await BackupExporter.exportComplete()
    const backupFilename = BackupExporter.generateBackupFilename('pre-limpieza')

    // Limpiar base de datos
    await BackupImporter.clearDatabase()

    return NextResponse.json({
      success: true,
      mensaje: 'Base de datos limpiada exitosamente',
      backupAutomatico: {
        archivo: backupFilename,
        registros: backupAntesDeEliminar.metadata.totalRecords,
        timestamp: backupAntesDeEliminar.timestamp
      },
      advertencia: 'Todos los datos han sido eliminados. Use el backup automático para restaurar si es necesario.'
    })

  } catch (error) {
    console.error('Error al limpiar base de datos:', error)
    return NextResponse.json(
      { 
        error: 'Error al limpiar base de datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/backup/import': {
        description: 'Importa un backup desde archivo JSON',
        parametros: {
          file: 'Archivo JSON (multipart/form-data)',
          options: 'Opciones de importación (JSON string opcional)'
        },
        opciones: {
          overwrite: 'boolean - Sobrescribir datos existentes',
          mergeMode: 'skip | update | replace - Manejo de duplicados',
          validateIntegrity: 'boolean - Validar integridad antes de importar',
          preserveIds: 'boolean - Preservar IDs originales'
        },
        ejemplo: 'FormData con archivo JSON y opciones'
      },
      'PUT /api/backup/import': {
        description: 'Valida un backup sin importarlo',
        parametros: {
          file: 'Archivo JSON (multipart/form-data)'
        },
        respuesta: 'Información de validación y estadísticas del backup'
      },
      'DELETE /api/backup/import?confirmar=ELIMINAR_TODO': {
        description: 'Limpia completamente la base de datos (PELIGROSO)',
        advertencia: 'Crea backup automático antes de eliminar',
        confirmacion: 'Parámetro "confirmar=ELIMINAR_TODO" requerido'
      }
    },
    ejemplos: {
      importacion: {
        descripcion: 'Importar backup con opciones',
        opciones: {
          overwrite: false,
          mergeMode: 'skip',
          validateIntegrity: true,
          preserveIds: false
        }
      }
    }
  })
}