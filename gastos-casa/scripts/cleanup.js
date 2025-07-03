#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

async function cleanupDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧹 Iniciando limpieza de base de datos...')
    
    // Configuración de limpieza (mantener datos de los últimos 24 meses)
    const retentionMonths = 24
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths)
    
    console.log(`📅 Eliminando datos anteriores a: ${cutoffDate.toLocaleDateString()}`)
    
    // Eliminar movimientos antiguos (solo los no manuales)
    const deletedMovimientos = await prisma.movimiento.deleteMany({
      where: {
        fechaImportacion: {
          lt: cutoffDate
        },
        esManual: false
      }
    })
    
    console.log(`🗑️  Movimientos eliminados: ${deletedMovimientos.count}`)
    
    // Limpiar etiquetas sin uso
    const etiquetasSinUso = await prisma.etiqueta.findMany({
      where: {
        movimientos: {
          none: {}
        }
      }
    })
    
    if (etiquetasSinUso.length > 0) {
      const deletedEtiquetas = await prisma.etiqueta.deleteMany({
        where: {
          id: {
            in: etiquetasSinUso.map(e => e.id)
          }
        }
      })
      console.log(`🏷️  Etiquetas sin uso eliminadas: ${deletedEtiquetas.count}`)
    }
    
    // Limpiar reglas inactivas muy antiguas
    const reglasAntiguasInactivas = await prisma.reglaCategorizacion.deleteMany({
      where: {
        activa: false,
        // Agregar filtro de fecha si tuviéramos campo createdAt
      }
    })
    
    if (reglasAntiguasInactivas.count > 0) {
      console.log(`📋 Reglas inactivas eliminadas: ${reglasAntiguasInactivas.count}`)
    }
    
    // Estadísticas finales
    const stats = await getCleanupStats(prisma)
    console.log('\n📊 Estadísticas después de la limpieza:')
    console.log(`   • Movimientos totales: ${stats.movimientos}`)
    console.log(`   • Cuentas: ${stats.cuentas}`)
    console.log(`   • Categorías: ${stats.categorias}`)
    console.log(`   • Reglas activas: ${stats.reglasActivas}`)
    console.log(`   • Etiquetas en uso: ${stats.etiquetas}`)
    
    console.log('\n✅ Limpieza completada exitosamente')
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function getCleanupStats(prisma) {
  const [movimientos, cuentas, categorias, reglasActivas, etiquetas] = await Promise.all([
    prisma.movimiento.count(),
    prisma.cuenta.count(),
    prisma.categoria.count(),
    prisma.reglaCategorizacion.count({ where: { activa: true } }),
    prisma.etiqueta.count()
  ])
  
  return { movimientos, cuentas, categorias, reglasActivas, etiquetas }
}

// Función para obtener tamaño de BD (estimado)
async function getDatabaseSize(prisma) {
  try {
    const totalRecords = await prisma.movimiento.count()
    // Estimación: ~0.5KB por movimiento + overhead
    const estimatedSizeKB = totalRecords * 0.5 + 100
    return estimatedSizeKB
  } catch {
    return 0
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanupDatabase()
}

module.exports = { cleanupDatabase, getCleanupStats }