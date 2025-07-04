#!/bin/bash
# Script para transferir todo a la Raspberry Pi

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "📤 TRANSFERIR SETUP A RASPBERRY PI"
echo "=================================="

# Verificar parámetros
if [ $# -eq 0 ]; then
    echo "Uso: $0 <IP_RASPBERRY_PI> [usuario]"
    echo ""
    echo "Ejemplos:"
    echo "  $0 192.168.1.100"
    echo "  $0 192.168.1.100 pi"
    exit 1
fi

RPI_HOST="$1"
RPI_USER="${2:-pi}"
RPI_TARGET="$RPI_USER@$RPI_HOST"

# Verificar conectividad
log "🔍 Verificando conectividad con $RPI_TARGET..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$RPI_TARGET" "echo 'SSH OK'" >/dev/null 2>&1; then
    error "No se puede conectar a $RPI_TARGET. Verifica IP, usuario y configuración SSH."
fi

# Transferir archivos
log "📤 Transfiriendo archivos a $RPI_TARGET..."

# Usar rsync para transferencia eficiente
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='*.log' \
    ./ "$RPI_TARGET:/home/$RPI_USER/raspberry-pi-setup/"

log "✅ Transferencia completada"

# Ejecutar instalación remota
info "🚀 ¿Quieres ejecutar la instalación automáticamente? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    log "🔧 Ejecutando instalación en la Raspberry Pi..."
    ssh "$RPI_TARGET" "cd /home/$RPI_USER/raspberry-pi-setup && chmod +x install.sh && ./install.sh"
else
    echo ""
    echo "📝 Para continuar manualmente:"
    echo "ssh $RPI_TARGET"
    echo "cd /home/$RPI_USER/raspberry-pi-setup"
    echo "./install.sh"
fi

echo ""
echo "🎉 ¡Transferencia completada!"
echo "=============================="
echo ""
echo "📍 Archivos transferidos a: $RPI_TARGET:/home/$RPI_USER/raspberry-pi-setup/"
echo ""
echo "🔧 Próximos pasos en la RPI:"
echo "1. ssh $RPI_TARGET"
echo "2. cd /home/$RPI_USER/raspberry-pi-setup"
echo "3. ./install.sh"
echo ""