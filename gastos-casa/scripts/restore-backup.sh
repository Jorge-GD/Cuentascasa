#!/bin/bash
# ============= restore-backup.sh =============

# Verificar parámetros
if [ $# -eq 0 ]; then
    echo "❌ Error: Debe especificar el archivo de backup"
    echo "Uso: $0 <archivo-backup.tar.gz>"
    echo "Ejemplo: $0 /home/usuario/gastos-casa-backups/backup-20241201-140000.tar.gz"
    echo ""
    echo "Backups disponibles:"
    find "/home/$(whoami)/gastos-casa-backups" -name "backup-*.tar.gz" -exec basename {} \; 2>/dev/null || echo "No se encontraron backups"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: El archivo $BACKUP_FILE no existe"
    exit 1
fi

echo "🔄 Iniciando restauración desde backup..."
echo "📁 Archivo: $BACKUP_FILE"

# Confirmar restauración
echo "⚠️  ADVERTENCIA: Esta operación sobrescribirá todos los datos actuales."
read -p "¿Está seguro de que desea continuar? (escriba 'SI' para confirmar): " confirmation

if [ "$confirmation" != "SI" ]; then
    echo "❌ Restauración cancelada"
    exit 1
fi

# Crear backup de seguridad actual antes de restaurar
echo "📦 Creando backup de seguridad antes de restaurar..."
./scripts/backup-schedule.sh

# Parar servicios
echo "⏹️  Deteniendo servicios..."
docker-compose --env-file .env.production down

# Extraer backup
TEMP_DIR=$(mktemp -d)
echo "📂 Extrayendo backup en $TEMP_DIR..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Encontrar directorio extraído
BACKUP_CONTENT_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "backup-*" | head -1)

if [ ! -d "$BACKUP_CONTENT_DIR" ]; then
    echo "❌ Error: No se pudo encontrar el contenido del backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restaurar configuración
echo "⚙️  Restaurando configuración..."
if [ -f "$BACKUP_CONTENT_DIR/.env.production" ]; then
    cp "$BACKUP_CONTENT_DIR/.env.production" .
    echo "✅ Configuración restaurada"
fi

# Restaurar uploads
echo "📂 Restaurando archivos subidos..."
if [ -d "$BACKUP_CONTENT_DIR/uploads" ]; then
    rm -rf uploads 2>/dev/null
    cp -r "$BACKUP_CONTENT_DIR/uploads" .
    echo "✅ Uploads restaurados"
fi

# Iniciar base de datos
echo "🗄️  Iniciando base de datos..."
docker-compose --env-file .env.production up -d postgres

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté disponible..."
for i in {1..30}; do
    if docker-compose --env-file .env.production exec postgres pg_isready -U gastos_user -d gastos_casa >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

# Restaurar base de datos
echo "🗄️  Restaurando base de datos..."
if [ -f "$BACKUP_CONTENT_DIR/database.sql" ]; then
    # Limpiar base de datos actual
    docker-compose --env-file .env.production exec postgres psql -U gastos_user -d gastos_casa -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null
    
    # Restaurar desde backup
    docker-compose --env-file .env.production exec -T postgres psql -U gastos_user gastos_casa < "$BACKUP_CONTENT_DIR/database.sql"
    
    if [ $? -eq 0 ]; then
        echo "✅ Base de datos restaurada"
    else
        echo "❌ Error restaurando base de datos"
        exit 1
    fi
else
    echo "⚠️  No se encontró archivo de base de datos en el backup"
fi

# Iniciar aplicación completa
echo "🚀 Iniciando aplicación..."
docker-compose --env-file .env.production up -d

# Verificar restauración
echo "🔍 Verificando restauración..."
sleep 10

LOCAL_IP=$(grep HOST_IP .env.production | cut -d= -f2 2>/dev/null || echo "localhost")

if curl -f "http://$LOCAL_IP:3000/api/health" >/dev/null 2>&1; then
    echo "✅ Restauración completada exitosamente!"
    echo "🌐 Aplicación disponible en: http://$LOCAL_IP:3000"
    
    # Mostrar información del backup restaurado
    if [ -f "$BACKUP_CONTENT_DIR/backup-info.txt" ]; then
        echo ""
        echo "📋 Información del backup restaurado:"
        cat "$BACKUP_CONTENT_DIR/backup-info.txt"
    fi
else
    echo "❌ Error: La aplicación no responde después de la restauración"
    echo "🔍 Revisar logs: docker-compose --env-file .env.production logs"
fi

# Limpiar archivos temporales
rm -rf "$TEMP_DIR"

echo ""
echo "📝 Tareas post-restauración:"
echo "1. Verificar que todos los datos están presentes"
echo "2. Verificar que las reglas de categorización funcionan"
echo "3. Hacer un backup para confirmar el estado actual"