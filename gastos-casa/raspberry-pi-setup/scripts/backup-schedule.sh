#!/bin/bash
# ============= backup-schedule.sh =============

# Configuración
BACKUP_BASE_DIR="/home/$(whoami)/gastos-casa-backups"
BACKUP_DIR="$BACKUP_BASE_DIR/$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS=30

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

echo "📦 Iniciando backup automático..."
echo "📁 Directorio: $BACKUP_DIR"

# Backup de PostgreSQL
echo "🗄️  Respaldando base de datos..."
docker-compose --env-file .env.production exec -T postgres pg_dump -U gastos_user gastos_casa > "$BACKUP_DIR/database.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup de base de datos completado"
else
    echo "❌ Error en backup de base de datos"
    exit 1
fi

# Backup de uploads (si existe)
if [ -d "uploads" ]; then
    echo "📂 Respaldando archivos subidos..."
    cp -r uploads "$BACKUP_DIR/"
    echo "✅ Backup de uploads completado"
fi

# Backup de configuración
echo "⚙️  Respaldando configuración..."
cp .env.production "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No se encontró .env.production"
cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No se encontró docker-compose.yml"

# Crear archivo de información del backup
cat > "$BACKUP_DIR/backup-info.txt" << EOF
Backup creado: $(date)
Directorio origen: $(pwd)
Versión de la app: $(docker-compose --env-file .env.production exec -T app node -p "process.env.APP_VERSION || 'unknown'")
IP del servidor: $(grep HOST_IP .env.production | cut -d= -f2)
Contenedores activos:
$(docker-compose --env-file .env.production ps --format "table {{.Name}}\t{{.Status}}")
EOF

# Comprimir backup
echo "🗜️  Comprimiendo backup..."
cd "$BACKUP_BASE_DIR"
tar -czf "backup-$(basename $BACKUP_DIR).tar.gz" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

# Limpiar backups antiguos
echo "🧹 Limpiando backups antiguos (>$RETENTION_DAYS días)..."
find "$BACKUP_BASE_DIR" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null

# Mostrar estadísticas
BACKUP_FILE="$BACKUP_BASE_DIR/backup-$(basename $BACKUP_DIR).tar.gz"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_COUNT=$(ls -1 "$BACKUP_BASE_DIR"/backup-*.tar.gz 2>/dev/null | wc -l)

echo "✅ Backup completado exitosamente!"
echo "📦 Archivo: $BACKUP_FILE"
echo "📏 Tamaño: $BACKUP_SIZE"
echo "📊 Total de backups: $BACKUP_COUNT"

# Log para sistema
logger -t gastos-casa-backup "Backup completado: $BACKUP_FILE ($BACKUP_SIZE)"