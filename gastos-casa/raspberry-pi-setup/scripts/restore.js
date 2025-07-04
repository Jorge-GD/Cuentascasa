#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')

async function restoreBackup() {
  try {
    const backupDir = path.join(__dirname, '..', 'backups')
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')
    
    if (!fs.existsSync(backupDir)) {
      console.error('❌ No se encontró el directorio de backups')
      process.exit(1)
    }
    
    // Listar backups disponibles
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time)
    
    if (backups.length === 0) {
      console.error('❌ No se encontraron backups disponibles')
      process.exit(1)
    }
    
    console.log('📋 Backups disponibles:')
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.name} (${backup.time.toLocaleString()})`)
    })
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    // Seleccionar backup
    const answer = await new Promise(resolve => {
      rl.question('\n🔢 Selecciona el número del backup a restaurar (Enter para el más reciente): ', resolve)
    })
    
    rl.close()
    
    const selectedIndex = answer.trim() === '' ? 0 : parseInt(answer) - 1
    
    if (selectedIndex < 0 || selectedIndex >= backups.length) {
      console.error('❌ Selección inválida')
      process.exit(1)
    }
    
    const selectedBackup = backups[selectedIndex]
    
    // Crear backup de la BD actual antes de restaurar
    if (fs.existsSync(dbPath)) {
      const currentBackupName = `backup-before-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
      const currentBackupPath = path.join(backupDir, currentBackupName)
      fs.copyFileSync(dbPath, currentBackupPath)
      console.log(`💾 BD actual respaldada como: ${currentBackupName}`)
    }
    
    // Restaurar el backup seleccionado
    fs.copyFileSync(selectedBackup.path, dbPath)
    console.log(`✅ Backup restaurado exitosamente: ${selectedBackup.name}`)
    console.log('🔄 No olvides ejecutar "npx prisma generate" si es necesario')
    
  } catch (error) {
    console.error('❌ Error restaurando backup:', error.message)
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  restoreBackup()
}

module.exports = { restoreBackup }