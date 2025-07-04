#!/bin/bash
# ============= manual-deploy.sh =============
# Script para deploy manual (sin GitHub Actions)

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

echo "🚀 DEPLOY MANUAL DE GASTOS CASA"
echo "==============================="

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    error "No se encuentra docker-compose.yml. Ejecuta desde el directorio raíz del proyecto."
fi

# 2. Mostrar información actual
log "📊 Estado actual del sistema:"
docker-compose --env-file .env.production ps

# 3. Crear backup automático
log "📦 Creando backup de seguridad..."
./scripts/backup-schedule.sh

# 4. Verificar si hay cambios en Git
if git diff --quiet && git diff --staged --quiet; then
    info "ℹ️  No hay cambios locales en Git"
else
    warn "⚠️  Hay cambios locales sin commitear:"
    git status --porcelain
    
    read -p "¿Deseas continuar sin commitear? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deploy cancelado. Commitea los cambios primero."
    fi
fi

# 5. Actualizar desde repositorio remoto (si existe)
if git remote >/dev/null 2>&1; then
    log "📥 Actualizando código desde repositorio remoto..."
    git fetch origin
    
    CURRENT_BRANCH=$(git branch --show-current)
    BEHIND_COUNT=$(git rev-list --count HEAD..origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
    
    if [ "$BEHIND_COUNT" -gt 0 ]; then
        warn "⚠️  El repositorio local está $BEHIND_COUNT commits detrás del remoto"
        read -p "¿Deseas actualizar desde el remoto? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git pull origin $CURRENT_BRANCH
        fi
    else
        info "ℹ️  El repositorio local está actualizado"
    fi
else
    warn "⚠️  No hay repositorio remoto configurado"
fi

# 6. Verificar tests (si existen)
if [ -f "package.json" ] && npm ls jest >/dev/null 2>&1; then
    log "🧪 Ejecutando tests..."
    npm test || error "Tests fallaron. Deploy cancelado."
else
    warn "⚠️  No se encontraron tests configurados"
fi

# 7. Build de la aplicación
log "🏗️  Construyendo nueva imagen Docker..."
docker-compose --env-file .env.production build --no-cache app

# 8. Verificar que la imagen se construyó correctamente
if ! docker images | grep gastos-casa-app >/dev/null; then
    error "❌ Error construyendo la imagen Docker"
fi

# 9. Deploy con zero-downtime
log "🔄 Desplegando nueva versión..."

# Crear contenedor temporal con nueva imagen
docker-compose --env-file .env.production up -d --no-deps --scale app=2 app

# Esperar a que el nuevo contenedor esté listo
log "⏳ Esperando a que el nuevo contenedor esté listo..."
sleep 15

# Verificar que el nuevo contenedor funciona
LOCAL_IP=$(grep HOST_IP .env.production | cut -d= -f2)
NEW_CONTAINER=$(docker-compose --env-file .env.production ps -q app | head -1)

if ! docker exec $NEW_CONTAINER curl -f "http://localhost:3000/api/health" >/dev/null 2>&1; then
    error "❌ El nuevo contenedor no responde correctamente"
fi

# Escalar de vuelta a 1 contenedor (elimina el viejo)
docker-compose --env-file .env.production up -d --scale app=1 app

# 10. Verificar deploy final
log "🔍 Verificando deploy..."
sleep 5

if curl -f "http://$LOCAL_IP:3000/api/health" >/dev/null 2>&1; then
    log "✅ Deploy exitoso! La aplicación está funcionando correctamente"
else
    error "❌ Deploy falló. La aplicación no responde"
fi

# 11. Limpiar imágenes antiguas
log "🧹 Limpiando imágenes Docker antiguas..."
docker image prune -f

# 12. Mostrar información final
echo ""
echo "📊 ESTADO FINAL:"
echo "================"
docker-compose --env-file .env.production ps

echo ""
echo "🌐 ACCESO:"
echo "=========="
echo "• Aplicación: http://$LOCAL_IP:3000"
echo "• Health check: http://$LOCAL_IP:3000/api/health"
echo "• Admin panel: http://$LOCAL_IP:8080 (si está habilitado)"

echo ""
echo "📋 INFORMACIÓN DEL DEPLOY:"
echo "=========================="
echo "• Timestamp: $(date)"
echo "• Commit actual: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
echo "• Rama: $(git branch --show-current 2>/dev/null || echo 'N/A')"
echo "• Usuario: $(whoami)"
echo "• Host: $(hostname)"

# 13. Opcional: Notificar en Slack (si está configurado)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    log "📢 Enviando notificación a Slack..."
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 Deploy manual exitoso en Gastos Casa\\nCommit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')\\nTiempo: $(date)\\nURL: http://$LOCAL_IP:3000\"}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || warn "Error enviando notificación a Slack"
fi

log "🎉 Deploy manual completado exitosamente!"

# 14. Mostrar logs en tiempo real (opcional)
read -p "¿Deseas ver los logs en tiempo real? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "📋 Mostrando logs en tiempo real (Ctrl+C para salir)..."
    docker-compose --env-file .env.production logs -f app
fi