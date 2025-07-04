#!/bin/bash
# ============= migrate-to-docker.sh =============

set -e  # Salir en caso de error

echo "🚀 Iniciando migración a Docker..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función de logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 1. Verificar prerrequisitos
log "Verificando prerrequisitos..."
command -v docker >/dev/null 2>&1 || error "Docker no está instalado"
command -v docker-compose >/dev/null 2>&1 || error "Docker Compose no está instalado"

# 2. Backup de seguridad
log "Creando backup de seguridad..."
BACKUP_DIR="backup-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup de base de datos actual
if [ -f "prisma/dev.db" ]; then
    cp prisma/dev.db "$BACKUP_DIR/"
    sqlite3 prisma/dev.db .dump > "$BACKUP_DIR/database-export.sql"
    log "Backup de SQLite creado"
fi

# Backup de configuración
cp .env "$BACKUP_DIR/.env.backup" 2>/dev/null || warn "No se encontró archivo .env"
cp -r uploads "$BACKUP_DIR/" 2>/dev/null || warn "No se encontró directorio uploads"

# 3. Configurar variables de entorno
log "Configurando variables de entorno..."
if [ ! -f ".env.production" ]; then
    # Obtener IP local automáticamente
    LOCAL_IP=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+')
    
    cat > .env.production << EOF
# Auto-generado durante migración
DB_PASSWORD=gastos_secure_password_$(date +%Y%m%d)
DATABASE_URL=postgresql://gastos_user:gastos_secure_password_$(date +%Y%m%d)@postgres:5432/gastos_casa
HOST_IP=$LOCAL_IP
NEXTAUTH_URL=http://$LOCAL_IP:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF
    log "Archivo .env.production creado con IP: $LOCAL_IP"
else
    log "Usando .env.production existente"
fi

# 4. Construir y iniciar servicios
log "Construyendo imágenes Docker..."
docker-compose --env-file .env.production build --no-cache

log "Iniciando base de datos..."
docker-compose --env-file .env.production up -d postgres

# Esperar a que PostgreSQL esté listo
log "Esperando a que PostgreSQL esté disponible..."
for i in {1..30}; do
    if docker-compose --env-file .env.production exec postgres pg_isready -U gastos_user -d gastos_casa >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

# 5. Migrar datos
log "Ejecutando migraciones de base de datos..."
docker-compose --env-file .env.production run --rm app npx prisma migrate deploy
docker-compose --env-file .env.production run --rm app npx prisma db seed

# 6. Importar datos existentes (si existen)
if [ -f "$BACKUP_DIR/database-export.sql" ]; then
    log "Importando datos existentes..."
    warn "Importación de datos automática no implementada. Ver documentación para importación manual."
fi

# 7. Iniciar aplicación completa
log "Iniciando aplicación completa..."
docker-compose --env-file .env.production up -d

# 8. Verificar salud de servicios
log "Verificando servicios..."
sleep 10

# Verificar PostgreSQL
if ! docker-compose --env-file .env.production exec postgres pg_isready -U gastos_user -d gastos_casa >/dev/null 2>&1; then
    error "PostgreSQL no está funcionando correctamente"
fi

# Verificar aplicación
LOCAL_IP=$(grep HOST_IP .env.production | cut -d= -f2)
if ! curl -f "http://$LOCAL_IP:3000/api/health" >/dev/null 2>&1; then
    error "La aplicación no responde correctamente"
fi

log "✅ Migración completada exitosamente!"
log "🌐 Aplicación disponible en: http://$LOCAL_IP:3000"
log "🗄️  Adminer disponible en: http://$LOCAL_IP:8080 (ejecutar: docker-compose --profile admin up -d)"
log "📁 Backup guardado en: $BACKUP_DIR"

echo
echo "📝 PRÓXIMOS PASOS:"
echo "1. Verificar que la aplicación funciona correctamente"
echo "2. Importar datos manualmente si es necesario"
echo "3. Configurar firewall para permitir acceso en red local"
echo "4. Configurar backup automático"