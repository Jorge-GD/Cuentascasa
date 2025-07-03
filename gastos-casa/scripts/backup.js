#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function createBackup() {
  try {
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')
    const backupDir = path.join(__dirname, '..', 'backups')
    
    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    // Generar nombre del backup con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup-${timestamp}.db`
    const backupPath = path.join(backupDir, backupName)
    
    // Copiar la base de datos
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath)
      console.log(`✅ Backup creado exitosamente: ${backupName}`)
      console.log(`📁 Ubicación: ${backupPath}`)
      
      // Limpiar backups antiguos (mantener solo los últimos 10)
      cleanOldBackups(backupDir)
    } else {
      console.error('❌ No se encontró la base de datos')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error creando backup:', error.message)
    process.exit(1)
  }
}

function cleanOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time)
    
    // Mantener solo los 10 más recientes
    const filesToDelete = files.slice(10)
    
    filesToDelete.forEach(file => {
      fs.unlinkSync(file.path)
      console.log(`🗑️  Backup antiguo eliminado: ${file.name}`)
    })
    
    if (filesToDelete.length > 0) {
      console.log(`📝 Mantenidos ${Math.min(files.length, 10)} backups recientes`)
    }
  } catch (error) {
    console.warn('⚠️  Error limpiando backups antiguos:', error.message)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createBackup()
}

module.exports = { createBackup }